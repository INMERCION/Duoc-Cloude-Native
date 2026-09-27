package cl.duoc.pedidos360_backend.repository;

import cl.duoc.pedidos360_backend.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {}
