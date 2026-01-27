package com.codesync.codesync_realtime_service.config;

import com.codesync.codesync_realtime_service.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * STOMP Channel Interceptor that extracts user identity from JWT token
 * and injects it into message headers for downstream controllers.
 */
@Component
public class AuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(AuthChannelInterceptor.class);
    private static final String USERNAME_HEADER = "X-Username";
    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        // Handle STOMP CONNECT - extract JWT and store user info in session
        if (StompCommand.CONNECT.equals(command)) {
            handleConnect(accessor);
        }

        // Handle STOMP SEND - inject user headers from session
        if (StompCommand.SEND.equals(command)) {
            injectUserHeaders(accessor);
        }

        return message;
    }

    /**
     * On CONNECT, extract JWT from Authorization header and store user info in
     * session attributes.
     */
    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                String username = JwtUtil.getUsername(token);
                String userId = JwtUtil.getUserId(token);

                // Store in session attributes for later use
                Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                if (sessionAttributes != null) {
                    sessionAttributes.put(USERNAME_HEADER, username);
                    sessionAttributes.put(USER_ID_HEADER, userId);
                    accessor.setSessionAttributes(sessionAttributes);
                }

                logger.info("✅ STOMP CONNECT authenticated: username={}, userId={}", username, userId);

            } catch (Exception e) {
                logger.error("❌ Failed to parse JWT token: {}", e.getMessage());
            }
        } else {
            logger.warn("⚠️ STOMP CONNECT without Authorization header");
        }
    }

    /**
     * On SEND, inject X-Username and X-User-Id headers from session attributes.
     */
    private void injectUserHeaders(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();

        if (sessionAttributes != null) {
            String username = (String) sessionAttributes.get(USERNAME_HEADER);
            String userId = (String) sessionAttributes.get(USER_ID_HEADER);

            if (username != null) {
                accessor.setNativeHeader(USERNAME_HEADER, username);
                logger.debug("Injected {}: {}", USERNAME_HEADER, username);
            }

            if (userId != null) {
                accessor.setNativeHeader(USER_ID_HEADER, userId);
                logger.debug("Injected {}: {}", USER_ID_HEADER, userId);
            }
        }
    }
}
