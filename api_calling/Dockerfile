FROM golang:1.26-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/main.go

FROM alpine:3.22
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/.env . 
EXPOSE 8080
CMD ["./main"]