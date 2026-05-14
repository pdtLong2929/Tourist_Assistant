FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o api_service .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api_service .

ENV PORT=8081

EXPOSE 8081
CMD ["./api_service"]
