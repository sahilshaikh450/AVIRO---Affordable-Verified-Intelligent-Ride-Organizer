package com.aviro.repository;

import com.aviro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByCollegeEmail(String collegeEmail);
}