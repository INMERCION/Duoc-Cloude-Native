package cl.duoc.pedidos360_backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController 
public class Pedidos360Controller {
    @GetMapping ("/api/pedidos")
    public List<Map<String, Object>> obtenerPedidos() {
        return List.of(Map.of(
            "id", 1, 
            "cliente","Aldo Pizarro",
            "producto","Notebook",
            "cantidad", 2,
            "estado", "EN_PREPARACION"
            ),
            Map.of(
            "id", 2,
            "cliente","Omar Felipe",
            "producto","Iphone 18 Pro Max",
            "cantidad", 1,
            "estado", "ENVIADO" 
            ), 
            Map.of(
            "id", 3,
            "cliente","Romina Vaeza",
            "producto","Tablet",   
            "cantidad", 3,
            "estado", "ENTREGADO" 
            )
        );
        }

}
