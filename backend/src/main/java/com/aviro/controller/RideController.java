package com.aviro.controller;

import com.aviro.model.Ride;
import com.aviro.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
@CrossOrigin("*")
public class RideController {

    @Autowired
    private RideRepository repo;

    @PostMapping
    public Ride create(@RequestBody Ride ride) {
        return repo.save(ride);
    }

    @GetMapping("/my-rides")
    public List<Ride> getAll() {
        return repo.findAll();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }

    @GetMapping("/{id}")
    public Ride getById(@PathVariable Long id) {
        return repo.findById(id).orElse(null);
    }

    @GetMapping("/search")
    public List<Ride> search(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam String date) {

        return repo.findAll(); // basic
    }

    @PutMapping("/{id}/cancel")
    public String cancel(@PathVariable Long id) {
        Ride ride = repo.findById(id).orElse(null);
        if (ride != null) {
            ride.setAvailableSeats(0);
            repo.save(ride);
        }
        return "Cancelled";
    }
    @PutMapping("/{id}/book")
    public String bookRide(@PathVariable Long id) {

        Ride ride = repo.findById(id).orElse(null);

        if (ride == null) return "Ride not found";

        if (ride.getAvailableSeats() <= 0) {
            return "No seats available";
        }

        ride.setAvailableSeats(ride.getAvailableSeats() - 1);
        repo.save(ride);

        return "Ride booked successfully";
    }
    
    
}