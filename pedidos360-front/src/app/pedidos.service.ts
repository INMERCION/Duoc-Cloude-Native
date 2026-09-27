import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_CONFIG } from './api.config';
import { ESTADOS_PEDIDO, Pedido, PedidoInput } from './pedido';

export class RespuestaPedidosInvalida extends Error {
  constructor(escritura = false) {
    super(escritura
      ? 'La API no devolvió el pedido guardado. Actualiza la lista antes de repetir la operación.'
      : 'La API devolvió una respuesta vacía o con formato incorrecto. No se pudieron cargar los pedidos.');
  }
}

function esPedido(valor: unknown): valor is Pedido {
  if (typeof valor !== 'object' || valor === null) return false;
  const pedido = valor as Record<string, unknown>;
  return typeof pedido['id'] === 'number' && Number.isInteger(pedido['id']) && pedido['id'] > 0 &&
    typeof pedido['cliente'] === 'string' && typeof pedido['producto'] === 'string' &&
    typeof pedido['cantidad'] === 'number' && Number.isInteger(pedido['cantidad']) && pedido['cantidad'] > 0 &&
    ESTADOS_PEDIDO.some(estado => estado === pedido['estado']);
}

function validarPedido(valor: unknown, escritura = false): Pedido {
  if (!esPedido(valor)) throw new RespuestaPedidosInvalida(escritura);
  return valor;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.pedidosUrl;

  obtenerPedidos() {
    return this.http.get<unknown>(this.apiUrl).pipe(map(respuesta => {
      // HttpClient's generic type does not validate JSON received over the network.
      // null must not be disguised as an empty list: it breaks the API contract.
      if (!Array.isArray(respuesta) || !respuesta.every(esPedido)) throw new RespuestaPedidosInvalida();
      return respuesta as Pedido[];
    }));
  }
  obtenerPedido(id: number) {
    return this.http.get<unknown>(`${this.apiUrl}/${id}`).pipe(map(respuesta => validarPedido(respuesta)));
  }
  crearPedido(pedido: PedidoInput) {
    return this.http.post<unknown>(this.apiUrl, pedido).pipe(map(respuesta => validarPedido(respuesta, true)));
  }
  actualizarPedido(id: number, pedido: PedidoInput) {
    return this.http.put<unknown>(`${this.apiUrl}/${id}`, pedido).pipe(map(respuesta => validarPedido(respuesta, true)));
  }
  eliminarPedido(id: number) { return this.http.delete<void>(`${this.apiUrl}/${id}`); }
}
