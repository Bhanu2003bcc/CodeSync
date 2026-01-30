package com.codesync.codesync_realtime_service.util;

import tools.jackson.databind.ObjectMapper;

public class JsonUtil {
    private static final ObjectMapper mapper =
            new ObjectMapper();

    public static String toJson(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static <T> T fromJson(String json, Class<T> c) {
        try {
            return mapper.readValue(json, c);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
