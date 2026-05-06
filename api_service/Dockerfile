FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o api_service .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api_service .

ENV PORT=8081
# This env var points the Google Cloud SDK to our local emulator
ENV PUBSUB_EMULATOR_HOST=pubsub:8085 
ENV GOOGLE_CLOUD_PROJECT=test-project

EXPOSE 8081
CMD ["./api_service"]
