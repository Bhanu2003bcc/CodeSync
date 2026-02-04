package com.codesync.codesync_review_session_service.controller;

import com.codesync.codesync_review_session_service.dto.AddCommentRequest;
import com.codesync.codesync_review_session_service.dto.AddReplyRequest;
import com.codesync.codesync_review_session_service.model.Comment;
import com.codesync.codesync_review_session_service.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{sessionId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * Get all comments for a session
     */
    @GetMapping
    public List<Comment> getComments(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) String filePath) {

        if (filePath != null && !filePath.isEmpty()) {
            return commentService.getFileComments(sessionId, filePath);
        }
        return commentService.getSessionComments(sessionId);
    }

    /**
     * Add a new comment
     */
    @PostMapping
    public Comment addComment(
            @PathVariable UUID sessionId,
            @RequestBody AddCommentRequest req,
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader(value = "X-Username", required = false) String username) {

        return commentService.addComment(
                sessionId,
                req.getFilePath(),
                req.getLineNumber(),
                req.getContent(),
                userId,
                username != null ? username : "User");
    }

    /**
     * Add a reply to an existing comment
     */
    @PostMapping("/reply")
    public Comment addReply(
            @PathVariable UUID sessionId,
            @RequestBody AddReplyRequest req,
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader(value = "X-Username", required = false) String username) {

        return commentService.addReply(
                req.getParentId(),
                req.getContent(),
                userId,
                username != null ? username : "User");
    }

    /**
     * Get replies to a comment
     */
    @GetMapping("/{commentId}/replies")
    public List<Comment> getReplies(
            @PathVariable UUID sessionId,
            @PathVariable UUID commentId) {

        return commentService.getReplies(commentId);
    }

    /**
     * Delete a comment
     */
    @DeleteMapping("/{commentId}")
    public void deleteComment(
            @PathVariable UUID sessionId,
            @PathVariable UUID commentId,
            @RequestHeader("X-User-Id") UUID userId) {

        commentService.deleteComment(commentId, userId);
    }
}
