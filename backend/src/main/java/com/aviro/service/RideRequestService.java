package com.aviro.service;

import com.aviro.entity.Ride;
import com.aviro.entity.RideRequest;
import com.aviro.entity.User;
import com.aviro.enums.Gender;
import com.aviro.enums.RideRequestStatus;
import com.aviro.exception.AviroException;
import com.aviro.repository.RideRequestRepository;
import com.aviro.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideRequestService {

    private static final long MATCH_WINDOW_MINUTES = 60;
    private static final int MAX_ACTIVE_PER_RIDER = 5;
    private static final DateTimeFormatter WHEN =
            DateTimeFormatter.ofPattern("d MMM, h:mm a", Locale.ENGLISH);

    private final RideRequestRepository rideRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${aviro.ride.first-departure:06:00}")
    private LocalTime firstDeparture;

    @Value("${aviro.ride.last-departure:20:00}")
    private LocalTime lastDeparture;

    @Transactional
    public Map<String, Object> create(
            String email, String from, String to, LocalDateTime time, Integer seats) {
        User rider = getUser(email);
        if (!Boolean.TRUE.equals(rider.getIsCollegeVerified())) {
            throw new AviroException(
                    "Please verify your college ID first. Go to Profile → College ID"
                        + " Verification.");
        }
        String fromPlace = clean(from), toPlace = clean(to);
        if (fromPlace.isEmpty() || toPlace.isEmpty()) {
            throw new AviroException("Please enter From and To locations");
        }
        if ((fromPlace + toPlace).matches(".*[<>].*")) {
            throw new AviroException("Use plain text: < and > are not allowed");
        }
        if (squash(fromPlace).equals(squash(toPlace))) {
            throw new AviroException("Pickup and drop can't be the same place");
        }
        if (time == null || time.isBefore(LocalDateTime.now().plusMinutes(10))) {
            throw new AviroException("Pick a time at least 10 minutes from now");
        }
        if (time.toLocalTime().isBefore(firstDeparture)
                || time.toLocalTime().isAfter(lastDeparture)) {
            throw new AviroException("Rides run between 6:00 AM and 8:00 PM");
        }
        int seatsNeeded = seats == null ? 1 : Math.max(1, Math.min(4, seats));
        LocalDateTime now = LocalDateTime.now();

        for (RideRequest r :
                rideRequestRepository
                        .findByRiderIdAndStatusInAndDesiredTimeAfterOrderByDesiredTimeAsc(
                                rider.getId(), EnumSet.of(RideRequestStatus.ACTIVE), now)) {
            if (squash(r.getFromLocation()).equals(squash(fromPlace))
                    && squash(r.getToLocation()).equals(squash(toPlace))
                    && Math.abs(Duration.between(r.getDesiredTime(), time).toMinutes()) <= 30) {
                return toMap(r, false);
            }
        }
        if (rideRequestRepository.countByRiderIdAndStatusAndDesiredTimeAfter(
                        rider.getId(), RideRequestStatus.ACTIVE, now)
                >= MAX_ACTIVE_PER_RIDER) {
            throw new AviroException(
                    "You can keep up to "
                            + MAX_ACTIVE_PER_RIDER
                            + " ride alerts. Remove one first.");
        }
        RideRequest saved =
                rideRequestRepository.save(
                        RideRequest.builder()
                                .rider(rider)
                                .fromLocation(fromPlace)
                                .toLocation(toPlace)
                                .desiredTime(time)
                                .seatsNeeded(seatsNeeded)
                                .build());
        log.info("Ride alert {} created by rider {}", saved.getId(), rider.getId());
        return toMap(saved, false);
    }

    public List<Map<String, Object>> mine(String email) {
        User rider = getUser(email);
        return rideRequestRepository
                .findByRiderIdAndStatusInAndDesiredTimeAfterOrderByDesiredTimeAsc(
                        rider.getId(),
                        EnumSet.of(RideRequestStatus.ACTIVE, RideRequestStatus.MATCHED),
                        LocalDateTime.now().minusHours(1))
                .stream()
                .map(r -> toMap(r, false))
                .toList();
    }

    @Transactional
    public void cancel(String email, Long id) {
        User rider = getUser(email);
        RideRequest r =
                rideRequestRepository
                        .findById(id)
                        .orElseThrow(() -> new AviroException("Ride alert not found"));
        if (!r.getRider().getId().equals(rider.getId())) {
            throw new AviroException("You can only remove your own ride alerts");
        }
        r.setStatus(RideRequestStatus.CANCELLED);
        rideRequestRepository.save(r);
    }

    public List<Map<String, Object>> openForDrivers(String email) {
        User driver = getUser(email);
        LocalDateTime now = LocalDateTime.now();
        return rideRequestRepository
                .findByStatusAndTimeBetween(RideRequestStatus.ACTIVE, now, now.plusDays(7))
                .stream()
                .filter(r -> !r.getRider().getId().equals(driver.getId()))
                .limit(20)
                .map(r -> toMap(r, true))
                .toList();
    }

    @Transactional
    public int notifyMatches(Ride ride) {
        LocalDateTime t = ride.getDepartureTime();
        List<RideRequest> candidates =
                rideRequestRepository.findByStatusAndTimeBetween(
                        RideRequestStatus.ACTIVE,
                        t.minusMinutes(MATCH_WINDOW_MINUTES),
                        t.plusMinutes(MATCH_WINDOW_MINUTES));
        int told = 0;
        for (RideRequest r : candidates) {
            User rider = r.getRider();
            if (rider.getId().equals(ride.getDriver().getId())) continue;
            if (r.getSeatsNeeded() > ride.getAvailableSeats()) continue;
            if (Boolean.TRUE.equals(ride.getWomenOnly()) && rider.getGender() != Gender.FEMALE)
                continue;
            if (ride.getAllowedGender() != null && rider.getGender() != ride.getAllowedGender())
                continue;
            if (!placesMatch(ride.getFromLocation(), r.getFromLocation())
                    || !placesMatch(ride.getToLocation(), r.getToLocation())) continue;
            r.setStatus(RideRequestStatus.MATCHED);
            r.setMatchedRideId(ride.getId());
            rideRequestRepository.save(r);
            try {
                notificationService.send(
                        rider.getId(),
                        "Ride found! 🎉",
                        ride.getFromLocation()
                                + " → "
                                + ride.getToLocation()
                                + ", "
                                + t.format(WHEN)
                                + ". Book your seat before it fills up.",
                        "RIDE_MATCH",
                        String.valueOf(ride.getId()));
                told++;
            } catch (Exception e) {
                log.warn("Ride alert notification failed: {}", e.getMessage());
            }
        }
        if (told > 0) log.info("Ride {} matched {} ride alerts", ride.getId(), told);
        return told;
    }

    static boolean placesMatch(String a, String b) {
        String x = squash(a), y = squash(b);
        return !x.isEmpty() && !y.isEmpty() && (x.contains(y) || y.contains(x));
    }

    private static String squash(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static String clean(String s) {
        String v = s == null ? "" : s.trim();
        return v.length() > 200 ? v.substring(0, 200) : v;
    }

    private static Map<String, Object> toMap(RideRequest r, boolean forDriver) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("fromLocation", r.getFromLocation());
        m.put("toLocation", r.getToLocation());
        m.put("desiredTime", r.getDesiredTime());
        m.put("seatsNeeded", r.getSeatsNeeded());
        if (forDriver) {
            String name = r.getRider().getFullName();
            m.put("riderFirstName", name == null ? "Student" : name.trim().split("\\s+")[0]);
            m.put("riderGender", r.getRider().getGender());
        } else {
            m.put("status", r.getStatus());
            m.put("matchedRideId", r.getMatchedRideId());
        }
        return m;
    }

    private User getUser(String email) {
        return userRepository
                .findByEmail(email)
                .orElseThrow(() -> new AviroException("User not found"));
    }
}
