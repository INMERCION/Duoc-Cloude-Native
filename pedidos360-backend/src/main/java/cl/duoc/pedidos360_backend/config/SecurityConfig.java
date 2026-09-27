package cl.duoc.pedidos360_backend.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/pedidos", "/api/pedidos/*")
                    .hasAuthority("SCOPE_rs-api-pedidos/pedidos-read")
                .requestMatchers(HttpMethod.POST, "/api/pedidos")
                    .hasAuthority("SCOPE_rs-api-pedidos/pedidos-create")
                .requestMatchers(HttpMethod.PUT, "/api/pedidos/*")
                    .hasAuthority("SCOPE_rs-api-pedidos/pedidos-update")
                .requestMatchers(HttpMethod.DELETE, "/api/pedidos/*")
                    .hasAuthority("SCOPE_rs-api-pedidos/pedidos-delete")
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
            .build();
    }

    @Bean
    OAuth2TokenValidator<Jwt> cognitoValidator(
        @Value("${app.cognito.issuer}") String issuer,
        @Value("${app.cognito.client-id}") String clientId) {
        return new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuer),
            new JwtClaimValidator<String>("token_use", "access"::equals),
            new JwtClaimValidator<String>("client_id", clientId::equals));
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${app.cognito.issuer}") String issuer,
                          OAuth2TokenValidator<Jwt> cognitoValidator) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
            .withJwkSetUri(issuer + "/.well-known/jwks.json").build();
        decoder.setJwtValidator(cognitoValidator);
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.origin}") String origin) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(origin));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setExposedHeaders(List.of("Location"));
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }
}
