package com.aviro.config;

import com.aviro.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;

import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    // ============================================================
    // SECURITY FILTER CHAIN
    // ============================================================
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            // Disable CSRF because this is a stateless REST API
            .csrf(AbstractHttpConfigurer::disable)

            // Enable CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless JWT authentication
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Authorization rules
            .authorizeHttpRequests(auth -> auth

                // IMPORTANT:
                // Allow browser CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public authentication APIs
                .requestMatchers(
                    "/auth/**",

                    // Chat
                    "/chat/**",

                    // WebSocket
                    "/ws/**",
                    "/ws",
                    "/ws/info",
                    "/ws/info/**",

                    // Swagger
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",

                    // Safety
                    "/safety/**",

                    // Health
                    "/actuator/health"
                ).permitAll()

                // Everything else needs authentication
                .anyRequest().authenticated()
            )

            // Authentication provider
            .authenticationProvider(authenticationProvider())

            // JWT filter
            .addFilterBefore(
                jwtAuthFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    // ============================================================
    // CORS CONFIGURATION
    // ============================================================
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        /*
         * Current Vercel frontend URL from your browser screenshot.
         */
        config.setAllowedOriginPatterns(List.of(
            "https://aviro-affordable-verified-intelligent-ride-organizer-fuj8eamw3.vercel.app",
            "http://localhost:3000"
        ));

        /*
         * Allow all required HTTP methods.
         */
        config.setAllowedMethods(List.of(
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ));

        /*
         * Allow request headers such as:
         * Content-Type
         * Authorization
         */
        config.setAllowedHeaders(List.of("*"));

        /*
         * Needed if frontend sends cookies/credentials.
         */
        config.setAllowCredentials(true);

        /*
         * Headers that browser is allowed to read.
         */
        config.setExposedHeaders(List.of(
            "Authorization",
            "Content-Type"
        ));

        /*
         * Cache preflight response for 1 hour.
         */
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    // ============================================================
    // AUTHENTICATION PROVIDER
    // ============================================================
    @Bean
    public AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
            new DaoAuthenticationProvider();

        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());

        return provider;
    }

    // ============================================================
    // AUTHENTICATION MANAGER
    // ============================================================
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {

        return config.getAuthenticationManager();
    }

    // ============================================================
    // PASSWORD ENCODER
    // ============================================================
    @Bean
    public PasswordEncoder passwordEncoder() {

        return new BCryptPasswordEncoder();
    }
}
