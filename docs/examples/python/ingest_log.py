"""Send a structured log message to the collector."""

import requests

BASE_URL = "http://localhost:3000/api"
PROJECT_UUID = "<project-uuid>"


def ingest_log() -> None:
    payload = {
        "uuid": PROJECT_UUID,
        "log": {
            "level": "ERROR",
            "message": "Payment gateway returned non-200 response",
            "tags": ["PAYMENT"],
            "metadata": {
                "service": "billing-service",
                "user": "user-42",
                "ip": "10.0.0.12",
                "extra": {"orderId": "A-42"},
            },
        },
    }
    response = requests.post(f"{BASE_URL}/logs", json=payload, timeout=10)
    response.raise_for_status()
    print("Stored log ID:", response.json()["_id"])


if __name__ == "__main__":
    ingest_log()
