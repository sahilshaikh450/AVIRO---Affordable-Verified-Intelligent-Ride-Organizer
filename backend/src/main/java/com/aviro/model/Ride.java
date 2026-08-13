package com.aviro.model;

import jakarta.persistence.*;

@Entity
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String origin;
    private String destination;
    private String departureTime;
    private int availableSeats;
    private double pricePerSeat;
    private Long vehicleId;

    public Long getId() { return id; }
    public String getOrigin() { return origin; }
    public String getDestination() { return destination; }
    public String getDepartureTime() { return departureTime; }
    public int getAvailableSeats() { return availableSeats; }
    public double getPricePerSeat() { return pricePerSeat; }
    public Long getVehicleId() { return vehicleId; }

    public void setId(Long id) { this.id = id; }
    public void setOrigin(String origin) { this.origin = origin; }
    public void setDestination(String destination) { this.destination = destination; }
    public void setDepartureTime(String departureTime) { this.departureTime = departureTime; }
    public void setAvailableSeats(int availableSeats) { this.availableSeats = availableSeats; }
    public void setPricePerSeat(double pricePerSeat) { this.pricePerSeat = pricePerSeat; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
}