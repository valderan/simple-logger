"""List ping services associated with a project."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project-uuid>"


def list_ping_services() -> None:
    response = requests.get(
        f"{BASE_URL}/projects/{PROJECT_UUID}/ping-services",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    for service in response.json():
        print(f"{service['name']} -> {service['url']} (interval {service['interval']}s)")


if __name__ == "__main__":
    list_ping_services()
