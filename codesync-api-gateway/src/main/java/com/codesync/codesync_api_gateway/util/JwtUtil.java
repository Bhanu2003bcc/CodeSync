package com.codesync.codesync_api_gateway.util;


import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;

public class JwtUtil {
    private static final String SECRET = "0607e35d5d46c6ea551dbdb9857e0a9c03f3679f116fa8fc918fd5b1c72b3193";

    private static final SecretKey KEY =
            Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public static Claims parseToken(String token) {
        // Use the parserBuilder to verify the signature against the KEY
        return Jwts.parserBuilder()
                .setSigningKey(KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
