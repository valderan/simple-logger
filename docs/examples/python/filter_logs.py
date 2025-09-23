"""Filter logs globally using query parameters."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def filter_logs() -> None:
    params = {
        "uuid": "<project-uuid>",
        "level": "ERROR",
        "text": "payment",
        "startDate": "2024-05-01T00:00:00.000Z",
        "endDate": "2024-05-31T23:59:59.999Z",
    }
    response = requests.get(
        f"{BASE_URL}/logs",
        params=params,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    logs = response.json()["logs"]
    print("Matching logs:", len(logs))


if __name__ == "__main__":
    filter_logs()
