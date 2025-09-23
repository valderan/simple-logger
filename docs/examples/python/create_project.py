"""Create a logging project using the administrator token."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def create_project() -> None:
    """Send POST /api/projects with a JSON body describing the new project."""

    payload = {
        "name": "Orders Service",
        "description": "Handles order placement and payment flows",
        "logFormat": {"level": "string", "message": "string", "timestamp": "ISO8601"},
        "customTags": ["PAYMENT", "SHIPPING"],
        "telegramNotify": {
            "enabled": True,
            "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
            "antiSpamInterval": 30,
        },
        "debugMode": False,
    }

    response = requests.post(
        f"{BASE_URL}/projects",
        json=payload,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    project = response.json()
    print("Created project UUID:", project["uuid"])


if __name__ == "__main__":
    create_project()
