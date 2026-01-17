package com.codesync.codesync_review_session_service.service;

import com.codesync.codesync_review_session_service.dto.CreateSessionRequest;
import com.codesync.codesync_review_session_service.exception.ForbiddenException;
import com.codesync.codesync_review_session_service.model.ReviewSession;
import com.codesync.codesync_review_session_service.model.SessionParticipant;
import com.codesync.codesync_review_session_service.model.SessionRole;
import com.codesync.codesync_review_session_service.model.SessionStatus;
import com.codesync.codesync_review_session_service.repository.ParticipantRepository;
import com.codesync.codesync_review_session_service.repository.ReviewSessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewSessionService {

    private final ReviewSessionRepository sessionRepo;
    private final ParticipantRepository participantRepo;

    public ReviewSession create(CreateSessionRequest req, UUID userId) {

        ReviewSession session = ReviewSession.builder()
                .repoUrl(req.getRepoUrl())
                .baseBranch(req.getBaseBranch())
                .compareBranch(req.getCompareBranch())
                .title(req.getTitle())
                .description(req.getDescription())
                .status(SessionStatus.ACTIVE)
                .creatorId(userId)
                .createdAt(Instant.now())
                .build();

        sessionRepo.save(session);

        participantRepo.save(
                SessionParticipant.builder()
                        .sessionId(session.getId())
                        .userId(userId)
                        .role(SessionRole.OWNER)
                        .joinedAt(Instant.now())
                        .build()
        );

        return session;
    }

    public List<ReviewSession> listForUser(UUID userId) {
        return participantRepo.findByUserId(userId).stream()
                .map(p -> sessionRepo.findById(p.getSessionId()).orElseThrow())
                .toList();
    }

    public void addParticipant(
            UUID sessionId, UUID requesterId, UUID newUserId) {

        SessionParticipant requester =
                participantRepo.findBySessionIdAndUserId(sessionId, requesterId)
                        .orElseThrow(() -> new ForbiddenException());

        if (requester.getRole() != SessionRole.OWNER) {
            throw new ForbiddenException();
        }

        participantRepo.save(
                SessionParticipant.builder()
                        .sessionId(sessionId)
                        .userId(newUserId)
                        .role(SessionRole.REVIEWER)
                        .joinedAt(Instant.now())
                        .build()
        );
    }
}

