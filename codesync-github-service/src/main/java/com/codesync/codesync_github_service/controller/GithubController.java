package com.codesync.codesync_github_service.controller;

import com.codesync.codesync_github_service.dtos.FileNode;
import com.codesync.codesync_github_service.dtos.RepoInfo;
import com.codesync.codesync_github_service.service.GithubService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GithubController {
    private final GithubService service;

    @GetMapping("/repos")
    public List<RepoInfo> repos(
            @RequestHeader("Authorization") String token) {

        return service.listRepos(token.replace("Bearer ",""));
    }

    @GetMapping("/files")
    public List<FileNode> files(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestHeader("Authorization") String token) {

        return service.listFiles(
                owner, repo,
                token.replace("Bearer ","")
        );
    }

    @GetMapping("/file")
    public String file(
            @RequestParam String owner,
            @RequestParam String repo,
            @RequestParam String path,
            @RequestHeader("Authorization") String token) {

        return service.loadFile(
                owner, repo, path,
                token.replace("Bearer ","")
        );
    }
}
