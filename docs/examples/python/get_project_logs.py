"""Fetch project-specific logs with optional filtering."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project-uuid>"


def get_project_logs() -> None:
    params = {
        "level": "ERROR",
        "startDate": "2024-05-01T00:00:00.000Z",
    }
    response = requests.get(
        f"{BASE_URL}/projects/{PROJECT_UUID}/logs",
        params=params,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    print("Project name:", data["project"]["name"])
    print("Logs returned:", len(data["logs"]))


if __name__ == "__main__":
    get_project_logs()
