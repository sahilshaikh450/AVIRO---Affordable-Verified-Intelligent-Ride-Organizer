package com.aviro.security;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Small in-memory cache whose entries expire after a fixed time.
 * For per-request lookups that may be a few seconds stale (the user behind a token,
 * "this token is not revoked"); callers invalidate entries when the data changes.
 */
public class TtlCache<K, V> {

    private record Entry<V>(V value, long expiresAt) {}

    private final Map<K, Entry<V>> entries = new ConcurrentHashMap<>();
    private final long ttlMs;
    private final int maxEntries;

    public TtlCache(long ttlMs, int maxEntries) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }

    // Cached value, or loads and caches it; a null from the loader is not cached
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
        if (entries.size() >= maxEntries) entries.clear(); // rare; simpler than tracking least-recent use
        entries.put(key, new Entry<>(value, System.currentTimeMillis() + ttlMs));
    }

    public void invalidate(K key) {
        entries.remove(key);
    }
}
