export const API_CONFIG = {
  pedidosUrl: 'https://9wn5b7enec.execute-api.us-east-1.amazonaws.com/test/api/pedidos',
  scopes: {
    read: 'rs-api-pedidos/pedidos-read',
    create: 'rs-api-pedidos/pedidos-create',
    update: 'rs-api-pedidos/pedidos-update',
    delete: 'rs-api-pedidos/pedidos-delete',
  },
} as const;
