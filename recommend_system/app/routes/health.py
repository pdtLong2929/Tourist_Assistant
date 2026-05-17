from fastapi import APIRouter

router = APIRouter()



@router.get("/")
def root():
    return {
        "status": "This vehicle recommendation system is running"
    }