package com.codesync.codesync_review_session_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "review_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSession {
    @Id
    @GeneratedValue
    private UUID id;

    private String repoUrl;
    private String baseBranch;
    private String compareBranch;

    private String title;
    private String description;

    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    private UUID creatorId;

    private Instant createdAt;
}
