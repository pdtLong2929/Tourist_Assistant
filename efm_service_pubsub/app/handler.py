"""
Pub/Sub job handler for model inference requests.

Expected request message:
{
    "job_id": "job_123",
    "user_id": "user_456",
    "action": "recommend",
    "payload": {
        "city": "HCMC",
        "top_k": 5
    }
}

Response messages are published with the same job metadata so callers can
correlate asynchronous results.
"""

import logging
import os
from typing import Any, Callable

from dotenv import load_dotenv

from app.pubsub_client import publish, subscribe
from app.services.efm_logic import (
    calculate_cold_start_score,
    generate_ai_explanation,
    get_destination_features,
    get_user_context,
    load_resources,
    state,
    validate_location_in_city,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUEST_SUBSCRIPTION = os.getenv("PUBSUB_REQUEST_SUBSCRIPTION", "model-request-sub")
RESPONSE_TOPIC = os.getenv("PUBSUB_RESPONSE_TOPIC", "model-response")
DEFAULT_CANDIDATE_LIMIT = int(os.getenv("EFM_RECOMMEND_CANDIDATE_LIMIT", "1000"))


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
    if state.get("model_efm") is None or not state.get("iid_map"):
        logger.info("Loading EFM resources...")
        load_resources()

    if state.get("model_efm") is None:
        raise RuntimeError("EFM model is not loaded")


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
    payload = job.get("payload", {})

    return {
        "job_id": _require_text(job.get("job_id"), "job_id"),
        "user_id": _require_text(job.get("user_id"), "user_id"),
        "action": _require_text(job.get("action"), "action"),
        "payload": _require_dict(payload, "payload"),
    }


def _predict(job: dict) -> list[dict]:
    payload = job["payload"]
    item_ids = payload.get("item_ids")

    if not isinstance(item_ids, list) or not item_ids:
        raise JobValidationError("'payload.item_ids' must be a non-empty list")

    _ensure_resources_loaded()

    user_id = job["user_id"]
    u_idx = state["uid_map"].get(user_id)
    user_context = get_user_context(user_id)
    results = []

    for item_id in item_ids:
        item_id = _require_text(item_id, "payload.item_ids[]")
        i_idx = state["iid_map"].get(item_id)
        item_data = get_destination_features(item_id)

        if u_idx is not None and i_idx is not None:
            raw_score = state["model_efm"].score(u_idx, i_idx)
        else:
            raw_score = calculate_cold_start_score(user_id, item_id)

        score = float(max(1.0, min(5.0, raw_score)))
        explanation = generate_ai_explanation(item_data, score, user_context)

        results.append(
            {
                "item_id": item_id,
                "predicted_rating": round(score, 1),
                "explanation": explanation,
            }
        )

    results.sort(key=lambda item: item["predicted_rating"], reverse=True)
    return results


def _recommend(job: dict) -> list[dict]:
    payload = job["payload"]
    city = _require_text(payload.get("city"), "payload.city")
    top_k = int(payload.get("top_k", 5))

    if top_k <= 0:
        raise JobValidationError("'payload.top_k' must be greater than 0")

    _ensure_resources_loaded()

    user_id = job["user_id"]
    u_idx = state["uid_map"].get(user_id)
    model = state["model_efm"]
    results = []

    if u_idx is None:
        item_ids = list(state["iid_map"].keys())[:DEFAULT_CANDIDATE_LIMIT]
        for item_id in item_ids:
            if not validate_location_in_city(item_id, city):
                continue

            score = calculate_cold_start_score(user_id, item_id)
            results.append(
                {
                    "item_id": item_id,
                    "predicted_rating": round(float(max(1.0, min(5.0, score))), 1),
                }
            )
    else:
        rankings, _ = model.rank(u_idx)
        for idx in rankings[:DEFAULT_CANDIDATE_LIMIT]:
            item_id = state["idx_to_iid"].get(idx)
            if not item_id or not validate_location_in_city(item_id, city):
                continue

            raw_score = float(model.score(u_idx, idx))
            score = max(1.0, min(5.0, raw_score))
            results.append(
                {
                    "item_id": item_id,
                    "predicted_rating": round(score, 1),
                }
            )

    results.sort(key=lambda item: item["predicted_rating"], reverse=True)
    return results[:top_k]


def _unsupported_action(job: dict) -> Any:
    raise JobValidationError(f"Unsupported action: {job['action']}")


def _get_action_handler(job: dict) -> Callable[[dict], Any]:
    handlers: dict[str, Callable[[dict], Any]] = {
        "predict": _predict,
        "recommend": _recommend,
    }
    return handlers.get(job["action"], _unsupported_action)


def handle_message(message: Any) -> None:
    """
    Process one decoded Pub/Sub message and publish a success or error response.

    pubsub_client.subscribe handles ack/nack. This function catches expected
    job errors and publishes them as failed responses so bad messages do not
    retry forever.
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
        response = _build_response(job, "success", result=result)
        _publish_response(response)
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
