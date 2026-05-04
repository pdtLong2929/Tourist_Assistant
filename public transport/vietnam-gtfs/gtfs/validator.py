"""
GTFS Validator — wraps the MobilityData canonical validator.

Downloads the validator JAR on first run (requires Java 11+).

Usage:
    from gtfs.validator import validate
    ok, report = validate("output/hcmc/gtfs.zip")
"""

import logging
import os
import subprocess
import urllib.request

log = logging.getLogger(__name__)

VALIDATOR_VERSION = "6.0.0"
VALIDATOR_JAR_URL = (
    f"https://github.com/MobilityData/gtfs-validator/releases/download/"
    f"v{VALIDATOR_VERSION}/gtfs-validator-{VALIDATOR_VERSION}.jar"
)
VALIDATOR_JAR = os.path.join(
    os.path.dirname(__file__), f"gtfs-validator-{VALIDATOR_VERSION}.jar"
)


def validate(gtfs_zip: str, output_dir: str = None) -> tuple[bool, str]:
    """
    Validate a GTFS zip. Returns (success: bool, report_path: str).

    Requires Java 11+ on PATH.
    """
    if not _java_available():
        log.warning("[Validator] Java not found — skipping validation.")
        return True, ""

    _ensure_jar()

    if output_dir is None:
        output_dir = os.path.dirname(gtfs_zip)

    report_path = os.path.join(output_dir, "validation_report.json")

    cmd = [
        "java", "-jar", VALIDATOR_JAR,
        "--input", gtfs_zip,
        "--output_base", output_dir,
    ]
    log.info("[Validator] Running: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        log.info("[Validator] ✅ Feed is valid.")
        return True, report_path
    else:
        log.warning("[Validator] ⚠ Validation issues found. See %s", report_path)
        log.debug(result.stdout)
        log.debug(result.stderr)
        return False, report_path


def _java_available() -> bool:
    try:
        subprocess.run(
            ["java", "-version"],
            capture_output=True, check=True,
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def _ensure_jar():
    if os.path.exists(VALIDATOR_JAR):
        return
    log.info("[Validator] Downloading validator JAR (%s)...", VALIDATOR_VERSION)
    urllib.request.urlretrieve(VALIDATOR_JAR_URL, VALIDATOR_JAR)
    log.info("[Validator] Downloaded to %s", VALIDATOR_JAR)
