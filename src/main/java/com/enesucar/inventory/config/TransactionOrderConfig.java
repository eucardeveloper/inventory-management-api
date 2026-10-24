package com.enesucar.inventory.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Puts the transaction advice OUTSIDE the audit aspect (lower order value = outer). The audit row is then
 * written while the audited operation's transaction is still open and commits with it. Without an
 * explicit order, the two have the same precedence and their nesting is undefined.
 */
@Configuration
@EnableTransactionManagement(proxyTargetClass = true, order = Ordered.LOWEST_PRECEDENCE - 10)
public class TransactionOrderConfig {
}
