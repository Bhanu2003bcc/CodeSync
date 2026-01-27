package com.codesync.comment_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCommentRequest {
    @NotNull
    private UUID sessionId;

    @NotBlank
    private String filePath;

    private int lineNumber;

    @NotBlank
    private String content;

    private UUID parentCommentId;
}
