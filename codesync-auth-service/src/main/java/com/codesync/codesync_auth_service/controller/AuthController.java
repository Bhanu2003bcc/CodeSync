package com.codesync.codesync_auth_service.controller;

import com.codesync.codesync_auth_service.dto.AuthResponse;
import com.codesync.codesync_auth_service.dto.LoginRequest;
import com.codesync.codesync_auth_service.dto.RegisterRequest;
import com.codesync.codesync_auth_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody @Valid RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public Map<String, String> me(@RequestHeader("X-User-Id") String userId,
                                  @RequestHeader("X-Username") String username) {
        
        if (userId == null || username == null) {
            throw new IllegalStateException("Missing gateway identity headers");
        }
        return Map.of(
                "userId", userId,
                "username", username
        );
    }
}
