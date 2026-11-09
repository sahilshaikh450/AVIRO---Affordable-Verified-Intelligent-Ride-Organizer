package com.aviro.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.config.MaskingMessageConverter;

import org.junit.jupiter.api.Test;

class LogMaskingTest {

    @Test
    void emailsAndPhonesAreMasked() {
        assertThat(MaskingMessageConverter.mask("Login successful: sahil.shaikh@mitwpu.edu.in"))
                .isEqualTo("Login successful: s***@mitwpu.edu.in");
        assertThat(
                        MaskingMessageConverter.mask(
                                "OTP generated for: reset:rahul@gmail.com (expires in 10 min)"))
                .isEqualTo("OTP generated for: reset:r***@gmail.com (expires in 10 min)");
        assertThat(MaskingMessageConverter.mask("call 9876543210 or +91 9123456789"))
                .isEqualTo("call 9*****3210 or 9*****6789");
    }

    @Test
    void ordinaryNumbersAndIdsStay() {
        assertThat(MaskingMessageConverter.mask("Booking created: ride=20243 at 1794156783897"))
                .isEqualTo("Booking created: ride=20243 at 1794156783897");
        assertThat(MaskingMessageConverter.mask(null)).isNull();
    }
}
