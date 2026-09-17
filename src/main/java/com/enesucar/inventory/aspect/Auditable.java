package com.enesucar.inventory.aspect;

import com.enesucar.inventory.entity.AuditAction;

import java.lang.annotation.*;

/**
 * Mark a service method to have its outcome recorded in the audit log.
 *
 * <pre>{@code
 * @Auditable(action = AuditAction.PRODUCT_CREATED, entityType = "Product")
 * public Product saveProduct(Product product) { ... }
 * }</pre>
 *
 * The aspect writes the audit entry <em>after</em> the method returns successfully,
 * inside a {@code REQUIRES_NEW} transaction so the record is durable even if the
 * caller's transaction later rolls back for an unrelated reason.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {
    AuditAction action();
    String entityType() default "";
    /** SpEL expression evaluated against the return value to extract the entity id. */
    String entityIdExpression() default "#{result?.id}";
    String description() default "";
}
