package com.codesync.codesync_review_session_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSessionRequest {
    @NotBlank
    private String repoUrl;
    @NotBlank
    private String baseBranch;
    @NotBlank
    private String compareBranch;
    private String title;
    private String description;
}
