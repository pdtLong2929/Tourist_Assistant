"""
Small Google Pub/Sub helper used by the EFM worker.

This module intentionally does not validate Google Cloud configuration at
import time. Configuration is checked only when publish() or subscribe() is
called, so FastAPI modules can import it without immediately starting Pub/Sub.
"""

import json
import logging
import os
from typing import Any, Callable, Optional

from dotenv import load_dotenv
from google.api_core.exceptions import GoogleAPICallError, NotFound
from google.cloud import pubsub_v1

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

Callback = Callable[[Any], None]


def _get_project_id() -> str:
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
    if not project_id:
        raise EnvironmentError("Missing environment variable: GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID")
    return project_id


def _configure_credentials() -> None:
    # Skip checking credentials if using the local emulator
    if os.getenv("PUBSUB_EMULATOR_HOST"):
        return

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        # In GCP environments like Cloud Run, we use Application Default Credentials (ADC) automatically
        if os.getenv("K_SERVICE"):
            return
        raise EnvironmentError(
            "Missing environment variable: GOOGLE_APPLICATION_CREDENTIALS"
        )

    if not os.path.isfile(credentials_path):
        raise FileNotFoundError(f"Service account file not found: {credentials_path}")

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path


def _ensure_configured() -> str:
    _configure_credentials()
    return _get_project_id()


def _to_bytes(data: Any) -> bytes:
    if isinstance(data, bytes):
        return data
    if isinstance(data, str):
        return data.encode("utf-8")
    if isinstance(data, (dict, list, int, float, bool)) or data is None:
        return json.dumps(data, ensure_ascii=False).encode("utf-8")

    try:
        return json.dumps(data.__dict__, ensure_ascii=False).encode("utf-8")
    except AttributeError as exc:
        raise TypeError(
            f"Cannot serialize data type: {type(data).__name__}. "
            "Please pass a dict, list, str, or bytes."
        ) from exc


def _from_bytes(raw: bytes) -> Any:
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def publish(topic_id: str, data: Any) -> Optional[str]:
    """
    Publish data to a Pub/Sub topic.

    Args:
        topic_id: Topic name, not the full topic path.
        data: JSON-serializable data, str, or bytes.

    Returns:
        Pub/Sub message id if successful, otherwise None.
    """
    try:
        project_id = _ensure_configured()
        publisher = pubsub_v1.PublisherClient()
        topic_path = publisher.topic_path(project_id, topic_id)
        message_bytes = _to_bytes(data)

        future = publisher.publish(topic_path, data=message_bytes)
        message_id = future.result(timeout=10)

        logger.info(
            "Published topic='%s' message_id=%s size=%dB",
            topic_id,
            message_id,
            len(message_bytes),
        )
        return message_id
    except NotFound:
        logger.error("Topic does not exist: '%s'", topic_id)
    except GoogleAPICallError as exc:
        logger.error("GCP error when publishing to '%s': %s", topic_id, exc)
    except (EnvironmentError, FileNotFoundError, TypeError) as exc:
        logger.error("Pub/Sub publish configuration/input error: %s", exc)
    except Exception as exc:
        logger.exception("Unexpected error when publishing to '%s': %s", topic_id, exc)

    return None


def subscribe(subscription_id: str, callback: Optional[Callback] = None) -> None:
    """
    Listen for messages from a subscription until stopped.

    The callback receives already-decoded message data. If the callback returns
    normally, the message is acked. If it raises, the message is nacked.
    """
    if callback is None:
        callback = lambda data: logger.info("Received message: %s", data)

    try:
        project_id = _ensure_configured()
        subscriber = pubsub_v1.SubscriberClient()
        subscription_path = subscriber.subscription_path(project_id, subscription_id)
    except (EnvironmentError, FileNotFoundError) as exc:
        logger.error("Pub/Sub subscribe configuration error: %s", exc)
        return
    except Exception as exc:
        logger.exception("Cannot initialize subscriber: %s", exc)
        return

    def _internal_callback(message: Any) -> None:
        try:
            data = _from_bytes(message.data)
            callback(data)
            message.ack()
        except Exception as exc:
            logger.exception("Error while handling message; message will be retried: %s", exc)
            message.nack()

    logger.info("Listening to subscription='%s'", subscription_id)
    streaming_pull_future = subscriber.subscribe(
        subscription_path,
        callback=_internal_callback,
    )

    with subscriber:
        try:
            streaming_pull_future.result()
        except KeyboardInterrupt:
            streaming_pull_future.cancel()
            streaming_pull_future.result()
            logger.info("Subscriber stopped.")
        except NotFound:
            logger.error("Subscription does not exist: '%s'", subscription_id)
        except GoogleAPICallError as exc:
            logger.error("GCP error while subscribing to '%s': %s", subscription_id, exc)
        except Exception as exc:
            logger.exception("Unexpected subscriber error: %s", exc)


if __name__ == "__main__":
    logger.info("Import this module from app.handler, or run: python -m app.handler")
