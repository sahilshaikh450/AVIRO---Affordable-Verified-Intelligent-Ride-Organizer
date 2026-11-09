package com.aviro.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.aviro.security.TtlCache;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

class TtlCacheTest {

    @Test
    void loadsOnceThenServesFromCache() {
        TtlCache<String, String> cache = new TtlCache<>(60_000, 10);
        AtomicInteger loads = new AtomicInteger();
        assertThat(
                        cache.get(
                                "a",
                                k -> {
                                    loads.incrementAndGet();
                                    return "A";
                                }))
                .isEqualTo("A");
        assertThat(
                        cache.get(
                                "a",
                                k -> {
                                    loads.incrementAndGet();
                                    return "B";
                                }))
                .isEqualTo("A");
        assertThat(loads).hasValue(1);
    }

    @Test
    void entriesExpire() throws InterruptedException {
        TtlCache<String, String> cache = new TtlCache<>(30, 10);
        cache.put("a", "A");
        Thread.sleep(60);
        assertThat(cache.getIfPresent("a")).isNull();
    }

    @Test
    void nullFromTheLoaderIsNotCachedAndInvalidateRemoves() {
        TtlCache<String, String> cache = new TtlCache<>(60_000, 10);
        assertThat(cache.get("a", k -> null)).isNull();
        assertThat(cache.getIfPresent("a")).isNull();
        cache.put("b", "B");
        cache.invalidate("b");
        assertThat(cache.getIfPresent("b")).isNull();
    }
}
