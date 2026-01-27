package com.codesync.codesync_realtime_service.model;

import lombok.Data;

import java.util.UUID;

@Data
public class WsMessage<T> {
    private MessageType type;
    private UUID sessionId;
    private T payload;
    private long sentAt;
}
