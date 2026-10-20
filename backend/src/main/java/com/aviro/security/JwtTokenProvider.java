package com.aviro.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${aviro.jwt.secret}")
    private String jwtSecret;

    @Value("${aviro.jwt.expiration}")
    private long jwtExpiration;

    @Value("${aviro.jwt.refresh-expiration}")
    private long refreshExpiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateAccessToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public Date getExpirationFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            // Token expired — warn level only, not error (this is normal/expected)
            log.warn("JWT token expired: {}", e.getMessage());
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            // Truly invalid token — warn level
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return false;
        } catch (ExpiredJwtException e) {
            return true;
        } catch (Exception e) {
            return true;
        }
    }
}