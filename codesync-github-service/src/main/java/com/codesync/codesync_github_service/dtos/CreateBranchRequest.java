package com.codesync.codesync_github_service.dtos;

import lombok.Data;

@Data
public class CreateBranchRequest {
    private String owner;
    private String repo;
    private String newBranchName;
    private String sourceBranch;
}
