package com.codesync.codesync_realtime_service.presence;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PresenceTracker {
    private final Map<UUID, Set<String>> sessionUsers = new ConcurrentHashMap<>();

    public void userJoined(UUID sessionId, String username) {
        sessionUsers
                .computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet())
                .add(username);
    }

    public void userLeft(UUID sessionId, String username) {
        Set<String> users = sessionUsers.get(sessionId);
        if (users != null) {
            users.remove(username);
        }
    }

    public Set<String> getUsers(UUID sessionId) {
        return sessionUsers.getOrDefault(sessionId, Set.of());
    }
}
