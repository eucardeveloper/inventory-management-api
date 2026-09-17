package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query(value = """
        SELECT * FROM audit_log
        WHERE (:userId     IS NULL OR user_id     = :userId)
          AND (:entityType IS NULL OR entity_type = :entityType)
          AND (:action     IS NULL OR action      = :action)
          AND (:from       IS NULL OR occurred_at >= CAST(:from AS timestamptz))
          AND (:to         IS NULL OR occurred_at <= CAST(:to   AS timestamptz))
        ORDER BY occurred_at DESC, id DESC
        LIMIT :pageSize OFFSET :offset
        """,
        nativeQuery = true)
    List<AuditLog> searchPage(
        @Param("userId")     Long userId,
        @Param("entityType") String entityType,
        @Param("action")     String action,
        @Param("from")       String from,
        @Param("to")         String to,
        @Param("pageSize")   int pageSize,
        @Param("offset")     long offset
    );

    @Query(value = """
        SELECT COUNT(*) FROM audit_log
        WHERE (:userId     IS NULL OR user_id     = :userId)
          AND (:entityType IS NULL OR entity_type = :entityType)
          AND (:action     IS NULL OR action      = :action)
          AND (:from       IS NULL OR occurred_at >= CAST(:from AS timestamptz))
          AND (:to         IS NULL OR occurred_at <= CAST(:to   AS timestamptz))
        """,
        nativeQuery = true)
    long searchCount(
        @Param("userId")     Long userId,
        @Param("entityType") String entityType,
        @Param("action")     String action,
        @Param("from")       String from,
        @Param("to")         String to
    );
}
