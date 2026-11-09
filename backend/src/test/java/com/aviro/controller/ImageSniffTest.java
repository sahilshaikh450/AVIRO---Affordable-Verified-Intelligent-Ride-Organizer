package com.aviro.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

class ImageSniffTest {

    private static String sniff(byte[] b) {
        return UserController.sniffImageExtension(b, b.length);
    }

    @Test
    void recognisesRealImages() {
        assertThat(sniff(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}))
                .isEqualTo(".jpg");
        assertThat(sniff(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}))
                .isEqualTo(".png");
        assertThat(sniff("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1)))
                .isEqualTo(".webp");
    }

    @Test
    void refusesEverythingElse() {
        assertThat(sniff("<html><script>alert(1)</script>".getBytes(StandardCharsets.UTF_8)))
                .isNull();
        assertThat(sniff("GIF89a......".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(sniff("%PDF-1.7".getBytes(StandardCharsets.UTF_8))).isNull();
        assertThat(sniff(new byte[] {(byte) 0xFF})).isNull();
        assertThat(sniff(new byte[0])).isNull();
    }
}
