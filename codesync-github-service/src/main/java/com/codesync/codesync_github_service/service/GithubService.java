package com.codesync.codesync_github_service.service;

import com.codesync.codesync_github_service.dtos.FileNode;
import com.codesync.codesync_github_service.dtos.RepoInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GithubService {
        private final WebClient github;

        public List<RepoInfo> listRepos(String token) {
                return github.get()
                                .uri("/user/repos")
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToFlux(RepoInfo.class)
                                .collectList()
                                .block();
        }

        public List<FileNode> listFiles(
                        String owner,
                        String repo,
                        String path,
                        String token) {

                String uri = (path == null || path.isEmpty())
                                ? "/repos/{o}/{r}/contents"
                                : "/repos/{o}/{r}/contents/{p}";

                return github.get()
                                .uri(uri, owner, repo, path)
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToFlux(FileNode.class)
                                .collectList()
                                .block();
        }

        public String loadFile(
                        String owner,
                        String repo,
                        String path,
                        String token) {

                Map res = github.get()
                                .uri("/repos/{o}/{r}/contents/{p}",
                                                owner, repo, path)
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String encoded = (String) res.get("content");
                // GitHub returns base64 with newlines, remove them before decoding
                String cleanedBase64 = encoded.replaceAll("\\s+", "");
                return new String(
                                Base64.getDecoder().decode(cleanedBase64));
        }

        /**
         * List all branches of a repository
         */
        public List<Map> listBranches(String owner, String repo, String token) {
                return github.get()
                                .uri("/repos/{o}/{r}/branches", owner, repo)
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToFlux(Map.class)
                                .collectList()
                                .block();
        }

        /**
         * Create a pull request
         */
        public Map createPullRequest(
                        String owner,
                        String repo,
                        String title,
                        String head,
                        String base,
                        String body,
                        String token) {

                try {
                        return github.post()
                                        .uri("/repos/{o}/{r}/pulls", owner, repo)
                                        .header("Authorization", "Bearer " + token)
                                        .bodyValue(Map.of(
                                                        "title", title,
                                                        "head", head,
                                                        "base", base,
                                                        "body", body != null ? body : ""))
                                        .retrieve()
                                        .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                                        response -> response.bodyToMono(String.class)
                                                                        .flatMap(errorBody -> {
                                                                                throw new RuntimeException(
                                                                                                "GitHub API error: "
                                                                                                                + errorBody);
                                                                        }))
                                        .bodyToMono(Map.class)
                                        .block();
                } catch (Exception e) {
                        throw new RuntimeException("Failed to create PR: " + e.getMessage(), e);
                }
        }

        /**
         * Create a new branch from an existing branch
         */
        public Map createBranch(
                        String owner,
                        String repo,
                        String newBranchName,
                        String sourceBranch,
                        String token) {

                try {
                        // Step 1: Get the SHA of the source branch
                        Map branchInfo = github.get()
                                        .uri("/repos/{o}/{r}/git/ref/heads/{branch}", owner, repo, sourceBranch)
                                        .header("Authorization", "Bearer " + token)
                                        .retrieve()
                                        .bodyToMono(Map.class)
                                        .block();

                        Map object = (Map) branchInfo.get("object");
                        String sha = (String) object.get("sha");

                        // Step 2: Create a new ref (branch) pointing to that SHA
                        Map result = github.post()
                                        .uri("/repos/{o}/{r}/git/refs", owner, repo)
                                        .header("Authorization", "Bearer " + token)
                                        .bodyValue(Map.of(
                                                        "ref", "refs/heads/" + newBranchName,
                                                        "sha", sha))
                                        .retrieve()
                                        .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                                        response -> response.bodyToMono(String.class)
                                                                        .flatMap(errorBody -> {
                                                                                throw new RuntimeException(
                                                                                                "GitHub API error: "
                                                                                                                + errorBody);
                                                                        }))
                                        .bodyToMono(Map.class)
                                        .block();

                        return Map.of(
                                        "name", newBranchName,
                                        "sha", sha,
                                        "success", true);
                } catch (Exception e) {
                        throw new RuntimeException("Failed to create branch: " + e.getMessage(), e);
                }
        }
}
