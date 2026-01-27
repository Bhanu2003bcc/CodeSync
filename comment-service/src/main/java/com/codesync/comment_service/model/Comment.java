package com.codesync.comment_service.model;


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

    private UUID userId;

    private String filePath;

    private int lineNumber;

    @Column(columnDefinition = "TEXT")
    private String content;

    private UUID parentCommentId;

    private Instant createdAt;
}
