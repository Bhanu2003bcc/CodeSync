package com.codesync.codesync_review_session_service.dto;

import lombok.Data;

@Data
public class AddCommentRequest {
    private String filePath;
    private Integer lineNumber;
    private String content;
}
