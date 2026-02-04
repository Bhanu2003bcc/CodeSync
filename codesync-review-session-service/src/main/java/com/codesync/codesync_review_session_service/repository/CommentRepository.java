package com.codesync.codesync_review_session_service.repository;

import com.codesync.codesync_review_session_service.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    // Get all top-level comments for a session
    List<Comment> findBySessionIdAndParentIdIsNullOrderByCreatedAtAsc(UUID sessionId);

    // Get comments for a specific file and line
    List<Comment> findBySessionIdAndFilePathAndLineNumberAndParentIdIsNull(
            UUID sessionId, String filePath, Integer lineNumber);

    // Get comments for a specific file
    List<Comment> findBySessionIdAndFilePathAndParentIdIsNullOrderByLineNumberAsc(
            UUID sessionId, String filePath);

    // Get replies to a comment
    List<Comment> findByParentIdOrderByCreatedAtAsc(UUID parentId);

    // Get all comments for a session (including replies)
    List<Comment> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
