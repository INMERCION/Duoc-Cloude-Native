import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Subscription } from 'rxjs';
import { PedidosService, RespuestaPedidosInvalida } from './pedidos.service';
import { API_CONFIG } from './api.config';
import { ESTADOS_PEDIDO, Pedido, PedidoInput } from './pedido';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private readonly service = inject(PedidosService);
  private requests = new Subscription();
  private stopListening?: () => void;
  readonly usuario = signal('');
  readonly autenticado = signal(false);
  readonly verificandoSesion = signal(true);
  readonly pedidos = signal<Pedido[]>([]);
  readonly busqueda = signal('');
  readonly pedidosFiltrados = computed(() => {
    const palabras = this.normalizarBusqueda(this.busqueda()).split(' ').filter(Boolean);
    if (palabras.length === 0) return this.pedidos();
    return this.pedidos().filter(pedido => {
      const texto = this.normalizarBusqueda(
        `#${pedido.id} ${pedido.cliente} ${pedido.producto} ${pedido.estado}`,
      );
      return palabras.every(palabra => texto.includes(palabra));
    });
  });
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly editandoId = signal<number | null>(null);
  readonly eliminando = signal<Pedido | null>(null);
  readonly permisos = signal<string[]>([]);
  readonly estados = ESTADOS_PEDIDO;
  form: PedidoInput = this.formVacio();

  ngOnInit() {
    this.stopListening = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') void this.verSesion();
      if (payload.event === 'signedOut') this.limpiarSesion();
      if (payload.event === 'signInWithRedirect_failure') {
        this.verificandoSesion.set(false);
        this.error.set('No se pudo iniciar sesión. Revisa los scopes y la URL de retorno en Cognito.');
      }
    });
    void this.verSesion();
  }

  ngOnDestroy() {
    this.stopListening?.();
    this.requests.unsubscribe();
  }

  puede(accion: keyof typeof API_CONFIG.scopes) {
    return this.permisos().includes(API_CONFIG.scopes[accion]);
  }

  async login() {
    this.error.set('');
    try { await signInWithRedirect(); }
    catch { this.error.set('No se pudo abrir el inicio de sesión. Revisa la configuración de Cognito.'); }
  }

  async logout() {
    try {
      await signOut();
      this.limpiarSesion();
    } catch { this.error.set('No se pudo cerrar la sesión. Inténtalo nuevamente.'); }
  }

  async verSesion() {
    this.verificandoSesion.set(true);
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken) throw new Error('Sesión sin token');
      this.usuario.set(user.signInDetails?.loginId ?? user.username);
      this.permisos.set(String(session.tokens.accessToken.payload['scope'] ?? '').split(' '));
      this.autenticado.set(true);
      if (this.puede('read')) this.consultarPedidos();
    } catch {
      this.limpiarSesion();
    } finally {
      this.verificandoSesion.set(false);
    }
  }

  consultarPedidos() {
    if (this.ocupado() || !this.puede('read')) return;
    this.ocupado.set(true);
    this.error.set('');
    this.requests.add(this.service.obtenerPedidos().subscribe({
      next: pedidos => { this.pedidos.set(pedidos); this.ocupado.set(false); },
      error: err => this.fallo(err),
    }));
  }

  editar(pedido: Pedido) {
    if (this.ocupado() || !this.puede('read') || !this.puede('update')) return;
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.requests.add(this.service.obtenerPedido(pedido.id).subscribe({
      next: actual => {
        this.editandoId.set(actual.id);
        this.form = { cliente: actual.cliente, producto: actual.producto,
          cantidad: actual.cantidad, estado: actual.estado };
        this.eliminando.set(null);
        this.ocupado.set(false);
      },
      error: err => this.fallo(err),
    }));
  }

  guardar() {
    const id = this.editandoId();
    if (this.ocupado() || !this.puede(id === null ? 'create' : 'update')) return;
    const datos = { ...this.form, cliente: this.form.cliente.trim(), producto: this.form.producto.trim() };
    if (!datos.cliente || datos.cliente.length > 120 || !datos.producto || datos.producto.length > 160 ||
        !Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 1000000 ||
        !this.estados.includes(datos.estado)) {
      this.error.set('Completa los campos y usa una cantidad entera entre 1 y 1000000.');
      return;
    }
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    const request = id === null ? this.service.crearPedido(datos) : this.service.actualizarPedido(id, datos);
    this.requests.add(request.subscribe({
      next: pedido => {
        this.pedidos.update(lista => id === null ? [...lista, pedido] : lista.map(p => p.id === id ? pedido : p));
        this.cancelarEdicion();
        this.mensaje.set(id === null ? 'Pedido creado.' : 'Pedido actualizado.');
        this.ocupado.set(false);
      },
      error: err => this.fallo(err),
    }));
  }

  confirmarEliminar() {
    const pedido = this.eliminando();
    if (!pedido || this.ocupado() || !this.puede('delete')) return;
    this.ocupado.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.requests.add(this.service.eliminarPedido(pedido.id).subscribe({
      next: () => {
        this.pedidos.update(lista => lista.filter(p => p.id !== pedido.id));
        if (this.editandoId() === pedido.id) this.cancelarEdicion();
        this.eliminando.set(null);
        this.mensaje.set('Pedido eliminado.');
        this.ocupado.set(false);
      },
      error: err => this.fallo(err),
    }));
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.form = this.formVacio();
  }


  private normalizarBusqueda(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private formVacio(): PedidoInput {
    return { cliente: '', producto: '', cantidad: 1, estado: 'EN_PREPARACION' };
  }

  private limpiarSesion() {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.autenticado.set(false);
    this.usuario.set('');
    this.permisos.set([]);
    this.pedidos.set([]);
    this.busqueda.set('');
    this.ocupado.set(false);
    this.eliminando.set(null);
    this.cancelarEdicion();
    this.error.set('');
    this.mensaje.set('');
  }

  private fallo(err: unknown) {
    this.ocupado.set(false);
    if (err instanceof RespuestaPedidosInvalida) {
      this.error.set(err.message);
      return;
    }
    const status = err instanceof HttpErrorResponse ? err.status : -1;
    const messages: Record<number, string> = {
      0: 'No se pudo conectar con la API. Revisa EC2, API Gateway y CORS.',
      400: 'Los datos no son válidos. Revisa los campos del pedido.',
      401: 'La sesión o sus permisos no son válidos. Cierra sesión y vuelve a ingresar.',
      403: 'No tienes permiso para esta operación. Revisa los scopes habilitados.',
      404: 'El pedido ya no existe. Actualiza la lista.',
    };
    this.error.set(messages[status] ?? 'No se pudo completar la operación. Inténtalo nuevamente.');
  }
}
