package com.codesync.codesync_document_service.controller;

import com.codesync.codesync_document_service.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService service;

    @PostMapping(value = "/{sessionId}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Void> save(
            @PathVariable UUID sessionId,
            @RequestBody byte[] snapshot) {

        if (snapshot == null || snapshot.length == 0) {
            log.warn("Received empty snapshot for session {}", sessionId);
            return ResponseEntity.badRequest().build();
        }

        try {
            service.save(sessionId, snapshot);
            log.info("Saved snapshot for session {}, size: {} bytes", sessionId, snapshot.length);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to save snapshot for session {}: {}", sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping(value = "/{sessionId}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> load(@PathVariable UUID sessionId) {
        try {
            byte[] snapshot = service.load(sessionId);

            if (snapshot == null) {
                log.info("No snapshot found for session {}", sessionId);
                return ResponseEntity.noContent().build();
            }

            log.info("Loaded snapshot for session {}, size: {} bytes", sessionId, snapshot.length);
            return ResponseEntity.ok(snapshot);
        } catch (Exception e) {
            log.error("Failed to load snapshot for session {}: {}", sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
