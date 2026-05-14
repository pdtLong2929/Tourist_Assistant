# Tourist Assistant 🌍✨

Welcome to the **Tourist Assistant**! This is an AI-driven, highly scalable platform designed to provide a premium, real-time tourist assistance experience, including personalized travel recommendations, dynamic route planning, and real-time transportation matching.

## 🔗 Try It Out!

**Local Development Environment:**
You can access the main application locally at:
👉 [http://localhost](http://localhost)

_The AI renting suggestion feature can be directly accessed at [http://localhost/renting/suggestions](http://localhost/renting/suggestions)_

## 🏗️ Project Architecture

The application is built on a modern, event-driven microservices architecture optimized for serverless deployments (like Google Cloud Run):

```mermaid
flowchart TD
    User([User]) -->|HTTP & WebSocket| Nginx[Nginx API Gateway]

    Nginx -->|Frontend Assets| Frontend[Next.js Frontend]
    Nginx -->|/api/auth/*| Login[Login API (Node.js)]
    Nginx -->|/api/v1/jobs/*| APIService[API Service (Go)]
    Nginx -->|/ws| Notification[Notification Service (Go)]

    APIService -->|Publish Task| PubSub((Google Cloud \nPub/Sub))

    PubSub -->|Push HTTP| Worker[Worker Service (Go)]
    Worker -->|Simulate/Call AI| AI[Internal AIs / Python RAG]
    Worker -->|Publish Result| PubSub

    PubSub -->|Push HTTP| Notification
    Notification -->|WebSocket Push| User
```

1. **Frontend**: Next.js application providing a premium, cyber-aesthetic user interface.
2. **Nginx API Gateway**: Reverse proxies requests to the appropriate internal services, handling CORS and SSL bridging.
3. **Login Service**: Node.js service handling authentication and session management.
4. **API Service**: Go/Gin service that exposes endpoints to ingest heavy asynchronous tasks and publishes them to the message broker.
5. **Google Cloud Pub/Sub**: The asynchronous, event-driven backbone of the application.
6. **Worker Service**: Go service that consumes jobs via HTTP pushes, interfaces with heavy LLM/RAG pipelines, and publishes results back.
7. **Notification Service**: Go service that manages stateful WebSocket connections with users and pushes real-time AI responses to their browsers.

## 💻 Technology Stack

- **Frontend**: React, Next.js, Tailwind CSS
- **API Gateway**: Nginx
- **Backend Services**:
  - Go (Golang) + Gin Framework (Async architecture)
  - Node.js + Express (Auth)
  - Python + FastAPI (RAG)
- **Messaging & Real-time**: Google Cloud Pub/Sub, Gorilla WebSockets
- **Databases**: PostgreSQL (with `pgvector` for AI embeddings), MongoDB
- **DevOps**: Docker, Docker Compose, GitHub Actions (CI/CD)

## 🚀 Getting Started (Local Development)

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/pdtLong2929/Tourist_Assistant.git
cd Tourist_Assistant
```

### 2. Start the Docker Environment

The entire architecture, including the databases and a local Google Cloud Pub/Sub emulator, is containerized for zero-setup local development.

```bash
docker compose up -d --build
```

_Wait a few seconds for the `pubsub-init` container to provision the topics and push subscriptions before triggering async tasks._

### 3. Access the App

Open [http://localhost](http://localhost) in your browser! To view live logs and trace async tasks across the services:

```bash
docker compose logs -f api_service worker_service notification pubsub-init
```

---

## 🤝 How to Contribute

We welcome contributions to make Tourist Assistant even better!

### Development Workflow

1. **Fork & Clone**: Fork the repository and clone it locally.
2. **Create a Branch**: `git checkout -b feature/your-feature-name`
3. **Make Changes**: Follow the architecture patterns. If you're adding a new heavy AI feature, ensure it utilizes the async task flow (API Service -> Pub/Sub -> Worker) rather than blocking the HTTP thread.
4. **Test Locally**: Ensure all Docker containers spin up correctly (`docker compose up --build`) and no Nginx routing is broken.
5. **Commit**: `git commit -m 'feat: added new amazing feature'`
6. **Push**: `git push origin feature/your-feature-name`
7. **Pull Request**: Open a PR against the `main` branch with a clear description of your changes.

### Adding New Microservices

If you are adding a new microservice to the stack:

1. Create your service directory with a `Dockerfile`.
2. Map the service in `docker-compose.yml` and attach it to the `ta_network`.
3. If it requires external HTTP access, update `nginx/conf.d/default.conf` to proxy a specific route (e.g., `/api/v2/new-feature`) to your new container.
