package com.codesync.codesync_review_session_service.exception;


import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException{
    public ForbiddenException() {
        super("You are not allowed to perform this action");
    }

    public ForbiddenException(String message) {
        super(message);
    }
}
