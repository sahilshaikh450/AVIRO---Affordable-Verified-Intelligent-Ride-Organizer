
FROM maven:3.9.5-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN mkdir -p uploads/college-ids

COPY --from=build /app/target/*.jar app.jar

EXPOSE 10000

ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=prod -jar app.jar"]
