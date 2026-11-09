package com.aviro.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.function.Function;

@Component
public class AuthUserCache {

    private final TtlCache<String, UserDetails> cache = new TtlCache<>(60_000, 20_000);

    public UserDetails get(String email, Function<String, UserDetails> loader) {
        return cache.get(email.toLowerCase(), key -> loader.apply(email));
    }

    public void evict(String email) {
        if (email != null) cache.invalidate(email.toLowerCase());
    }
}
