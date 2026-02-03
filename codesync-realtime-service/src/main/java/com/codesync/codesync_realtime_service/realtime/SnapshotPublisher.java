package com.codesync.codesync_realtime_service.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SnapshotPublisher {

    private final RestTemplate restTemplate;

    private static final String DOC_URL = "http://localhost:8087/api/documents/";

    public void save(UUID sessionId, byte[] snapshot) {
        if (snapshot == null || snapshot.length == 0) {
            log.warn("Attempted to save empty snapshot for session {}", sessionId);
            return;
        }

        try {
            // Set proper Content-Type for binary data
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

            HttpEntity<byte[]> request = new HttpEntity<>(snapshot, headers);

            restTemplate.postForEntity(
                    DOC_URL + sessionId,
                    request,
                    Void.class);

            log.info("Saved snapshot for session {}, size: {} bytes", sessionId, snapshot.length);
        } catch (Exception e) {
            log.error("Failed to save snapshot for session {}: {}", sessionId, e.getMessage());
        }
    }
}
