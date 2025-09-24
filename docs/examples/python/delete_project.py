"""Delete a logging project together with all stored logs."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"
PROJECT_UUID = "<project uuid>"


def delete_project() -> None:
    """Send DELETE /api/projects/<uuid>."""

    response = requests.delete(
        f"{BASE_URL}/projects/{PROJECT_UUID}",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    result = response.json()
    print(
        "Removed project, deleted logs:",
        result.get("deletedLogs"),
        "deleted ping-services:",
        result.get("deletedPingServices"),
    )


if __name__ == "__main__":
    delete_project()
