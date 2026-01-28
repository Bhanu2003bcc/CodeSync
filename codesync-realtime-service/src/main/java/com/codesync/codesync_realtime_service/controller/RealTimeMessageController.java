package com.codesync.codesync_realtime_service.controller;

import com.codesync.codesync_realtime_service.algorithms.BloomFilter;
import com.codesync.codesync_realtime_service.algorithms.TokenBucketRateLimiter;
import com.codesync.codesync_realtime_service.model.CommentCreatePayload;
import com.codesync.codesync_realtime_service.model.CursorPayload;
import com.codesync.codesync_realtime_service.presence.PresenceTracker;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class RealTimeMessageController {

    private final TokenBucketRateLimiter rateLimiter;
    private final BloomFilter bloomFilter;
    private final SimpMessagingTemplate messagingTemplate;
    private final PresenceTracker presenceTracker;
    private final RestTemplate restTemplate;
    private static final String COMMENT_SERVICE_URL =
            "http://localhost:8085/api/comments";

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

        if (!rateLimiter.allowRequest(username)) return;

        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/cursor",
                (Object) Map.of(
                        "username", username,
                        "cursor", payload
                )
        );
    }

    // Comment Service take info as input from here

    @MessageMapping("/session/{sessionId}/comment")
    public void createComment(
            @DestinationVariable UUID sessionId,
            CommentCreatePayload payload,
            @Header("X-User-Id") String userId) {

        if (!rateLimiter.allowRequest(userId)) return;

        /* Used for
            Bloom filters normally don’t expire.
            But we want short-window dedupe.
            We wrap Bloom key with Redis TTL:
        */
        String fingerprint =
                userId + ":" + sessionId + ":" + payload.getContent();

        if (bloomFilter.mightContain(fingerprint)) {
            return;
        }

        bloomFilter.add(fingerprint);

        payload.setSessionId(sessionId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId); // internal trust

        HttpEntity<CommentCreatePayload> request =
                new HttpEntity<>(payload, headers);

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        COMMENT_SERVICE_URL,
                        request,
                        String.class
                );

        messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId + "/comments",
                response.getBody()
        );
    }
}
