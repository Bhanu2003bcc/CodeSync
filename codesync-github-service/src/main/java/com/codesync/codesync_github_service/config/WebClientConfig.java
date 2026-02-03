package com.codesync.codesync_github_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient github() {
        return WebClient.builder()
                .baseUrl("https://api.github.com")
                .build();
    }
}
