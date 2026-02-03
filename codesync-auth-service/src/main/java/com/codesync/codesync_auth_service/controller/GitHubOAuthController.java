package com.codesync.codesync_auth_service.controller;

import com.codesync.codesync_auth_service.config.GitHubOAuthConfig;
import com.codesync.codesync_auth_service.service.GitHubOAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class GitHubOAuthController {

    private final GitHubOAuthConfig config;
    private final GitHubOAuthService oauthService;

    /**
     * Redirect to GitHub OAuth authorization page
     */
    @GetMapping("/github")
    public ResponseEntity<Map<String, String>> getGitHubAuthUrl() {
        String authUrl = config.getAuthorizationUrl();
        return ResponseEntity.ok(Map.of("url", authUrl));
    }

    /**
     * Handle GitHub OAuth callback
     * Exchanges code for token, creates/updates user, returns JWT
     */
    @GetMapping("/github/callback")
    public ResponseEntity<Void> handleCallback(@RequestParam String code) {
        try {
            // Exchange code for GitHub access token
            String accessToken = oauthService.exchangeCodeForToken(code);

            // Get GitHub user profile
            Map<String, Object> githubUser = oauthService.getGitHubUser(accessToken);

            // Login or register user, get JWT
            String jwt = oauthService.loginOrRegister(accessToken, githubUser);

            // Redirect to frontend with JWT token
            String redirectUrl = config.getFrontendUrl() + "/auth/callback?token=" + jwt;
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(redirectUrl))
                    .build();

        } catch (Exception e) {
            // Redirect to frontend with error
            String errorUrl = config.getFrontendUrl() + "/auth/callback?error=" + e.getMessage();
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(errorUrl))
                    .build();
        }
    }
}
