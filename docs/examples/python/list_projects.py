"""List every project currently stored in the logger."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def list_projects() -> None:
    response = requests.get(
        f"{BASE_URL}/projects",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    for project in response.json():
        print(f"{project['uuid']} => {project['name']}")


if __name__ == "__main__":
    list_projects()
