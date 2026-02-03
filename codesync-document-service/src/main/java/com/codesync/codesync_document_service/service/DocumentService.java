package com.codesync.codesync_document_service.service;


import com.codesync.codesync_document_service.model.DocumentSnapshot;
import com.codesync.codesync_document_service.repository.DocumentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {
    private final DocumentRepository repo;

    public void save(UUID sessionId, byte[] snapshot) {

        DocumentSnapshot doc =
                DocumentSnapshot.builder()
                        .sessionId(sessionId)
                        .snapshot(snapshot)
                        .updatedAt(Instant.now())
                        .build();

        repo.save(doc);
    }

    public byte[] load(UUID sessionId) {

        return repo.findById(sessionId)
                .map(DocumentSnapshot::getSnapshot)
                .orElse(null);
    }
}
