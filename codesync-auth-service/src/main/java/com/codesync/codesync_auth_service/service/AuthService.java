package com.codesync.codesync_auth_service.service;


import com.codesync.codesync_auth_service.dto.AuthResponse;
import com.codesync.codesync_auth_service.dto.LoginRequest;
import com.codesync.codesync_auth_service.dto.RegisterRequest;
import com.codesync.codesync_auth_service.model.User;
import com.codesync.codesync_auth_service.repository.UserRepository;
import com.codesync.codesync_auth_service.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        return new AuthResponse(JwtUtil.generateToken(user));
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        return new AuthResponse(JwtUtil.generateToken(user));
    }
}
