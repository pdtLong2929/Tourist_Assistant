"""
Pub/Sub job handler for TSP route optimization requests.

Expected request message:
{
    "job_id": "job_123",
    "user_id": "user_456",
    "action": "predict",
    "payload": {
        "start_location": {"id": 1, "x": 106.7, "y": 10.8},
        "destinations": [
            {"id": 2, "x": 106.8, "y": 10.9}
        ]
    }
}
"""

import logging
import os
from typing import Any, Callable

import torch
from dotenv import load_dotenv
from pydantic import ValidationError

from app.pubsub_client import publish, subscribe
from app.schemas.tsp_schemas import PredictRequest
from app.services.tsp_logic import (
    calculate_open_path_distance,
    load_resources,
    normalize_coordinates,
    state,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUEST_SUBSCRIPTION = os.getenv("PUBSUB_REQUEST_SUBSCRIPTION", "tsp-request-sub")
RESPONSE_TOPIC = os.getenv("PUBSUB_RESPONSE_TOPIC", "tsp-response")


class JobValidationError(ValueError):
    """Raised when the incoming job message has an invalid shape."""


def _require_dict(value: Any, field_name: str) -> dict:
    if not isinstance(value, dict):
        raise JobValidationError(f"'{field_name}' must be an object")
    return value


def _require_text(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise JobValidationError(f"'{field_name}' must be a non-empty string")
    return value.strip()


def _ensure_resources_loaded() -> None:
    if not state.get("MODEL_READY") or state.get("model") is None:
        logger.info("Loading TSP resources...")
        load_resources()

    if not state.get("MODEL_READY") or state.get("model") is None:
        raise RuntimeError("TSP model is not loaded")


def _build_response(
    job: dict,
    status: str,
    result: Any = None,
    error: str | None = None,
) -> dict:
    return {
        "job_id": job.get("job_id"),
        "user_id": job.get("user_id"),
        "action": job.get("action"),
        "status": status,
        "result": result,
        "error": error,
    }


def _publish_response(response: dict) -> None:
    message_id = publish(RESPONSE_TOPIC, response)
    if not message_id:
        raise RuntimeError(f"Could not publish response to topic '{RESPONSE_TOPIC}'")


def _validate_job(message: Any) -> dict:
    job = _require_dict(message, "message")
    payload = _require_dict(job.get("payload"), "payload")

    return {
        "job_id": _require_text(job.get("job_id"), "job_id"),
        "user_id": job.get("user_id"),
        "action": _require_text(job.get("action"), "action"),
        "payload": payload,
    }


def _optimize_route(request: PredictRequest) -> dict:
    _ensure_resources_loaded()

    all_points = [request.start_location] + request.destinations
    norm_coords = normalize_coordinates(all_points)
    coords = torch.tensor([norm_coords], dtype=torch.float32)

    with torch.no_grad():
        state["model"].set_decode_type("greedy")
        _, _, pi = state["model"](coords, return_pi=True)

    tour_indices = pi[0].cpu().numpy().tolist()
    if 0 not in tour_indices:
        raise RuntimeError("Model output does not contain the start location index")

    start_position_in_tour = tour_indices.index(0)
    forward_indices = (
        tour_indices[start_position_in_tour:] + tour_indices[:start_position_in_tour]
    )
    reverse_indices = [forward_indices[0]] + forward_indices[1:][::-1]

    dist_forward = calculate_open_path_distance(forward_indices, all_points)
    dist_reverse = calculate_open_path_distance(reverse_indices, all_points)

    if dist_reverse < dist_forward:
        final_indices = reverse_indices
        final_distance = dist_reverse
    else:
        final_indices = forward_indices
        final_distance = dist_forward

    return {
        "status": "success",
        "start_point_id": request.start_location.id,
        "total_locations": len(all_points),
        "total_distance": round(final_distance, 4),
        "optimized_route": [all_points[i].model_dump() for i in final_indices],
    }


def _predict(job: dict) -> dict:
    try:
        request = PredictRequest.model_validate(job["payload"])
    except ValidationError as exc:
        raise JobValidationError(str(exc)) from exc

    return _optimize_route(request)


def _unsupported_action(job: dict) -> Any:
    raise JobValidationError(f"Unsupported action: {job['action']}")


def _get_action_handler(job: dict) -> Callable[[dict], Any]:
    handlers: dict[str, Callable[[dict], Any]] = {
        "predict": _predict,
        "optimize_route": _predict,
        "tsp": _predict,
    }
    return handlers.get(job["action"], _unsupported_action)


def handle_message(message: Any) -> None:
    """
    Process one decoded Pub/Sub message and publish a success or error response.

    pubsub_client.subscribe handles ack/nack. Expected job errors are published
    as failed responses so malformed messages do not retry forever.
    """
    try:
        job = _validate_job(message)
    except JobValidationError as exc:
        logger.warning("Invalid job message: %s", exc)
        fallback_job = message if isinstance(message, dict) else {}
        _publish_response(_build_response(fallback_job, "error", error=str(exc)))
        return

    try:
        handler = _get_action_handler(job)
        result = handler(job)
        _publish_response(_build_response(job, "success", result=result))
        logger.info("Completed job_id=%s action=%s", job["job_id"], job["action"])
    except JobValidationError as exc:
        logger.warning("Job rejected job_id=%s: %s", job["job_id"], exc)
        _publish_response(_build_response(job, "error", error=str(exc)))
    except Exception as exc:
        logger.exception("Job failed job_id=%s", job["job_id"])
        _publish_response(_build_response(job, "error", error=str(exc)))


def run_worker() -> None:
    _ensure_resources_loaded()
    logger.info(
        "Starting worker: subscription='%s', response_topic='%s'",
        REQUEST_SUBSCRIPTION,
        RESPONSE_TOPIC,
    )
    subscribe(REQUEST_SUBSCRIPTION, callback=handle_message)


if __name__ == "__main__":
    run_worker()
