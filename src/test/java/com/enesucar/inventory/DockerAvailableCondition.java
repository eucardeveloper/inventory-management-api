package com.enesucar.inventory;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

import java.io.IOException;

/**
 * JUnit 5 execution condition that skips a test when no Docker daemon is reachable.
 * Attach with {@code @ExtendWith(DockerAvailableCondition.class)}.
 */
public class DockerAvailableCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            Process process = new ProcessBuilder("docker", "info")
                    .redirectErrorStream(true)
                    .start();
            int exit = process.waitFor();
            if (exit == 0) {
                return ConditionEvaluationResult.enabled("Docker is available");
            } else {
                return ConditionEvaluationResult.disabled("Docker daemon not reachable (docker info exit=" + exit + ") — test skipped");
            }
        } catch (IOException | InterruptedException e) {
            return ConditionEvaluationResult.disabled("Docker not found on PATH — test skipped");
        }
    }
}
