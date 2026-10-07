
package com.aviro.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins(
                        "https://aviro-affordable-verified-intelligent-ride-organizer-6196wgm.vercel.app"
                    )
                    .allowedMethods(
                        "GET", "POST", "PUT",
                        "DELETE", "PATCH", "OPTIONS"
                    )
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
