package com.aviro.config;

import com.aviro.enums.Role;
import com.aviro.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Gives the ADMIN role to the accounts listed in AVIRO_ADMIN_EMAILS
 * (comma-separated) when the server starts. This is the only way to become
 * an admin: registration does not accept the ADMIN role.
 */
@Component
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final String adminEmails;

    public AdminBootstrap(UserRepository userRepository,
                          @Value("${aviro.admin-emails:${AVIRO_ADMIN_EMAILS:}}") String adminEmails) {
        this.userRepository = userRepository;
        this.adminEmails = adminEmails;
    }

    @Override
    public void run(ApplicationArguments args) {
        Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .forEach(email -> userRepository.findByEmailNormalized(email).ifPresentOrElse(user -> {
                    if (user.getRole() != Role.ADMIN) {
                        user.setRole(Role.ADMIN);
                        userRepository.save(user);
                        log.info("Granted ADMIN role to user {}", user.getId());
                    }
                }, () -> log.warn("AVIRO_ADMIN_EMAILS: no account found for one of the listed emails")));
    }
}
