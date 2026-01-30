package com.codesync.codesync_realtime_service.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisPublisher {

    private final StringRedisTemplate redis;
    private final ChannelTopic topic;

    public void publish(String message) {
        redis.convertAndSend(topic.getTopic(), message);
    }
}
