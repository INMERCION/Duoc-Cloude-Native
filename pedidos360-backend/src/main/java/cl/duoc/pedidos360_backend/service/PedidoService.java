package cl.duoc.pedidos360_backend.service;

import java.util.List;
import cl.duoc.pedidos360_backend.model.*;
import cl.duoc.pedidos360_backend.repository.PedidoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class PedidoService {
    private final PedidoRepository repository;
    public PedidoService(PedidoRepository repository) { this.repository = repository; }
    public List<Pedido> listar() { return repository.findAll(Sort.by("id")); }
    public Pedido obtener(Long id) {
        return repository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
    }
    @Transactional
    public Pedido crear(PedidoRequest request) { return repository.save(new Pedido(request)); }
    @Transactional
    public Pedido actualizar(Long id, PedidoRequest request) {
        Pedido pedido = obtener(id);
        pedido.actualizar(request);
        return repository.save(pedido);
    }
    @Transactional
    public void eliminar(Long id) { repository.delete(obtener(id)); }
}
