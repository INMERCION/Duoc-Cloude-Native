package cl.duoc.pedidos360_backend.controller;

import java.net.URI;
import java.util.List;
import cl.duoc.pedidos360_backend.model.Pedido;
import cl.duoc.pedidos360_backend.model.PedidoRequest;
import cl.duoc.pedidos360_backend.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
public class Pedidos360Controller {
    private final PedidoService service;
    public Pedidos360Controller(PedidoService service) { this.service = service; }

    @GetMapping
    public List<Pedido> listar() { return service.listar(); }

    @GetMapping("/{id}")
    public Pedido obtener(@PathVariable Long id) { return service.obtener(id); }

    @PostMapping
    public ResponseEntity<Pedido> crear(@Valid @RequestBody PedidoRequest request) {
        Pedido pedido = service.crear(request);
        // Resolves correctly both directly and behind the /test gateway stage.
        return ResponseEntity.created(URI.create("pedidos/" + pedido.getId())).body(pedido);
    }

    @PutMapping("/{id}")
    public Pedido actualizar(@PathVariable Long id, @Valid @RequestBody PedidoRequest request) {
        return service.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
