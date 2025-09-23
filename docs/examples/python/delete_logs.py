"""Delete logs using the DELETE endpoint."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project-uuid>"


def delete_logs() -> None:
    params = {"level": "DEBUG"}
    response = requests.delete(
        f"{BASE_URL}/logs/{PROJECT_UUID}",
        params=params,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    print("Deleted logs:", response.json()["deleted"])


if __name__ == "__main__":
    delete_logs()
