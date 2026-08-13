package com.aviro.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
@JsonIgnoreProperties(ignoreUnknown = true)
@Entity
@Table(name = "users") // recommended
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "college_email")
    private String collegeEmail;

    private String password;
    private String role;

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCollegeEmail() { return collegeEmail; }
    public String getPassword() { return password; }
    public String getRole() { return role; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setCollegeEmail(String collegeEmail) { this.collegeEmail = collegeEmail; }
    public void setPassword(String password) { this.password = password; }
    public void setRole(String role) { this.role = role; }
}