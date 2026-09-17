# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy dependency descriptors first — Docker layer cache means this layer
# is only rebuilt when pom.xml changes, not when source changes.
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw clean package -DskipTests

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# JRE-only image — no compiler, no Maven, no source. Smaller attack surface.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Build metadata embedded as image labels (OCI standard).
# In CI these are set from the git commit; locally they default to "local".
# "Which code is running in production?" → docker inspect <container> | grep BUILD_SHA
ARG BUILD_SHA=local
ARG BUILD_TIME=local
LABEL org.opencontainers.image.revision="${BUILD_SHA}" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.title="warehouse-wms" \
      org.opencontainers.image.description="Warehouse Management System — Spring Boot 3 / Java 21"

# Pass SHA into the app so /actuator/info can expose it
ENV BUILD_SHA=${BUILD_SHA}

COPY --from=build /app/target/*.jar app.jar

# Use exec form so signals (SIGTERM from docker stop) reach the JVM directly.
# The JVM then drains in-flight requests gracefully (server.shutdown=graceful in application.yml).
ENTRYPOINT ["java", "-jar", "app.jar"]
