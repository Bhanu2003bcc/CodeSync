package com.codesync.codesync_review_session_service.repository;

import com.codesync.codesync_review_session_service.model.ReviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReviewSessionRepository extends JpaRepository<ReviewSession, UUID> {
    List<ReviewSession> findByCreatorId(UUID creatorId);
}
