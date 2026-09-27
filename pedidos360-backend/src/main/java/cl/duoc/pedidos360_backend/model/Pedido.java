package cl.duoc.pedidos360_backend.model;

import jakarta.persistence.*;

@Entity
public class Pedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String cliente;
    @Column(nullable = false, length = 160)
    private String producto;
    @Column(nullable = false)
    private Integer cantidad;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private EstadoPedido estado;

    protected Pedido() {}
    public Pedido(PedidoRequest request) { actualizar(request); }
    public void actualizar(PedidoRequest request) {
        cliente = request.cliente().trim();
        producto = request.producto().trim();
        cantidad = request.cantidad();
        estado = request.estado();
    }
    public Long getId() { return id; }
    public String getCliente() { return cliente; }
    public String getProducto() { return producto; }
    public Integer getCantidad() { return cantidad; }
    public EstadoPedido getEstado() { return estado; }
}
