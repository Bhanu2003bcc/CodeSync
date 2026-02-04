package com.codesync.codesync_github_service.dtos;

import lombok.Data;

@Data
public class CommitRequest {
    private String owner;
    private String repo;
    private String branch;
    private String path;
    private String content;
    private String message;
}
