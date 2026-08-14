package com.enesucar.inventory.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final String SECRET_KEY = "lagerverwaltung-secret-key-minimum-256-bits-long";

    public String tokenErstellen(String username) {
        Map<String, Object> claims = new HashMap<>();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String benutzernameAuslesen(String token) {
        return claimAuslesen(token, Claims::getSubject);
    }

    public boolean tokenValidieren(String token, String username) {
        final String tokenUsername = benutzernameAuslesen(token);
        return tokenUsername.equals(username) && !tokenAbgelaufen(token);
    }

    private boolean tokenAbgelaufen(String token) {
        return ablaufDatumAuslesen(token).before(new Date());
    }

    private Date ablaufDatumAuslesen(String token) {
        return claimAuslesen(token, Claims::getExpiration);
    }

    private <T> T claimAuslesen(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = alleClaimsAuslesen(token);
        return claimsResolver.apply(claims);
    }

    private Claims alleClaimsAuslesen(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }
}
