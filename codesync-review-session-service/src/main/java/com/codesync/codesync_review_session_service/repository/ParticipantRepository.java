package com.codesync.codesync_review_session_service.repository;

import com.codesync.codesync_review_session_service.helper.SessionParticipantId;
import com.codesync.codesync_review_session_service.model.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<SessionParticipant, SessionParticipantId> {
    Optional<SessionParticipant> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    List<SessionParticipant> findByUserId(UUID userId);

    void deleteBySessionId(UUID sessionId);
}
