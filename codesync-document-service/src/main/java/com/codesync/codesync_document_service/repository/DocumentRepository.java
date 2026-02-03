package com.codesync.codesync_document_service.repository;

import com.codesync.codesync_document_service.model.DocumentSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DocumentRepository extends JpaRepository<DocumentSnapshot, UUID> {
}
