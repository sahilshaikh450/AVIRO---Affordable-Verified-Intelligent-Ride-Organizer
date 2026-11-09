package com.aviro.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.Data;

@Data
public class GuidelinesRequest {

    @NotNull(message = "Please accept the community guidelines to continue")
    @AssertTrue(message = "Please accept the community guidelines to continue")
    private Boolean acceptedGuidelines;

    @NotBlank(message = "Please accept the community guidelines to continue")
    @Size(max = 20)
    @Pattern(regexp = "^[0-9A-Za-z.-]+$")
    private String guidelinesVersion;
}
