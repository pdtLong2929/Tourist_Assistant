import base64
import json
from fastapi import APIRouter, HTTPException, Request
from app.schema.schema import RecommendRequest, RecomResponse
from app.services.assemble import recommend
from app.handler import handle_pull_message


router = APIRouter()

@router.post("/recommend", response_model=RecomResponse)
def recommend_endpoint(req: RecommendRequest):
    try:
        result = recommend(req.origin, req.destination, req.date, req.user)
        formatted_cars = [{"veh_id": car} for car in result["cars"]]
        formatted_bikes = [{"veh_id": bike} for bike in result["bikes"]]
        return {"cars": formatted_cars, "bikes": formatted_bikes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pubsub/push")
async def pubsub_push_endpoint(request: Request):
    """
    HTTP Push endpoint for Google Cloud Pub/Sub.
    Decodes the Pub/Sub base64 envelope (if present) or processes
    raw JSON recommendation payloads directly.
    """
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON request body: {str(e)}")

    # 1. Check for standard Google Cloud Pub/Sub Push Envelope wrapper
    payload = body
    if isinstance(body, dict) and "message" in body and isinstance(body["message"], dict) and "data" in body["message"]:
        try:
            base64_data = body["message"]["data"]
            decoded_bytes = base64.b64decode(base64_data)
            decoded_str = decoded_bytes.decode("utf-8")
            payload = json.loads(decoded_str)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode base64 Pub/Sub data: {str(e)}")

    # 2. Invoke the central recommendation job pipeline
    try:
        # handle_pull_message will run handle_job, compute predictions, 
        # and publish results back to the Pub/Sub output/error topics!
        handle_pull_message(payload)
        return {"status": "success", "message": "Recommendation job processed and published successfully."}
    except Exception as e:
        # The exception has already been captured, logged, and published to the output/error topics
        # inside handle_pull_message. We return 200 OK here to signal to Google Pub/Sub that 
        # the message was successfully received and completed processing (even if it failed its business logic),
        # which prevents endless redelivery loops.
        return {"status": "error", "message": f"Job processing encountered an error: {str(e)}"}