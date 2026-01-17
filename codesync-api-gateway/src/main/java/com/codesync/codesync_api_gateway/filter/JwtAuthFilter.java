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

//    @Override
//    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
//
//        final String path = exchange.getRequest().getURI().getPath();
//        logger.info("JwtAuthFilter triggered for path: {}", path);
//
//        // ✅ Null-safe handling of method name (to avoid compile/runtime errors)
//        String method = "UNKNOWN";
//        if (exchange.getRequest().getMethod() != null) {
//            method = exchange.getRequest().getMethod().toString();
//        }
//
//        if ("OPTIONS".equalsIgnoreCase(method)) {
//            logger.info("Skipping filter for OPTIONS request");
//            return chain.filter(exchange);
//        }
//
//        // ✅ Let public paths through
//        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
//            logger.info("Skipping filter for public auth path: {}", path);
//            return chain.filter(exchange);
//        }
//
//        // ✅ Validate Authorization header
//        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
//        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
//            logger.warn("Missing or invalid Authorization header");
//            return unauthorized(exchange);
//        }
//
//        String token = authHeader.substring(7);
//        logger.info("token: {}", token);
//        try {
//            Claims claims = JwtUtil.parseToken(token);
//            String userId = claims.getSubject();
//            String username = claims.get("username", String.class);
//            String roles = claims.get("roles", String.class);
//
//            logger.info("JWT claims extracted: userId={}, username={}, roles={}", userId, username, roles);
//
//            // ✅ Forward enriched request
//            ServerWebExchange mutatedExchange = exchange.mutate()
//                    .request(r -> r.headers(headers -> {
//                        headers.set(HttpHeaders.AUTHORIZATION, authHeader);
//                        headers.add("X-User-Id", userId);
//                        headers.add("X-Username", username);
//                        headers.add("X-User-Roles", roles);
//                        headers.add("X-Request-Id", UUID.randomUUID().toString());
//                    }))
//                    .build();
//
//            logger.info("Forwarding to downstream with enriched headers");
//            return chain.filter(mutatedExchange);
//
//        } catch (Exception e) {
//            logger.error("Token validation failed: {}", e.getMessage(), e);
//            return unauthorized(exchange);
//        }
//    }
@Override
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    final String path = exchange.getRequest().getURI().getPath();
    logger.info("=== JwtAuthFilter START === Path: {}", path);

    String method = "UNKNOWN";
    if (exchange.getRequest().getMethod() != null) {
        method = exchange.getRequest().getMethod().toString();
    }
    logger.info("Method: {}", method);

    if ("OPTIONS".equalsIgnoreCase(method)) {
        logger.info("✓ Skipping OPTIONS request");
        return chain.filter(exchange);
    }

    if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
        logger.info("✓ Skipping public auth path: {}", path);
        return chain.filter(exchange);
    }

    // Log all headers for debugging
    logger.info("Request headers: {}", exchange.getRequest().getHeaders());

    String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

    if (authHeader == null) {
        logger.error("✗ FAIL: Authorization header is NULL");
        return unauthorized(exchange);
    }

    if (!authHeader.startsWith("Bearer ")) {
        logger.error("✗ FAIL: Authorization header doesn't start with 'Bearer ': {}", authHeader);
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
        logger.info("✓ Forwarding request:");
        logger.info("  - Method: {}", mutatedExchange.getRequest().getMethod());
        logger.info("  - Path: {}", mutatedExchange.getRequest().getPath());
        logger.info("  - Headers: {}", mutatedExchange.getRequest().getHeaders());


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
