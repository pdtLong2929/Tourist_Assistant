FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy everything
COPY . .

# Ensure dependencies are downloaded and go.sum is updated
RUN go mod tidy
RUN go build -o notification .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/notification .

ENV PORT=8080
EXPOSE 8080

CMD ["./notification"]
