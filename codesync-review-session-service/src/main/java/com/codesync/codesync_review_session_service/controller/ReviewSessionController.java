package com.codesync.codesync_review_session_service.controller;

import com.codesync.codesync_review_session_service.dto.AddParticipantRequest;
import com.codesync.codesync_review_session_service.dto.CreateSessionRequest;
import com.codesync.codesync_review_session_service.model.ReviewSession;
import com.codesync.codesync_review_session_service.service.ReviewSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class ReviewSessionController {

    private final ReviewSessionService service;

    @PostMapping
    public ReviewSession create(
            @RequestBody @Valid CreateSessionRequest req,
            @RequestHeader("X-User-Id") UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user ID");
        }

        return service.create(req, userId);
    }

    @GetMapping
    public List<ReviewSession> list(
            @RequestHeader("X-User-Id") UUID userId) {
        return service.listForUser(userId);
    }

    @PostMapping("/{id}/participants")
    public void addParticipant(
            @PathVariable UUID id,
            @RequestBody AddParticipantRequest req,
            @RequestHeader("X-User-Id") UUID userId) {
        service.addParticipant(id, userId, req.getUserId());
    }

    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        service.deleteSession(id, userId);
    }

    @GetMapping("/{id}")
    public ReviewSession getSession(@PathVariable UUID id) {
        return service.getSession(id);
    }

}
