package com.aviro.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttemptCounter {

    private static final int MAX_LOCAL_KEYS = 100_000;

    private final StringRedisTemplate redis;
    private final Map<String, long[]> local = new ConcurrentHashMap<>();

    public long increment(String key, Duration window) {
        long windowMs = window.toMillis();
        String windowKey = key + ":" + (System.currentTimeMillis() / windowMs);
        try {
            Long count = redis.opsForValue().increment(windowKey);
            if (count != null && count == 1) {
                redis.expire(windowKey, window);
            }
            if (count != null) {
                return count;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable, counting {} in memory: {}", key, e.getMessage());
        }
        return incrementLocally(windowKey, windowMs);
    }

    public long current(String key, Duration window) {
        long windowMs = window.toMillis();
        String windowKey = key + ":" + (System.currentTimeMillis() / windowMs);
        try {
            String value = redis.opsForValue().get(windowKey);
            if (value != null) {
                return Long.parseLong(value);
            }
        } catch (Exception e) {
            log.debug("Redis unavailable, reading {} from memory", key);
        }
        long[] entry = local.get(windowKey);
        return entry == null || entry[1] < System.currentTimeMillis() ? 0 : entry[0];
    }

    public void reset(String key, Duration window) {
        String windowKey = key + ":" + (System.currentTimeMillis() / window.toMillis());
        local.remove(windowKey);
        try {
            redis.delete(windowKey);
        } catch (Exception e) {
            log.debug("Redis unavailable while resetting {}", key);
        }
    }

    public long secondsLeftInWindow(Duration window) {
        long windowMs = window.toMillis();
        long end = (System.currentTimeMillis() / windowMs + 1) * windowMs;
        return Math.max(1, (end - System.currentTimeMillis()) / 1000);
    }

    private long incrementLocally(String windowKey, long windowMs) {
        long now = System.currentTimeMillis();
        if (local.size() > MAX_LOCAL_KEYS) {
            local.entrySet().removeIf(e -> e.getValue()[1] < now);
        }
        long[] entry =
                local.compute(
                        windowKey,
                        (k, old) -> {
                            if (old == null || old[1] < now) {
                                return new long[] {1, now + windowMs};
                            }
                            old[0]++;
                            return old;
                        });
        return entry[0];
    }
}
