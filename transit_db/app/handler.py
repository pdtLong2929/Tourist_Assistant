import logging
import os
import threading
from typing import Any, Dict, List, Optional, Type, TypeVar

from pydantic import BaseModel, Field, ValidationError

from app.pubsub_client import publish, subscribe
from app.schemas.public_transport_schema import TransitRequest
from app.services.public_transport_logic import TransitService

logger = logging.getLogger(__name__)

TRANSIT_ACTIONS = {"transit", "transit_routing", "transit_suggestion", "public_transit"}
ModelT = TypeVar("ModelT", bound=BaseModel)


class JobMessage(BaseModel):
    job_id: str
    user_id: str
    action: str
    payload: Dict[str, Any] = Field(default_factory=dict)


def _validate_model(model: Type[ModelT], data: Any) -> ModelT:
    if hasattr(model, "model_validate"):
        return model.model_validate(data)
    return model.parse_obj(data)


def _format_transit_result(result: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Formats the result payload to return the list of route recommendations
    return {
        "recommendations": result
    }


def _build_success(job: JobMessage, result_payload: Dict[str, Any]) -> Dict[str, Any]:
    import json
    return {
        "jobId": job.job_id,
        "userId": job.user_id,
        "action": job.action,
        "status": "success",
        "result": json.dumps(result_payload, ensure_ascii=False),
    }


def _build_error(
    raw_job: Dict[str, Any],
    error: Exception,
    action: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "jobId": raw_job.get("job_id", ""),
        "userId": raw_job.get("user_id", ""),
        "action": action or raw_job.get("action", ""),
        "status": "error",
        "result": f"Error: {str(error)}",
    }


def _publish_result(data: Dict[str, Any]) -> Optional[str]:
    topic_id = os.getenv("PUBSUB_OUTPUT_TOPIC_ID")
    if not topic_id:
        logger.info("PUBSUB_OUTPUT_TOPIC_ID is not set; result will not be published")
        return None

    return publish(topic_id, data)


def _publish_error(data: Dict[str, Any]) -> Optional[str]:
    topic_id = os.getenv("PUBSUB_ERROR_TOPIC_ID")
    if not topic_id:
        logger.info("PUBSUB_ERROR_TOPIC_ID is not set; error will not be published")
        return None

    return publish(topic_id, data)


def handle_transit_job(job: JobMessage) -> Dict[str, Any]:
    try:
        req = _validate_model(TransitRequest, job.payload)
    except ValidationError as exc:
        raise ValueError(exc.errors()) from exc

    service = TransitService(req.city.value)
    locs = [loc.model_dump() for loc in req.locations]
    
    result = service.recommend(
        locations=locs,
        top_k=req.top_k,
        max_walk_meters=req.max_walk_meters,
        combine_routes=req.combine_routes,
    )
    
    return _build_success(job, _format_transit_result(result))


def handle_job(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Pub/Sub job message must be a JSON object")

    try:
        job = _validate_model(JobMessage, payload)
    except ValidationError as exc:
        raise ValueError(exc.errors()) from exc

    action = job.action.strip().lower()
    if action in TRANSIT_ACTIONS:
        return handle_transit_job(job)

    raise ValueError(f"Unsupported job action: {job.action}")


def handle_pull_message(payload: Any) -> None:
    raw_job = payload if isinstance(payload, dict) else {}
    try:
        result = handle_job(payload)
        _publish_result(result)
        logger.info(
            "Handled Pub/Sub job jobId=%s action=%s",
            result.get("jobId"),
            result.get("action"),
        )
    except Exception as exc:
        logger.error("Error handling job: %s", exc)
        error_result = _build_error(raw_job, exc)
        # Publish error to result topic so frontend gets feedback
        _publish_result(error_result)
        
        # Also try error topic if configured
        _publish_error(error_result)
        raise


def should_start_pull_subscriber() -> bool:
    enabled = os.getenv("PUBSUB_ENABLE_PULL_SUBSCRIBER", "").lower()
    return enabled in {"1", "true", "yes", "on"} and bool(os.getenv("PUBSUB_SUBSCRIPTION_ID"))


def start_pull_subscriber() -> Optional[threading.Thread]:
    subscription_id = os.getenv("PUBSUB_SUBSCRIPTION_ID")
    if not subscription_id:
        logger.warning("PUBSUB_SUBSCRIPTION_ID is not set; pull subscriber was not started")
        return None

    thread = threading.Thread(
        target=subscribe,
        args=(subscription_id, handle_pull_message),
        name="pubsub-transit-subscriber",
        daemon=True,
    )
    thread.start()
    logger.info("Started Pub/Sub pull subscriber thread for '%s'", subscription_id)
    return thread


if __name__ == "__main__":
    start_pull_subscriber()
    threading.Event().wait()
