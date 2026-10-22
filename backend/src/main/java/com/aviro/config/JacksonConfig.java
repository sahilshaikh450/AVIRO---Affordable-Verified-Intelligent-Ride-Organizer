package com.aviro.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * Reads LocalDateTime in app time (Asia/Kolkata). Plain values like
 * "2026-10-22T12:00:00" are kept as is; values with a zone such as
 * "2026-10-22T06:30:00.000Z" (sent by older frontends) are converted,
 * so they are not read as UTC and rejected as "in the past".
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer localDateTimeInAppZone() {
        return builder -> builder.deserializerByType(LocalDateTime.class, new JsonDeserializer<LocalDateTime>() {
            @Override
            public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String text = p.getValueAsString();
                if (text == null || text.isBlank()) return null;
                text = text.trim();
                try {
                    return LocalDateTime.parse(text);
                } catch (DateTimeParseException ignored) {
                    // has a zone/offset, handled below
                }
                try {
                    return OffsetDateTime.parse(text).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
                } catch (DateTimeParseException e) {
                    return (LocalDateTime) ctxt.handleWeirdStringValue(LocalDateTime.class, text, "Invalid date-time");
                }
            }
        });
    }
}
