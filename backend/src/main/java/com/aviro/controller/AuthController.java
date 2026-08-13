package com.aviro.controller;

import com.aviro.model.User;
import com.aviro.repository.UserRepository;
import com.aviro.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserRepository repo;

    @Autowired
    private JwtUtil jwt;

    @PostMapping("/register")
    public User register(@RequestBody User user) {
        return repo.save(user);
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody User req) {

        User user = repo.findByCollegeEmail(req.getCollegeEmail());

        if (user == null || !user.getPassword().equals(req.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwt.generateToken(user.getId());

        return Map.of("accessToken", token);
    }
}