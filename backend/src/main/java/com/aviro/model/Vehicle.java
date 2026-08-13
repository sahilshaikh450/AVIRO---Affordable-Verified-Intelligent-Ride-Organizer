package com.aviro.model;

import jakarta.persistence.*;

@Entity
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type;
    private String registrationNumber;
    private String model;
    private int seatsAvailable;

    public Long getId() { return id; }
    public String getType() { return type; }
    public String getRegistrationNumber() { return registrationNumber; }
    public String getModel() { return model; }
    public int getSeatsAvailable() { return seatsAvailable; }

    public void setId(Long id) { this.id = id; }
    public void setType(String type) { this.type = type; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
    public void setModel(String model) { this.model = model; }
    public void setSeatsAvailable(int seatsAvailable) { this.seatsAvailable = seatsAvailable; }
}