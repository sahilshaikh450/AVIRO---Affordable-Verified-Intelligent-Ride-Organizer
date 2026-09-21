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
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http

                // Disable CSRF for REST API
                .csrf(AbstractHttpConfigurer::disable)

                // Enable CORS
                .cors(cors ->
                        cors.configurationSource(
                                corsConfigurationSource()
                        )
                )

                // Stateless JWT authentication
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // Authorization rules
                .authorizeHttpRequests(auth -> auth

                        // =================================================
                        // IMPORTANT:
                        // Allow browser CORS preflight requests
                        // =================================================
                        .requestMatchers(
                                HttpMethod.OPTIONS,
                                "/**"
                        ).permitAll()

                        // =================================================
                        // Authentication APIs
                        // =================================================
                        .requestMatchers(
                                "/auth/**"
                        ).permitAll()

                        // =================================================
                        // Chat
                        // =================================================
                        .requestMatchers(
                                "/chat/**"
                        ).permitAll()

                        // =================================================
                        // WebSocket
                        // =================================================
                        .requestMatchers(
                                "/ws/**",
                                "/ws",
                                "/ws/info",
                                "/ws/info/**"
                        ).permitAll()

                        // =================================================
                        // Swagger
                        // =================================================
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // =================================================
                        // Safety
                        // =================================================
                        .requestMatchers(
                                "/safety/**"
                        ).permitAll()

                        // =================================================
                        // Health
                        // =================================================
                        .requestMatchers(
                                "/actuator/health"
                        ).permitAll()

                        // =================================================
                        // Everything else requires authentication
                        // =================================================
                        .anyRequest().authenticated()
                )

                // Authentication provider
                .authenticationProvider(
                        authenticationProvider()
                )

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

        CorsConfiguration config =
                new CorsConfiguration();

        /*
         * Use allowedOriginPatterns instead of allowedOrigins.
         * This allows Vercel deployment URLs without hardcoding
         * one changing deployment URL.
         */
        config.setAllowedOriginPatterns(
                List.of("*")
        );

        // Allowed HTTP methods
        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        // Allow all request headers
        config.setAllowedHeaders(
                List.of("*")
        );

        // Allow credentials
        config.setAllowCredentials(true);

        // Expose useful response headers
        config.setExposedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type"
                )
        );

        // Cache preflight response
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                config
        );

        return source;
    }

    // ============================================================
    // AUTHENTICATION PROVIDER
    // ============================================================
    @Bean
    public AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider();

        provider.setUserDetailsService(
                userDetailsService
        );

        provider.setPasswordEncoder(
                passwordEncoder()
        );

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
