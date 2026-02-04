package com.codesync.codesync_api_gateway.filter;

import com.codesync.codesync_api_gateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class JwtAuthFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    @Override
    public int getOrder() {
        return -1;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        final String path = exchange.getRequest().getURI().getPath();
        logger.info("=== JwtAuthFilter START === Path: {}", path);

        String method = "UNKNOWN";
        if (exchange.getRequest().getMethod() != null) {
            method = exchange.getRequest().getMethod().toString();
        }
        logger.info("Method: {}", method);

        // ✅ 1. Skip OPTIONS requests (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            logger.info("✓ Skipping OPTIONS request");
            return chain.filter(exchange);
        }

        // ✅ 2. Skip WebSocket paths FIRST (before auth check)
        // ✅ 3. Skip public auth endpoints (including GitHub OAuth)
        if (path.startsWith("/api/auth/login") ||
                path.startsWith("/api/auth/register") ||
                path.startsWith("/api/auth/github") ||
                path.startsWith("/ws")) {
            logger.info("✓ Skipping authentication for public/WebSocket path: {}", path);
            return chain.filter(exchange);
        }

        // ✅ 4. All other paths require JWT authentication
        logger.info("Request headers: {}", exchange.getRequest().getHeaders());

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.error("✗ FAIL: Authorization header is NULL or invalid: {}", authHeader);
            return unauthorized(exchange);
        }

        String token = authHeader.substring(7);
        logger.info("✓ Extracted token: {}...", token.substring(0, Math.min(20, token.length())));

        try {
            Claims claims = JwtUtil.parseToken(token);
            String userId = claims.getSubject();
            String username = claims.get("username", String.class);
            String roles = claims.get("roles", String.class);

            logger.info("✓ JWT parsed successfully");
            logger.info("  - userId: {}", userId);
            logger.info("  - username: {}", username);
            logger.info("  - roles: {}", roles);

            ServerWebExchange mutatedExchange = exchange.mutate()
                    .request(r -> r.headers(headers -> {
                        headers.set(HttpHeaders.AUTHORIZATION, authHeader);
                        headers.add("X-User-Id", userId);
                        headers.add("X-Username", username);
                        headers.add("X-User-Roles", roles);
                        headers.add("X-Request-Id", UUID.randomUUID().toString());
                    }))
                    .build();

            logger.info("✓ Request enriched, forwarding to downstream");
            logger.info("=== JwtAuthFilter END (SUCCESS) ===");
            return chain.filter(mutatedExchange);

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            logger.error("✗ FAIL: Token expired - {}", e.getMessage());
            return unauthorized(exchange);
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            logger.error("✗ FAIL: Malformed token - {}", e.getMessage());
            return unauthorized(exchange);
        } catch (io.jsonwebtoken.security.SignatureException e) {
            logger.error("✗ FAIL: Invalid signature - {}", e.getMessage());
            return unauthorized(exchange);
        } catch (Exception e) {
            logger.error("✗ FAIL: Token validation failed - Type: {}, Message: {}",
                    e.getClass().getName(), e.getMessage(), e);
            return unauthorized(exchange);
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }
}