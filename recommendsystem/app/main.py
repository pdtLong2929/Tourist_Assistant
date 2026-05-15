from fastapi import FastAPI
from app import handler
from app.routes import recommend, health

app = FastAPI()

app.include_router(recommend.router)
app.include_router(health.router)


@app.on_event("startup")
def start_pubsub_subscriber():
    if handler.should_start_pull_subscriber():
        handler.start_pull_subscriber()
