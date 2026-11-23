
# ---------- Stage 1: Build ----------
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy Maven wrapper and project configuration
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Ensure wrapper is executable
RUN chmod +x mvnw

# Download dependencies first
RUN ./mvnw dependency:go-offline

# Copy application source
COPY src ./src

# Build executable Spring Boot JAR
RUN ./mvnw clean package -DskipTests


# ---------- Stage 2: Runtime ----------
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy only the generated JAR
COPY --from=builder /app/target/*.jar app.jar

# Application port
EXPOSE 8080

# Start Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]
