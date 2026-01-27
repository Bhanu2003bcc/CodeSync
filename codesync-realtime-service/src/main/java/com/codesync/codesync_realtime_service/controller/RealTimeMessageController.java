package com.codesync.codesync_realtime_service.controller;

import com.codesync.codesync_realtime_service.model.CursorPayload;
import com.codesync.codesync_realtime_service.presence.PresenceTracker;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class RealTimeMessageController {

    private final SimpMessagingTemplate messagingTemplate;
    private final PresenceTracker presenceTracker;

    @MessageMapping("/session/{sessionId}/join")
    public void joinSession(
            @DestinationVariable UUID sessionId,
            // not strictly asking for X-username
            @Header(value = "X-Username") String username) {
        System.out.println("This is username" +username);
        presenceTracker.userJoined(sessionId, username);

        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId,
                (Object) Map.of(
                        "type", "USER_JOINED",
                        "username", username
                )
        );
    }

    @MessageMapping("/session/{sessionId}/cursor")
    public void cursorUpdate(
            @DestinationVariable UUID sessionId,
            CursorPayload payload,
            @Header("X-Username") String username) {

        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/cursor",
                (Object) Map.of(
                        "username", username,
                        "cursor", payload
                )
        );
    }
}
