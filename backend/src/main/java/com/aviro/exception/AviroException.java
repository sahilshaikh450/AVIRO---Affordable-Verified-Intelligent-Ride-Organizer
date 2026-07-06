package com.aviro.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class AviroException extends RuntimeException {
    public AviroException(String message) {
        super(message);
    }
}
