package com.codesync.codesync_realtime_service.algorithms;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class BloomFilter {

    private static final int SIZE = 1_000_000; // bits
    private static final int HASH_COUNT = 5;

    private final StringRedisTemplate redis;

    private String key = "codesync:bloom:comments";

    @PostConstruct
    public void init() {
        redis.expire(key, Duration.ofSeconds(5));
    }

    public boolean mightContain(String value) {
        for (int i = 0; i < HASH_COUNT; i++) {
            long hash = hash(value, i);
            if (!redis.opsForValue().getBit(key, hash)) {
                return false;
            }
        }
        return true;
    }

    public void add(String value) {
        for (int i = 0; i < HASH_COUNT; i++) {
            long hash = hash(value, i);
            redis.opsForValue().setBit(key, hash, true);
        }
    }

    private long hash(String value, int seed) {
        return Math.abs(
                MurmurHash3.hash32(value + seed)
        ) % SIZE;
    }
}
