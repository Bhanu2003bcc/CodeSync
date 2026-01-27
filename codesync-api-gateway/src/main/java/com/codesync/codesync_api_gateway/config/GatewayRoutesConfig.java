package com.codesync.codesync_api_gateway.config;

import jakarta.annotation.PostConstruct;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutesConfig {
        @PostConstruct
        public void printRoutes() {
                System.out.println("GatewayRoutesConfig loaded with /api/sessions/**");
        }

        @Bean
        public RouteLocator gatewayRoutes(RouteLocatorBuilder builder) {
                return builder.routes()

                                // ✅ Auth Service (already works)
                                .route("auth-service", r -> r
                                                .path("/api/auth/**")
                                                .uri("http://localhost:8081"))

                                // ✅ Session Service — handles both `/api/sessions` and `/api/sessions/**`
                                .route("session-service", r -> r
                                                .path("/api/sessions", "/api/sessions/**") // exact + sub-paths
                                                .uri("http://localhost:8082"))

                                // ✅ Comment Service (optional)
                                .route("comment-service", r -> r
                                                .path("/api/comments/**")
                                                .uri("http://localhost:8085"))

                                // ✅ WebSocket/SockJS route - handles both HTTP and WebSocket upgrade
                                .route("realtime-ws", r -> r
                                                .path("/ws/**")
                                                .uri("http://localhost:8084"))

                                .build();
        }

}
