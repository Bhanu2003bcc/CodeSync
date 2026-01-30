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
        System.out.println("REDIS EVENT RECEIVED");
        WsEvent event =
                JsonUtil.fromJson(message, WsEvent.class);

        messagingTemplate.convertAndSend(
                event.getDestination(),
                event.getPayload()
        );
    }
}
