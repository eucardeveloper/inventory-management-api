package com.enesucar.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * Inventory application entry point.
 *
 * <ul>
 *   <li>{@code @EnableAsync} — activates the virtual-thread executor used by
 *       {@link com.enesucar.inventory.service.AuditLogService#recordAsync}.
 *       Audit writes never delay the HTTP response.</li>
 *   <li>{@code @EnableScheduling} — activates the {@code @Scheduled} cron
 *       that purges expired refresh tokens nightly.</li>
 * </ul>
 *
 * <p><b>Time zone.</b> The application runs in UTC and stores UTC: timestamps in PostgreSQL are
 * {@code TIMESTAMP} (no zone) holding UTC wall-clock time, and the JSON API sends them as ISO-8601
 * without an offset, which clients must read as UTC. The default zone is pinned in {@code main}
 * so it does not depend on the host machine (a developer laptop in another zone would otherwise
 * write local times into the same column).
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class InventoryManagementApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(InventoryManagementApplication.class, args);
    }
}
