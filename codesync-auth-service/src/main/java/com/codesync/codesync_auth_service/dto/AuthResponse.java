package com.codesync.codesync_auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
//    private UUID id;
//    private String username;
//    private String password;
}
