package com.codesync.comment_service.controller;

import com.codesync.comment_service.dto.CommentResponse;
import com.codesync.comment_service.dto.CreateCommentRequest;
import com.codesync.comment_service.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService service;

    @PostMapping
    public CommentResponse create(
            @RequestBody @Valid CreateCommentRequest req,
            @RequestHeader("X-User-Id") UUID userId) {

        return service.create(req, userId);
    }

    @GetMapping("/session/{sessionId}")
    public List<CommentResponse> getBySession(
            @PathVariable UUID sessionId) {

        return service.getBySession(sessionId);
    }
}

