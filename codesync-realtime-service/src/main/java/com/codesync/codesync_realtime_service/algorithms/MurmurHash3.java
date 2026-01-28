package com.codesync.codesync_realtime_service.algorithms;

import java.nio.charset.StandardCharsets;

public class MurmurHash3 {

    public static int hash32(String data) {
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        int h = 0;

        for (byte b : bytes) {
            h ^= b;
            h *= 0x5bd1e995;
            h ^= h >>> 15;
        }
        return h;
    }
}
