package com.codesync.codesync_realtime_service.controller;

import com.codesync.codesync_realtime_service.algorithms.BloomFilter;
import com.codesync.codesync_realtime_service.model.WsEvent;
import com.codesync.codesync_realtime_service.ratelimit.TokenBucketRateLimiter;
import com.codesync.codesync_realtime_service.model.CommentCreatePayload;
import com.codesync.codesync_realtime_service.model.CursorPayload;
import com.codesync.codesync_realtime_service.presence.PresenceTracker;
import com.codesync.codesync_realtime_service.realtime.RedisPublisher;
import com.codesync.codesync_realtime_service.realtime.SnapshotPublisher;
import com.codesync.codesync_realtime_service.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class RealTimeMessageController {

        private final RedisPublisher redisPublisher;
        private final TokenBucketRateLimiter rateLimiter;
        private final BloomFilter bloomFilter;
        private final PresenceTracker presenceTracker;
        private final RestTemplate restTemplate;
        private final SnapshotPublisher snapshotPublisher;

        private static final String COMMENT_SERVICE_URL = "http://localhost:8085/api/comments";

        // =========================================================
        // JOIN SESSION
        // =========================================================

        @MessageMapping("/session/{sessionId}/join")
        public void joinSession(
                        @DestinationVariable UUID sessionId,
                        @Header(value = "X-Username") String username) {
                System.out.println("This is username " + username);
                presenceTracker.userJoined(sessionId, username);

                // messagingTemplate.convertAndSend(
                // "/topic/session/" + sessionId,
                // (Object) Map.of(
                // "type", "USER_JOINED",
                // "username", username
                // )
                // );
                String dest = "/topic/session/" + sessionId;

                WsEvent event = new WsEvent();
                event.setDestination(dest);
                event.setPayload(
                                JsonUtil.toJson(
                                                Map.of(
                                                                "type", "USER_JOINED",
                                                                "username", username)));

                redisPublisher.publish(JsonUtil.toJson(event));
        }

        // =========================================================
        // CURSOR UPDATE
        // =========================================================

        @MessageMapping("/session/{sessionId}/cursor")
        public void cursorUpdate(
                        @DestinationVariable UUID sessionId,
                        CursorPayload payload,
                        @Header("X-Username") String username) {
                System.out.println("CURSOR HANDLER HIT");
                if (!rateLimiter.allowRequest(username))
                        return;

                // messagingTemplate.convertAndSend(
                // "/topic/session/" + sessionId + "/cursor",
                // (Object) Map.of(
                // "username", username,
                // "cursor", payload
                // )
                // );

                String dest = "/topic/session/" + sessionId + "/cursor";

                WsEvent event = new WsEvent();
                event.setDestination(dest);
                event.setPayload(
                                JsonUtil.toJson(
                                                Map.of(
                                                                "username", username,
                                                                "cursor", payload)));

                redisPublisher.publish(JsonUtil.toJson(event));
        }

        // Comment Service take info as input from here

        // =========================================================
        // CREATE COMMENT
        // =========================================================

        @MessageMapping("/session/{sessionId}/comment")
        public void createComment(
                        @DestinationVariable UUID sessionId,
                        CommentCreatePayload payload,
                        @Header("X-User-Id") String userId) {

                if (!rateLimiter.allowRequest(userId))
                        return;

                /*
                 * Used for
                 * Bloom filters normally don’t expire.
                 * But we want short-window dedupe.
                 * We wrap Bloom key with Redis TTL:
                 */
                String fingerprint = userId + ":" + sessionId + ":" + payload.getContent();

                if (bloomFilter.mightContain(fingerprint)) {
                        return;
                }

                bloomFilter.add(fingerprint);

                payload.setSessionId(sessionId);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-User-Id", userId); // internal trust

                HttpEntity<CommentCreatePayload> request = new HttpEntity<>(payload, headers);

                ResponseEntity<String> response = restTemplate.postForEntity(
                                COMMENT_SERVICE_URL,
                                request,
                                String.class);

                // messagingTemplate.convertAndSend(
                // "/topic/session/" + sessionId + "/comments",
                // response.getBody()
                // );
                String dest = "/topic/session/" + sessionId + "/comments";

                WsEvent event = new WsEvent();
                event.setDestination(dest);
                event.setPayload(response.getBody());

                System.out.println("PUBLISHING CURSOR EVENT");
                redisPublisher.publish(JsonUtil.toJson(event));
        }

        @MessageMapping("/session/{sessionId}/doc")
        public void docUpdate(
                        @DestinationVariable UUID sessionId,
                        String base64Update) {

                System.out.println("DOC UPDATE RECEIVED for session: " + sessionId);

                if (base64Update == null || base64Update.isEmpty()) {
                        System.out.println("Empty update received, skipping");
                        return;
                }

                try {
                        // Decode Base64 to bytes (client sends Base64 because STOMP/SockJS can't handle
                        // binary)
                        byte[] update = Base64.getDecoder().decode(base64Update);

                        System.out.println("Decoded update size: " + update.length + " bytes");

                        // Save to document service
                        snapshotPublisher.save(sessionId, update);

                        // Broadcast to other clients (already Base64 encoded for response)
                        String dest = "/topic/session/" + sessionId + "/doc";

                        WsEvent event = new WsEvent();
                        event.setDestination(dest);
                        event.setPayload(base64Update); // Forward the same Base64 string

                        redisPublisher.publish(JsonUtil.toJson(event));

                        System.out.println("Published doc update to: " + dest);
                } catch (Exception e) {
                        System.err.println("Failed to process doc update: " + e.getMessage());
                        e.printStackTrace();
                }
        }

        @MessageMapping("/session/{sessionId}/load")
        public void loadDoc(
                        @DestinationVariable UUID sessionId) {

                byte[] snapshot = restTemplate.getForObject(
                                "http://localhost:8087/api/documents/" + sessionId,
                                byte[].class);

                if (snapshot != null) {
                        String dest = "/topic/session/" + sessionId + "/doc";

                        WsEvent event = new WsEvent();
                        event.setDestination(dest);
                        event.setPayload(
                                        Base64.getEncoder().encodeToString(snapshot));

                        redisPublisher.publish(JsonUtil.toJson(event));
                }
        }

}
