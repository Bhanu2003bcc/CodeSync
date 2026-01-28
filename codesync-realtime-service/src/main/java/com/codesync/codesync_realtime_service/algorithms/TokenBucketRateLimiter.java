package com.codesync.codesync_realtime_service.algorithms;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class TokenBucketRateLimiter {

    private static final int CAPACITY = 50;
    private static final int REFILL_PER_MINUTE = 50;

    private final StringRedisTemplate redis;

    public boolean allowRequest(String userId) {

        String key = "ws:ratelimit:" + userId;
        long now = System.currentTimeMillis();

        List<Object> result = redis.executePipelined((RedisCallback<Object>) conn -> {

            byte[] k = key.getBytes();

            byte[] tokensBytes = conn.hGet(k, "tokens".getBytes());
            byte[] lastRefillBytes = conn.hGet(k, "lastRefill".getBytes());

            int tokens = tokensBytes == null
                    ? CAPACITY
                    : Integer.parseInt(new String(tokensBytes));

            long lastRefill = lastRefillBytes == null
                    ? now
                    : Long.parseLong(new String(lastRefillBytes));

            long elapsedMs = now - lastRefill;
            int refillTokens =
                    (int) (elapsedMs * REFILL_PER_MINUTE / 60000);

            tokens = Math.min(CAPACITY, tokens + refillTokens);

            if (tokens <= 0) {
                return null;
            }

            tokens--;

            conn.hSet(k, "tokens".getBytes(),
                    String.valueOf(tokens).getBytes());

            conn.hSet(k, "lastRefill".getBytes(),
                    String.valueOf(now).getBytes());

            conn.expire(k, 120);

            return null;
        });

        return true;
    }
}
