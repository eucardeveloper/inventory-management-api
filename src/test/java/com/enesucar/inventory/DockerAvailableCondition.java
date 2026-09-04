package com.enesucar.inventory;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

public class DockerAvailableCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            boolean available = DockerClientFactory.instance().isDockerAvailable();
            if (available) {
                return ConditionEvaluationResult.enabled("Docker is reachable via Testcontainers");
            } else {
                return ConditionEvaluationResult.disabled(
                        "Docker daemon not reachable by Testcontainers - test skipped locally");
            }
        } catch (Exception e) {
            return ConditionEvaluationResult.disabled(
                    "Docker check failed (" + e.getMessage() + ") - test skipped locally");
        }
    }
}