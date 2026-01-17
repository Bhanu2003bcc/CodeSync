package com.codesync.codesync_review_session_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AddParticipantRequest {
    private UUID userId;
}
