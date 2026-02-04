package com.codesync.codesync_github_service.dtos;

import lombok.Data;

@Data
public class CreatePRRequest {
    private String owner;
    private String repo;
    private String title;
    private String head; // Source branch
    private String base; // Target branch
    private String body; // PR description
}
