"""Trigger manual check for ping services."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project-uuid>"


def trigger_ping_check() -> None:
    response = requests.post(
        f"{BASE_URL}/projects/{PROJECT_UUID}/ping-services/check",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    print("Updated ping services:", response.json())


if __name__ == "__main__":
    trigger_ping_check()
