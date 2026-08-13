package com.aviro.controller;

import com.aviro.model.Vehicle;
import com.aviro.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@CrossOrigin("*")
public class VehicleController {

    @Autowired
    private VehicleRepository repo;

    @PostMapping
    public Vehicle add(@RequestBody Vehicle v) {
        return repo.save(v);
    }

    @GetMapping("/my-vehicles")
    public List<Vehicle> getAll() {
        return repo.findAll();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }
}