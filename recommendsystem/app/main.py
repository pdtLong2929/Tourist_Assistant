from fastapi import FastAPI
from app.routes import recommend, health
app = FastAPI()

app.include_router(recommend.router)
app.include_router(health.router)

