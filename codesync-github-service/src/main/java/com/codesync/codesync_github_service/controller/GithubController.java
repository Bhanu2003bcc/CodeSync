package com.codesync.codesync_github_service.controller;

import com.codesync.codesync_github_service.dtos.CommitRequest;
import com.codesync.codesync_github_service.dtos.CreateBranchRequest;
import com.codesync.codesync_github_service.dtos.CreatePRRequest;
import com.codesync.codesync_github_service.dtos.FileNode;
import com.codesync.codesync_github_service.dtos.RepoInfo;
import com.codesync.codesync_github_service.service.GithubCommitService;
import com.codesync.codesync_github_service.service.GithubService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GithubController {
    private final GithubService service;
    private final GithubCommitService commitService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    /**
     * Fetch GitHub token from auth-service using user ID
     */
    private String getGitHubToken(String userId) {
        try {
            String url = authServiceUrl + "/api/auth/github-token/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("token")) {
                String token = (String) response.getBody().get("token");
                if (token != null && !token.isEmpty()) {
                    return token;
                }
            }
            throw new RuntimeException("No GitHub token found for user");
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch GitHub token: " + e.getMessage());
        }
    }

    @GetMapping("/repos")
    public List<RepoInfo> repos(@RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        return service.listRepos(githubToken);
    }

    @GetMapping("/files")
    public List<FileNode> files(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestParam(required = false) String path,
            @RequestHeader("X-User-Id") String userId) {

        String githubToken = getGitHubToken(userId);
        return service.listFiles(owner, repo, path, githubToken);
    }

    @GetMapping("/file")
    public String file(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestParam String path,
            @RequestHeader("X-User-Id") String userId) {

        String githubToken = getGitHubToken(userId);
        return service.loadFile(owner, repo, path, githubToken);
    }

    @PostMapping("/commit")
    public void commit(
            @RequestBody CommitRequest req,
            @RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        commitService.commit(req, githubToken);
    }

    @GetMapping("/branches")
    public List<Map> branches(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        return service.listBranches(owner, repo, githubToken);
    }

    @DeleteMapping("/file")
    public void deleteFile(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestParam String path,
            @RequestParam(defaultValue = "main") String branch,
            @RequestParam(defaultValue = "Delete file") String message,
            @RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        commitService.deleteFile(owner, repo, path, branch, message, githubToken);
    }

    @PostMapping("/pull-request")
    public Map createPullRequest(
            @RequestBody CreatePRRequest req,
            @RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        return service.createPullRequest(
                req.getOwner(),
                req.getRepo(),
                req.getTitle(),
                req.getHead(),
                req.getBase(),
                req.getBody(),
                githubToken);
    }

    @PostMapping("/branch")
    public Map createBranch(
            @RequestBody CreateBranchRequest req,
            @RequestHeader("X-User-Id") String userId) {
        String githubToken = getGitHubToken(userId);
        return service.createBranch(
                req.getOwner(),
                req.getRepo(),
                req.getNewBranchName(),
                req.getSourceBranch(),
                githubToken);
    }

}
