"""Register a ping service for a project."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project-uuid>"


def add_ping_service() -> None:
    payload = {
        "name": "Billing health-check",
        "url": "https://billing.example.com/health",
        "interval": 60,
        "telegramTags": ["PING_DOWN"],
    }
    response = requests.post(
        f"{BASE_URL}/projects/{PROJECT_UUID}/ping-services",
        json=payload,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    print("Created ping service:", response.json())


if __name__ == "__main__":
    add_ping_service()
