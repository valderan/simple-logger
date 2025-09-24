"""Update an existing logging project using the administrative token."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project uuid>"


def update_project() -> None:
    """Send PUT /api/projects/<uuid> with the new project definition."""

    payload = {
        "name": "Orders Service",
        "description": "Updated description with SLA requirements",
        "logFormat": {"level": "string", "message": "string", "timestamp": "ISO8601"},
        "defaultTags": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        "customTags": ["PAYMENT", "SHIPPING"],
        "accessLevel": "global",
        "telegramNotify": {
            "enabled": True,
            "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
            "antiSpamInterval": 20,
        },
        "debugMode": False,
    }

    response = requests.put(
        f"{BASE_URL}/projects/{PROJECT_UUID}",
        json=payload,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    project = response.json()
    print("Project updated. New description:", project.get("description"))


if __name__ == "__main__":
    update_project()
