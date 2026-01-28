package com.codesync.codesync_realtime_service.model;

import lombok.Data;

import java.util.UUID;

@Data
public class CommentCreatePayload {
    private UUID sessionId;
    private String filePath;
    private int lineNumber;
    private String content;
    private UUID parentCommentId;
}
