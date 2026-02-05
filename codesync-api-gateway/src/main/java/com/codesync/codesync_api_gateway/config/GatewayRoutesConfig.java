package com.codesync.codesync_api_gateway.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutesConfig {

        @Value("${services.auth.url:http://localhost:8081}")
        private String authServiceUrl;

        @Value("${services.session.url:http://localhost:8082}")
        private String sessionServiceUrl;

        @Value("${services.comment.url:http://localhost:8085}")
        private String commentServiceUrl;

        @Value("${services.document.url:http://localhost:8087}")
        private String documentServiceUrl;

        @Value("${services.github.url:http://localhost:8088}")
        private String githubServiceUrl;

        @Value("${services.realtime.url:http://localhost:8084}")
        private String realtimeServiceUrl;

        @PostConstruct
        public void printRoutes() {
                System.out.println("GatewayRoutesConfig loaded with service URLs:");
                System.out.println("  Auth: " + authServiceUrl);
                System.out.println("  Session: " + sessionServiceUrl);
                System.out.println("  Realtime: " + realtimeServiceUrl);
        }

        @Bean
        public RouteLocator gatewayRoutes(RouteLocatorBuilder builder) {
                return builder.routes()

                                // Auth Service
                                .route("auth-service", r -> r
                                                .path("/api/auth/**")
                                                .uri(authServiceUrl))

                                // Session Service
                                .route("session-service", r -> r
                                                .path("/api/sessions", "/api/sessions/**")
                                                .uri(sessionServiceUrl))

                                // Comment Service
                                .route("comment-service", r -> r
                                                .path("/api/comments/**")
                                                .uri(commentServiceUrl))

                                // Document Service
                                .route("document-service", r -> r
                                                .path("/api/documents/**")
                                                .uri(documentServiceUrl))

                                // GitHub Service
                                .route("github-service", r -> r
                                                .path("/api/github/**")
                                                .uri(githubServiceUrl))

                                // WebSocket/Realtime
                                .route("realtime-ws", r -> r
                                                .path("/ws/**")
                                                .uri(realtimeServiceUrl))

                                .build();
        }

}
