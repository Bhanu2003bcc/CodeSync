package com.codesync.codesync_github_service.service;

import com.codesync.codesync_github_service.dtos.CommitRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GithubCommitService {

        private final WebClient github;

        public void commit(
                        CommitRequest req,
                        String token) {

                // 1. Create blob
                Map blob = github.post()
                                .uri("/repos/{o}/{r}/git/blobs",
                                                req.getOwner(), req.getRepo())
                                .header("Authorization", "Bearer " + token)
                                .bodyValue(Map.of(
                                                "content", req.getContent(),
                                                "encoding", "utf-8"))
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String blobSha = (String) blob.get("sha");

                // 2. Get branch ref
                Map ref = github.get()
                                .uri("/repos/{o}/{r}/git/ref/heads/{b}",
                                                req.getOwner(), req.getRepo(),
                                                req.getBranch())
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String commitSha = (String) ((Map) ref.get("object"))
                                .get("sha");

                // 3. Get commit tree
                Map commit = github.get()
                                .uri("/repos/{o}/{r}/git/commits/{sha}",
                                                req.getOwner(), req.getRepo(),
                                                commitSha)
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String treeSha = (String) ((Map) commit.get("tree"))
                                .get("sha");

                // 4. Create tree
                Map tree = github.post()
                                .uri("/repos/{o}/{r}/git/trees",
                                                req.getOwner(), req.getRepo())
                                .header("Authorization", "Bearer " + token)
                                .bodyValue(Map.of(
                                                "base_tree", treeSha,
                                                "tree", List.of(
                                                                Map.of(
                                                                                "path", req.getPath(),
                                                                                "mode", "100644",
                                                                                "type", "blob",
                                                                                "sha", blobSha))))
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String newTreeSha = (String) tree.get("sha");

                // 5. Create commit
                Map newCommit = github.post()
                                .uri("/repos/{o}/{r}/git/commits",
                                                req.getOwner(), req.getRepo())
                                .header("Authorization", "Bearer " + token)
                                .bodyValue(Map.of(
                                                "message", req.getMessage(),
                                                "tree", newTreeSha,
                                                "parents", List.of(commitSha)))
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String newCommitSha = (String) newCommit.get("sha");

                // 6. Update ref
                github.patch()
                                .uri("/repos/{o}/{r}/git/refs/heads/{b}",
                                                req.getOwner(), req.getRepo(),
                                                req.getBranch())
                                .header("Authorization", "Bearer " + token)
                                .bodyValue(Map.of(
                                                "sha", newCommitSha))
                                .retrieve()
                                .bodyToMono(Void.class)
                                .block();
        }

        /**
         * Delete a file from the repository
         */
        public void deleteFile(
                        String owner,
                        String repo,
                        String path,
                        String branch,
                        String message,
                        String token) {

                // 1. Get the file SHA first
                Map fileInfo = github.get()
                                .uri("/repos/{o}/{r}/contents/{p}?ref={b}",
                                                owner, repo, path, branch)
                                .header("Authorization", "Bearer " + token)
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();

                String fileSha = (String) fileInfo.get("sha");

                // 2. Delete the file
                github.method(org.springframework.http.HttpMethod.DELETE)
                                .uri("/repos/{o}/{r}/contents/{p}",
                                                owner, repo, path)
                                .header("Authorization", "Bearer " + token)
                                .bodyValue(Map.of(
                                                "message", message,
                                                "sha", fileSha,
                                                "branch", branch))
                                .retrieve()
                                .bodyToMono(Map.class)
                                .block();
        }
}
