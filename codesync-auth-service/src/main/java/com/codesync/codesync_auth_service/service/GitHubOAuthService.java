package com.codesync.codesync_auth_service.service;

import com.codesync.codesync_auth_service.config.GitHubOAuthConfig;
import com.codesync.codesync_auth_service.model.User;
import com.codesync.codesync_auth_service.repository.UserRepository;
import com.codesync.codesync_auth_service.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GitHubOAuthService {

    private final GitHubOAuthConfig config;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Exchange authorization code for access token
     */
    public String exchangeCodeForToken(String code) {
        String tokenUrl = "https://github.com/login/oauth/access_token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        Map<String, String> body = Map.of(
                "client_id", config.getClientId(),
                "client_secret", config.getClientSecret(),
                "code", code);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                tokenUrl,
                HttpMethod.POST,
                request,
                Map.class);

        Map responseBody = response.getBody();
        if (responseBody != null && responseBody.containsKey("access_token")) {
            return (String) responseBody.get("access_token");
        }

        throw new RuntimeException("Failed to get access token: " + responseBody);
    }

    /**
     * Get GitHub user profile using access token
     */
    public Map<String, Object> getGitHubUser(String accessToken) {
        String userUrl = "https://api.github.com/user";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                userUrl,
                HttpMethod.GET,
                request,
                Map.class);

        return response.getBody();
    }

    /**
     * Login or register user based on GitHub profile
     * Returns JWT token
     */
    public String loginOrRegister(String accessToken, Map<String, Object> githubUser) {
        String githubId = String.valueOf(githubUser.get("id"));
        String username = (String) githubUser.get("login");
        String email = (String) githubUser.get("email");
        String avatarUrl = (String) githubUser.get("avatar_url");

        // Find existing user or create new one
        Optional<User> existingUser = userRepository.findByGithubId(githubId);

        User user;
        if (existingUser.isPresent()) {
            // Update existing user
            user = existingUser.get();
            user.setUsername(username);
            user.setEmail(email);
            user.setAvatarUrl(avatarUrl);
            user.setGithubAccessToken(accessToken);
        } else {
            // Create new user
            user = User.builder()
                    .githubId(githubId)
                    .username(username)
                    .email(email)
                    .avatarUrl(avatarUrl)
                    .githubAccessToken(accessToken)
                    .build();
        }

        userRepository.save(user);

        // Generate JWT token
        return JwtUtil.generateToken(user);
    }
}
