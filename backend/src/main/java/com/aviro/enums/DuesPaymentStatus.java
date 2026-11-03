package com.aviro.enums;

public enum DuesPaymentStatus {
    PENDING,    // driver says they paid; admin hasn't checked yet
    CONFIRMED,  // admin saw the money arrive
    REJECTED    // admin couldn't find the payment
}
