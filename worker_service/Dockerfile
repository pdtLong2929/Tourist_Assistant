FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o worker_service .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/worker_service .

ENV PORT=8001

EXPOSE 8001
CMD ["./worker_service"]
