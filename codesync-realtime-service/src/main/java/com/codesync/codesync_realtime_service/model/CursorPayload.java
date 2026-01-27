package com.codesync.codesync_realtime_service.model;

import lombok.Data;

@Data
public class CursorPayload {
    private String filePath;
    private int line;
    private int column;
}
