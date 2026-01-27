package com.codesync.comment_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CommentResponse {
    private UUID id;
    private UUID sessionId;
    private UUID userId;
    private String filePath;
    private int lineNumber;
    private String content;
    private UUID parentCommentId;
    private Instant createdAt;
}
