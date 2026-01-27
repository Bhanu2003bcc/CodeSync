package com.codesync.codesync_realtime_service.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;

/**
 * JWT utility class for parsing tokens.
 * Uses the same secret key as the API Gateway.
 */
public class JwtUtil {
    private static final String SECRET = "0607e35d5d46c6ea551dbdb9857e0a9c03f3679f116fa8fc918fd5b1c72b3193";

    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public static Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public static String getUsername(String token) {
        Claims claims = parseToken(token);
        return claims.get("username", String.class);
    }

    public static String getUserId(String token) {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }
}
