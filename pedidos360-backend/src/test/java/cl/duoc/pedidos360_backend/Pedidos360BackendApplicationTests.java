package cl.duoc.pedidos360_backend;

import java.time.Instant;
import cl.duoc.pedidos360_backend.repository.PedidoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:pedidos-test;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "logging.level.root=WARN", "debug=false"
})
@AutoConfigureMockMvc
class Pedidos360BackendApplicationTests {
    @Autowired MockMvc mvc;
    @Autowired PedidoRepository repository;
    @Autowired OAuth2TokenValidator<Jwt> cognitoValidator;
    private static final String BODY =
        "{\"cliente\":\" Ana \",\"producto\":\"Notebook\",\"cantidad\":2,\"estado\":\"EN_PREPARACION\"}";

    @BeforeEach void limpiar() { repository.deleteAll(); }

    private RequestPostProcessor permiso(String accion) {
        return jwt().authorities(new SimpleGrantedAuthority("SCOPE_rs-api-pedidos/pedidos-" + accion));
    }

    @Test void crudCompleto() throws Exception {
        mvc.perform(post("/api/pedidos").with(permiso("create"))
                .contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.cliente").value("Ana"));
        Long id = repository.findAll().get(0).getId();
        mvc.perform(get("/api/pedidos").with(permiso("read")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/pedidos/{id}", id).with(permiso("read")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.cantidad").value(2));
        mvc.perform(put("/api/pedidos/{id}", id).with(permiso("update"))
                .contentType(MediaType.APPLICATION_JSON).content(BODY.replace("EN_PREPARACION", "ENVIADO")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ENVIADO"));
        assertEquals("ENVIADO", repository.findById(id).orElseThrow().getEstado().name());
        mvc.perform(delete("/api/pedidos/{id}", id).with(permiso("delete")))
            .andExpect(status().isNoContent()).andExpect(content().string(""));
        mvc.perform(get("/api/pedidos/{id}", id).with(permiso("read")))
            .andExpect(status().isNotFound());
        assertEquals(0, repository.count());
    }

    @Test void rechazaSinTokenYTokenMalformado() throws Exception {
        mvc.perform(get("/api/pedidos")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/pedidos").header("Authorization", "Bearer invalid"))
            .andExpect(status().isUnauthorized());
    }

    @Test void lecturaNoPermiteEscrituras() throws Exception {
        mvc.perform(post("/api/pedidos").with(permiso("read"))
                .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        mvc.perform(put("/api/pedidos/1").with(permiso("read"))
                .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/pedidos/1").with(permiso("read"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/pedidos").with(permiso("create"))).andExpect(status().isForbidden());
    }

    @Test void validaCamposYEstado() throws Exception {
        for (String invalid : new String[] {
            BODY.replace(" Ana ", " "), BODY.replace("Notebook", ""),
            BODY.replace("\"cantidad\":2", "\"cantidad\":0"),
            BODY.replace("\"cantidad\":2", "\"cantidad\":1000001"),
            BODY.replace("\"cantidad\":2", "\"cantidad\":null"),
            BODY.replace("EN_PREPARACION", "DESCONOCIDO"),
            BODY.replace("\"cantidad\":2", "\"cantidad\":1.5")
        }) {
            mvc.perform(post("/api/pedidos").with(permiso("create"))
                    .contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
        }
        assertEquals(0, repository.count());
    }

    @Test void idsInexistentesNoCreanNiEliminan() throws Exception {
        mvc.perform(put("/api/pedidos/999").with(permiso("update"))
                .contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/pedidos/999").with(permiso("delete"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/pedidos/no-numero").with(permiso("read"))).andExpect(status().isBadRequest());
        assertEquals(0, repository.count());
    }

    @Test void corsPreflightYErrores() throws Exception {
        for (String path : new String[] {"/api/pedidos", "/api/pedidos/1"}) {
            mvc.perform(options(path).header("Origin", "http://localhost:4200")
                    .header("Access-Control-Request-Method", "PUT")
                    .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        }
        mvc.perform(get("/api/pedidos").header("Origin", "http://localhost:4200"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
        mvc.perform(options("/api/pedidos").header("Origin", "https://otro.example")
                .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }

    private Jwt token(String issuer, String client, String use, Instant expiration) {
        return Jwt.withTokenValue("test").header("alg", "RS256")
            .issuer(issuer).subject("usuario").issuedAt(Instant.now().minusSeconds(600))
            .expiresAt(expiration).claim("client_id", client).claim("token_use", use).build();
    }

    @Test void validaEmisorClienteTipoYExpiracion() {
        String issuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_cRb1mCRID";
        String client = "72tfeld99bp84ph6k5qth991d8";
        Instant future = Instant.now().plusSeconds(300);
        assertFalse(cognitoValidator.validate(token(issuer, client, "access", future)).hasErrors());
        assertTrue(cognitoValidator.validate(token("https://otro.example", client, "access", future)).hasErrors());
        assertTrue(cognitoValidator.validate(token(issuer, "otro-cliente", "access", future)).hasErrors());
        assertTrue(cognitoValidator.validate(token(issuer, client, "id", future)).hasErrors());
        assertTrue(cognitoValidator.validate(token(issuer, client, "access", Instant.now().minusSeconds(300))).hasErrors());
    }
}
