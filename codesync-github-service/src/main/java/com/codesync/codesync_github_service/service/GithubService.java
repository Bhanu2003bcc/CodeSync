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
            String token) {

        return github.get()
                .uri("/repos/{o}/{r}/contents", owner, repo)
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
        return new String(
                Base64.getDecoder().decode(encoded)
        );
    }
}
