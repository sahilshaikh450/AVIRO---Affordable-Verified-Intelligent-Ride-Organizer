package com.aviro.config;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Pattern;

public class MaskingMessageConverter extends MessageConverter {

    private static final Pattern EMAIL =
            Pattern.compile("([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+)");

    private static final Pattern PHONE =
            Pattern.compile("(?<!\\d)(\\+?91[ -]?)?([6-9])\\d{5}(\\d{4})(?!\\d)");

    @Override
    public String convert(ILoggingEvent event) {
        return mask(super.convert(event));
    }

    public static String mask(String message) {
        if (message == null || message.isEmpty()) return message;
        String out = EMAIL.matcher(message).replaceAll("$1***@$2");
        return PHONE.matcher(out).replaceAll("$2*****$3");
    }
}
