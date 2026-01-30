package com.codesync.codesync_realtime_service.config;

import com.codesync.codesync_realtime_service.realtime.RedisSubscriber;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

@Configuration
public class RedisPubSubConfig {

    @Bean
    public ChannelTopic sessionTopic() {
        return new ChannelTopic("codesync:realtime");
    }

    @Bean
    public RedisMessageListenerContainer container(
            RedisConnectionFactory factory,
            MessageListenerAdapter adapter,
            ChannelTopic topic) {

        RedisMessageListenerContainer container =
                new RedisMessageListenerContainer();

        container.setConnectionFactory(factory);
        container.addMessageListener(adapter, topic);
        return container;
    }

    @Bean
    public MessageListenerAdapter messageListenerAdapter(
            RedisSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "onMessage");
    }
}
