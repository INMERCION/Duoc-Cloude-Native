import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { App } from './app';
import { API_CONFIG } from './api.config';
import { Pedido } from './pedido';
import { authInterceptor } from './auth.interceptor';
import { PedidosService } from './pedidos.service';
import { HttpClient } from '@angular/common/http';

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(), signOut: vi.fn(),
}));
vi.mock('aws-amplify/auth', () => auth);
vi.mock('aws-amplify/utils', () => ({ Hub: { listen: vi.fn(() => () => {}) } }));

describe('Pedidos360', () => {
  let http: HttpTestingController;
  const url = API_CONFIG.pedidosUrl;
  const pedido: Pedido = { id: 10, cliente: 'Ana', producto: 'Notebook', cantidad: 2, estado: 'EN_PREPARACION' };

  beforeEach(async () => {
    vi.resetAllMocks();
    auth.getCurrentUser.mockRejectedValue(new Error('Sin sesión'));
    auth.fetchAuthSession.mockResolvedValue({ tokens: {
      accessToken: { toString: () => 'test-access-token', payload: { scope: Object.values(API_CONFIG.scopes).join(' ') } },
    } });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { try { http.verify(); } finally { TestBed.resetTestingModule(); } });

  async function iniciar() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.verificandoSesion()).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  it('muestra inicio de sesión sin exponer tokens', async () => {
    const fixture = await iniciar();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Gestión de pedidos');
    expect(fixture.nativeElement.textContent).toContain('Iniciar sesión');
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
  });

  it('crea, consulta detalle, actualiza y elimina con confirmación', async () => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.autenticado.set(true);
    app.permisos.set(Object.values(API_CONFIG.scopes));
    app.form = { cliente: 'Ana', producto: 'Notebook', cantidad: 2, estado: 'EN_PREPARACION' };
    app.guardar();
    await fixture.whenStable();
    const create = http.expectOne(url);
    expect(create.request.method).toBe('POST');
    expect(create.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    expect(create.request.body.cliente).toBe('Ana');
    create.flush(pedido);
    expect(app.pedidos()).toEqual([pedido]);

    app.editar(pedido);
    await fixture.whenStable();
    const detail = http.expectOne(url + '/10');
    expect(detail.request.method).toBe('GET');
    detail.flush(pedido);
    app.form.estado = 'ENVIADO';
    app.guardar();
    await fixture.whenStable();
    const update = http.expectOne(url + '/10');
    expect(update.request.method).toBe('PUT');
    update.flush({ ...pedido, estado: 'ENVIADO' });
    expect(app.pedidos()[0].estado).toBe('ENVIADO');

    app.eliminando.set(pedido);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sí, eliminar');
    http.expectNone(url + '/10');
    app.confirmarEliminar();
    await fixture.whenStable();
    const remove = http.expectOne(url + '/10');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    expect(app.pedidos()).toEqual([]);
  });

  it('carga automáticamente los pedidos de una sesión existente', async () => {
    auth.getCurrentUser.mockResolvedValue({ username: 'ana' });
    const fixture = await iniciar();
    const list = http.expectOne(url);
    expect(list.request.method).toBe('GET');
    list.flush([pedido]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Notebook');
    expect(fixture.componentInstance.usuario()).toBe('ana');
  });

  it('bloquea escrituras sin permiso y cantidades fraccionarias', async () => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.permisos.set([API_CONFIG.scopes.read]);
    app.guardar();
    http.expectNone(url);
    app.permisos.set([API_CONFIG.scopes.create]);
    app.form = { ...pedido, cantidad: 1.5 };
    app.guardar();
    expect(app.error()).toContain('cantidad entera');
    http.expectNone(url);
  });

  it('conserva el formulario y libera la interfaz ante un error HTTP', async () => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.permisos.set([API_CONFIG.scopes.create]);
    app.form = { ...pedido };
    app.guardar();
    await fixture.whenStable();
    http.expectOne(url).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(app.ocupado()).toBe(false);
    expect(app.error()).toContain('permiso');
    expect(app.form.cliente).toBe('Ana');
  });

  it('no envía el token a servidores ajenos', () => {
    TestBed.inject(HttpClient).get('https://otro.example/data').subscribe();
    const request = http.expectOne('https://otro.example/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(auth.fetchAuthSession).not.toHaveBeenCalled();
    request.flush([]);
  });

  it('envía GET por ID al endpoint configurado', async () => {
    TestBed.inject(PedidosService).obtenerPedido(10).subscribe();
    await Promise.resolve();
    const request = http.expectOne(url + '/10');
    expect(request.request.method).toBe('GET');
    request.flush(pedido);
  });

  it.each([null, {}, [null], [{ id: 10 }]])('rechaza una lista inválida sin romper la vista: %j', async respuesta => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.autenticado.set(true);
    app.permisos.set(Object.values(API_CONFIG.scopes));
    app.pedidos.set([pedido]);
    app.consultarPedidos();
    await fixture.whenStable();
    http.expectOne(url).flush(respuesta);
    expect(app.pedidos()).toEqual([pedido]);
    expect(app.ocupado()).toBe(false);
    expect(app.error()).toContain('formato incorrecto');
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('La API');

    app.consultarPedidos();
    await fixture.whenStable();
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(app.pedidos()).toEqual([]);
    expect(app.ocupado()).toBe(false);
    expect(app.error()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('No hay pedidos para mostrar.');
  });

  it.each(['crear', 'actualizar'])('conserva formulario y lista si %s devuelve un cuerpo vacío', async accion => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.permisos.set(Object.values(API_CONFIG.scopes));
    app.pedidos.set([pedido]);
    app.form = { ...pedido };
    if (accion === 'actualizar') app.editandoId.set(pedido.id);
    app.guardar();
    await fixture.whenStable();
    http.expectOne(accion === 'crear' ? url : url + '/10').flush(null);
    expect(app.pedidos()).toEqual([pedido]);
    expect(app.form.cliente).toBe('Ana');
    expect(app.ocupado()).toBe(false);
    expect(app.mensaje()).toBe('');
    expect(app.error()).toContain('Actualiza la lista antes de repetir');
  });

  it('libera la interfaz si el detalle devuelve null', async () => {
    const fixture = await iniciar();
    const app = fixture.componentInstance;
    app.permisos.set(Object.values(API_CONFIG.scopes));
    app.editar(pedido);
    await fixture.whenStable();
    http.expectOne(url + '/10').flush(null);
    expect(app.editandoId()).toBeNull();
    expect(app.ocupado()).toBe(false);
    expect(app.error()).toContain('formato incorrecto');
  });
});
