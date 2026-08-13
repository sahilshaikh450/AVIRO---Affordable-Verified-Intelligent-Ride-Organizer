package com.aviro.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;

@Component
public class JwtUtil {

    private final String SECRET = "mysecretkeymysecretkeymysecretkey";
    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());

    public String generateToken(Long userId) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // 🔥 IMPORTANT FIX (missing method)
    public Long extractUserId(String token) {
        return Long.parseLong(
                Jwts.parserBuilder()
                        .setSigningKey(key)
                        .build()
                        .parseClaimsJws(token)
                        .getBody()
                        .getSubject()
        );
    }
}