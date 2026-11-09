package com.aviro.security;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

public class TtlCache<K, V> {

    private record Entry<V>(V value, long expiresAt) {}

    private final Map<K, Entry<V>> entries = new ConcurrentHashMap<>();
    private final long ttlMs;
    private final int maxEntries;

    public TtlCache(long ttlMs, int maxEntries) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }

    public V get(K key, Function<K, V> loader) {
        V cached = getIfPresent(key);
        if (cached != null) return cached;
        V value = loader.apply(key);
        if (value != null) put(key, value);
        return value;
    }

    public V getIfPresent(K key) {
        Entry<V> e = entries.get(key);
        return e != null && e.expiresAt() > System.currentTimeMillis() ? e.value() : null;
    }

    public void put(K key, V value) {
        if (entries.size() >= maxEntries) entries.clear();
        entries.put(key, new Entry<>(value, System.currentTimeMillis() + ttlMs));
    }

    public void invalidate(K key) {
        entries.remove(key);
    }

    public void clear() {
        entries.clear();
    }
}
