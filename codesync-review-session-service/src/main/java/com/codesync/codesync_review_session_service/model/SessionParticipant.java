package com.codesync.codesync_review_session_service.model;

import com.codesync.codesync_review_session_service.helper.SessionParticipantId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_participants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(SessionParticipantId.class)
public class SessionParticipant {
    @Id
    private UUID sessionId;

    @Id
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private SessionRole role;

    private Instant joinedAt;
}
