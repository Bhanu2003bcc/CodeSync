package com.codesync.codesync_realtime_service.model;

import lombok.Data;

@Data
public class WsEvent {
    private String destination;
    private String payload;
}
