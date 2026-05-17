from fastapi import FastAPI
from app import handler
from app.routes import recommend, health
from app.db import init_db

app = FastAPI()

app.include_router(recommend.router)
app.include_router(health.router)


@app.on_event("startup")
def start_services():
    # 1. Initialize and seed database if necessary
    init_db()
    # 2. Start pubsub pull subscriber
    if handler.should_start_pull_subscriber():
        handler.start_pull_subscriber()

