package cl.duoc.pedidos360_backend.model;

import jakarta.validation.constraints.*;

public record PedidoRequest(
    @NotBlank @Size(max = 120) String cliente,
    @NotBlank @Size(max = 160) String producto,
    @NotNull @Min(1) @Max(1000000) Integer cantidad,
    @NotNull EstadoPedido estado
) {}
