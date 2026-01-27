package com.codesync.codesync_realtime_service.event;

import com.codesync.codesync_realtime_service.presence.PresenceTracker;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {
    private final PresenceTracker presenceTracker;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        // Later: clean presence
    }
}
