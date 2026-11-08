package com.aviro.support;

import com.aviro.entity.User;
import com.aviro.entity.Vehicle;
import com.aviro.enums.Gender;
import com.aviro.enums.Role;
import com.aviro.enums.VehicleType;
import com.aviro.repository.UserRepository;
import com.aviro.repository.VehicleRepository;
import com.aviro.security.JwtTokenProvider;
import com.aviro.service.EmailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Answers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * Base for API tests: the whole app on an in-memory H2 database, called through MockMvc.
 * Redis (rate limits, token blacklist, OTPs) and outgoing email are mocked, so no services are needed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository users;
    @Autowired protected VehicleRepository vehicles;
    @Autowired protected JwtTokenProvider jwt;
    @Autowired protected PasswordEncoder passwordEncoder;

    // Deep stubs: every Redis call returns an empty answer, so limits never trip and nothing is "revoked"
    @MockBean(answer = Answers.RETURNS_DEEP_STUBS) protected StringRedisTemplate stringRedisTemplate;
    @MockBean(name = "redisTemplate", answer = Answers.RETURNS_DEEP_STUBS) protected RedisTemplate<String, Object> redisTemplate;
    @MockBean protected EmailService emailService;

    // Emails "send" fine unless a test says otherwise
    @BeforeEach
    void emailWorks() {
        org.mockito.Mockito.when(emailService.sendVerificationEmailNow(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(true);
        org.mockito.Mockito.when(emailService.sendPasswordResetEmailNow(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(true);
    }

    /** A verified student with a unique email. */
    protected User student(String name, Gender gender) {
        int n = SEQ.incrementAndGet();
        return users.save(User.builder()
                .fullName(name)
                .email(name.toLowerCase().replace(' ', '.') + n + "@mitwpu.edu.in")
                .password(passwordEncoder.encode("password123"))
                .gender(gender)
                .role(Role.BOTH)
                .collegeName("MIT World Peace University")
                .isVerified(true)
                .isCollegeVerified(true)
                .build());
    }

    protected User student(String name) {
        return student(name, Gender.MALE);
    }

    /** A student with a verified vehicle that can post rides. */
    protected User driver(String name, VehicleType type, int seats) {
        User u = student(name);
        vehicles.save(Vehicle.builder()
                .user(u)
                .vehicleType(type)
                .registrationNumber("MH12AB" + String.format("%04d", SEQ.incrementAndGet()))
                .make("Maruti").model("Swift").color("White")
                .totalSeats(seats)
                .isVerified(true)
                .platePhotoUrl("/api/users/vehicle-photo/plate_x.png")
                .licencePhotoUrl("/api/users/vehicle-photo/licence_x.png")
                .build());
        return u;
    }

    protected String token(User u) {
        return jwt.generateAccessToken(u.getEmail());
    }

    /** Tomorrow at the given hour, as the app sends it (local time, no zone). */
    protected static String tomorrowAt(int hour, int minute) {
        return LocalDateTime.now().plusDays(1).withHour(hour).withMinute(minute).truncatedTo(ChronoUnit.MINUTES).toString();
    }

    protected Map<String, Object> rideBody(int seats, double price) {
        return Map.of(
                "fromLocation", "Kothrud Depot " + SEQ.incrementAndGet(),
                "toLocation", "MIT World Peace University",
                "fromLat", 18.5074, "fromLng", 73.8077, "toLat", 18.5196, "toLng", 73.8153,
                "totalSeats", seats, "pricePerSeat", price,
                "departureTime", tomorrowAt(9, 30));
    }

    // ── HTTP helpers ──

    protected Res get(String path, User as) throws Exception {
        return send(MockMvcRequestBuilders.get("/" + strip(path)), as, null);
    }

    protected Res post(String path, User as, Object body) throws Exception {
        return send(MockMvcRequestBuilders.post("/" + strip(path)), as, body);
    }

    protected Res put(String path, User as, Object body) throws Exception {
        return send(MockMvcRequestBuilders.put("/" + strip(path)), as, body);
    }

    protected Res patch(String path, User as, Object body) throws Exception {
        return send(MockMvcRequestBuilders.patch("/" + strip(path)), as, body);
    }

    protected Res delete(String path, User as) throws Exception {
        return send(MockMvcRequestBuilders.delete("/" + strip(path)), as, null);
    }

    private static String strip(String path) {
        return path.startsWith("/") ? path.substring(1) : path;
    }

    private Res send(MockHttpServletRequestBuilder req, User as, Object body) throws Exception {
        if (as != null) req.header("Authorization", "Bearer " + token(as));
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(
                body instanceof String s ? s : json.writeValueAsString(body));
        MvcResult r = mvc.perform(req).andReturn();
        String text = r.getResponse().getContentAsString();
        JsonNode node = text.isBlank() ? json.nullNode() : safeRead(text);
        return new Res(r.getResponse().getStatus(), node, text);
    }

    private JsonNode safeRead(String text) {
        try {
            return json.readTree(text);
        } catch (Exception e) {
            return json.nullNode();
        }
    }

    /** A response: status, parsed body, raw text. */
    public record Res(int status, JsonNode body, String text) {
        public JsonNode data() { return body.path("data"); }
        public String message() { return body.path("message").asText(); }
        public boolean ok() { return status >= 200 && status < 300; }
        public long id() { return data().path("id").asLong(); }
    }
}
