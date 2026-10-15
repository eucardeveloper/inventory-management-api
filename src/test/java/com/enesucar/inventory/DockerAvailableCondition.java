package com.enesucar.inventory;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

/**
 * Skips Testcontainers-based tests on a developer machine without Docker, but never in CI.
 * When the CI environment variable is set, a missing Docker daemon is a hard failure, so the
 * integration tests cannot silently turn into "skipped" and let a broken build look green.
 */
public class DockerAvailableCondition implements ExecutionCondition {

    private static boolean runningInCi() {
        String ci = System.getenv("CI");
        return ci != null && !ci.isBlank() && !"false".equalsIgnoreCase(ci);
    }

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        boolean available;
        String reason;
        try {
            available = DockerClientFactory.instance().isDockerAvailable();
            reason = "Docker daemon not reachable by Testcontainers";
        } catch (Exception e) {
            available = false;
            reason = "Docker check failed (" + e.getMessage() + ")";
        }
        if (available) {
            return ConditionEvaluationResult.enabled("Docker is reachable via Testcontainers");
        }
        if (runningInCi()) {
            throw new IllegalStateException(reason + " - integration tests must not be skipped in CI");
        }
        return ConditionEvaluationResult.disabled(reason + " - test skipped locally");
    }
}
