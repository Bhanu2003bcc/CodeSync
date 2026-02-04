package com.codesync.codesync_review_session_service.service;

import com.codesync.codesync_review_session_service.model.Comment;
import com.codesync.codesync_review_session_service.repository.CommentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepo;

    /**
     * Add a new comment to a file line
     */
    public Comment addComment(
            UUID sessionId,
            String filePath,
            Integer lineNumber,
            String content,
            UUID authorId,
            String authorName) {

        Comment comment = Comment.builder()
                .sessionId(sessionId)
                .filePath(filePath)
                .lineNumber(lineNumber)
                .content(content)
                .authorId(authorId)
                .authorName(authorName)
                .createdAt(Instant.now())
                .parentId(null)
                .build();

        return commentRepo.save(comment);
    }

    /**
     * Add a reply to an existing comment
     */
    public Comment addReply(
            UUID parentId,
            String content,
            UUID authorId,
            String authorName) {

        Comment parent = commentRepo.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent comment not found"));

        Comment reply = Comment.builder()
                .sessionId(parent.getSessionId())
                .filePath(parent.getFilePath())
                .lineNumber(parent.getLineNumber())
                .content(content)
                .authorId(authorId)
                .authorName(authorName)
                .createdAt(Instant.now())
                .parentId(parentId)
                .build();

        return commentRepo.save(reply);
    }

    /**
     * Get all comments for a session (top-level only)
     */
    public List<Comment> getSessionComments(UUID sessionId) {
        return commentRepo.findBySessionIdAndParentIdIsNullOrderByCreatedAtAsc(sessionId);
    }

    /**
     * Get comments for a specific file
     */
    public List<Comment> getFileComments(UUID sessionId, String filePath) {
        return commentRepo.findBySessionIdAndFilePathAndParentIdIsNullOrderByLineNumberAsc(
                sessionId, filePath);
    }

    /**
     * Get replies to a comment
     */
    public List<Comment> getReplies(UUID commentId) {
        return commentRepo.findByParentIdOrderByCreatedAtAsc(commentId);
    }

    /**
     * Delete a comment and its replies
     */
    public void deleteComment(UUID commentId, UUID userId) {
        Comment comment = commentRepo.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        // Only author can delete their comment
        if (!comment.getAuthorId().equals(userId)) {
            throw new RuntimeException("Only the author can delete this comment");
        }

        // Delete all replies first
        List<Comment> replies = commentRepo.findByParentIdOrderByCreatedAtAsc(commentId);
        commentRepo.deleteAll(replies);

        // Delete the comment
        commentRepo.delete(comment);
    }
}
