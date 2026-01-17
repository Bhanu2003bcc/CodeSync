package com.codesync.codesync_review_session_service.helper;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionParticipantId implements Serializable {
    private UUID sessionId;
    private UUID userId;
}
