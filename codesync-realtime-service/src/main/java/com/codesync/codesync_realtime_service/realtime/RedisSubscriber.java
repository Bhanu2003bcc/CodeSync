package com.codesync.codesync_realtime_service.realtime;

import com.codesync.codesync_realtime_service.model.WsEvent;
import com.codesync.codesync_realtime_service.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisSubscriber {

    private final SimpMessagingTemplate messagingTemplate;

    public void onMessage(String message) {
        System.out.println("REDIS EVENT RECEIVED: " + message.substring(0, Math.min(100, message.length())) + "...");

        try {
            WsEvent event = JsonUtil.fromJson(message, WsEvent.class);

            System.out.println("Broadcasting to destination: " + event.getDestination());
            System.out.println("Payload length: " + (event.getPayload() != null ? event.getPayload().length() : 0));

            messagingTemplate.convertAndSend(
                    event.getDestination(),
                    event.getPayload());

            System.out.println("Message sent to WebSocket clients");
        } catch (Exception e) {
            System.err.println("Failed to process Redis message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
