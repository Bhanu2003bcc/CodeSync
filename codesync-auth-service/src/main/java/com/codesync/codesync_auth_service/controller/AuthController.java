package com.codesync.codesync_auth_service.controller;

import com.codesync.codesync_auth_service.model.User;
import com.codesync.codesync_auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

        private final UserRepository userRepository;

        /**
         * Get current user info from JWT claims (set by API Gateway)
         */
        @GetMapping("/me")
        public ResponseEntity<Map<String, Object>> me(
                        @RequestHeader("X-User-Id") String userId,
                        @RequestHeader("X-Username") String username) {

                if (userId == null || username == null) {
                        throw new IllegalStateException("Missing gateway identity headers");
                }

                // Fetch user from DB to get avatar and other details
                return userRepository.findById(UUID.fromString(userId))
                                .map(user -> ResponseEntity.ok(Map.<String, Object>of(
                                                "userId", userId,
                                                "username", username,
                                                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                                                "email", user.getEmail() != null ? user.getEmail() : "")))
                                .orElse(ResponseEntity.ok(Map.<String, Object>of(
                                                "userId", userId,
                                                "username", username)));
        }

        /**
         * Get user's GitHub access token (for github-service)
         */
        @GetMapping("/github-token/{userId}")
        public ResponseEntity<Map<String, String>> getGitHubToken(@PathVariable UUID userId) {
                return userRepository.findById(userId)
                                .map(user -> ResponseEntity.ok(Map.of(
                                                "token",
                                                user.getGithubAccessToken() != null ? user.getGithubAccessToken()
                                                                : "")))
                                .orElse(ResponseEntity.notFound().build());
        }
}
