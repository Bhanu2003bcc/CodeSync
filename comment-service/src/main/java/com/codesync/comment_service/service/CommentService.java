package com.codesync.comment_service.service;

import com.codesync.comment_service.dto.CommentResponse;
import com.codesync.comment_service.dto.CreateCommentRequest;
import com.codesync.comment_service.model.Comment;
import com.codesync.comment_service.repository.CommentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository repository;

    public CommentResponse create(CreateCommentRequest req, UUID userId) {

        Comment comment = Comment.builder()
                .sessionId(req.getSessionId())
                .userId(userId)
                .filePath(req.getFilePath())
                .lineNumber(req.getLineNumber())
                .content(req.getContent())
                .parentCommentId(req.getParentCommentId())
                .createdAt(Instant.now())
                .build();

        repository.save(comment);

        return toResponse(comment);
    }

    public List<CommentResponse> getBySession(UUID sessionId) {
        return repository.findBySessionId(sessionId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private CommentResponse toResponse(Comment c) {
        return CommentResponse.builder()
                .id(c.getId())
                .sessionId(c.getSessionId())
                .userId(c.getUserId())
                .filePath(c.getFilePath())
                .lineNumber(c.getLineNumber())
                .content(c.getContent())
                .parentCommentId(c.getParentCommentId())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
