package com.enesucar.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * WMS application entry point.
 *
 * <ul>
 *   <li>{@code @EnableAsync} — activates the virtual-thread executor used by
 *       {@link com.enesucar.inventory.service.AuditLogService#recordAsync}.
 *       Audit writes never delay the HTTP response.</li>
 *   <li>{@code @EnableScheduling} — activates the {@code @Scheduled} cron
 *       that purges expired refresh tokens nightly.</li>
 * </ul>
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class InventoryManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(InventoryManagementApplication.class, args);
    }
}
