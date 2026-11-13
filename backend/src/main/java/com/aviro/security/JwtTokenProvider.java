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

    private static final String ISSUED_MS = "iat_ms";

    @Value("${aviro.jwt.secret}")
    private String jwtSecret;

    @Value("${aviro.jwt.expiration}")
    private long jwtExpiration;

    @Value("${aviro.jwt.refresh-expiration}")
    private long refreshExpiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    private static final String TYPE = "typ";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    public String generateAccessToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim(TYPE, ACCESS)
                .setIssuedAt(new Date())
                .claim(ISSUED_MS, System.currentTimeMillis())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim(TYPE, REFRESH)
                .setIssuedAt(new Date())
                .claim(ISSUED_MS, System.currentTimeMillis())
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

    public long getIssuedAtMsFromToken(String token) {
        Claims claims =
                Jwts.parserBuilder()
                        .setSigningKey(getSigningKey())
                        .build()
                        .parseClaimsJws(token)
                        .getBody();
        Number ms = claims.get(ISSUED_MS, Number.class);
        return ms != null ? ms.longValue() : claims.getIssuedAt().getTime();
    }

    public Date getExpirationFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }

    public boolean isAccessToken(String token) {
        Claims claims = claimsOf(token);
        Object type = claims.get(TYPE);
        if (type != null) return ACCESS.equals(type);
        long lifetime = claims.getExpiration().getTime() - claims.getIssuedAt().getTime();
        return lifetime <= jwtExpiration + 60_000;
    }

    public boolean isRefreshToken(String token) {
        return REFRESH.equals(claimsOf(token).get(TYPE));
    }

    private Claims claimsOf(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired: {}", e.getMessage());
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return false;
        } catch (ExpiredJwtException e) {
            return true;
        } catch (Exception e) {
            return true;
        }
    }
}
