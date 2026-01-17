package com.codesync.codesync_auth_service.util;

import com.codesync.codesync_auth_service.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

public class JwtUtil {
    private static final String SECRET =
            "0607e35d5d46c6ea551dbdb9857e0a9c03f3679f116fa8fc918fd5b1c72b3193";

    private static final SecretKey KEY =
            Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public static String generateToken(User user) {
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("roles", "USER")
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(System.currentTimeMillis() + 7 * 24 * 60 * 60 * 1000)
                )
                .signWith(KEY)
                .compact();
    }
}
