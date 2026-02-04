package com.codesync.codesync_review_session_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "comments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID sessionId;

    private String filePath;

    private Integer lineNumber;

    @Column(columnDefinition = "TEXT")
    private String content;

    private UUID authorId;

    private String authorName;

    private Instant createdAt;

    // For threading - null if this is a top-level comment
    private UUID parentId;
}
