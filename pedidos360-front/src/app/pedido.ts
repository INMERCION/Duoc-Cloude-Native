export const ESTADOS_PEDIDO = ['EN_PREPARACION', 'ENVIADO', 'ENTREGADO'] as const;
export type EstadoPedido = typeof ESTADOS_PEDIDO[number];

export interface PedidoInput {
  cliente: string;
  producto: string;
  cantidad: number;
  estado: EstadoPedido;
}

export interface Pedido extends PedidoInput {
  id: number;
}
