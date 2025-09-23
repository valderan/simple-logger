"""Retrieve the whitelist contents."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def list_whitelist() -> None:
    response = requests.get(
        f"{BASE_URL}/settings/whitelist",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    for item in response.json():
        print(f"{item['ip']} ({item.get('description', 'no description')})")


if __name__ == "__main__":
    list_whitelist()
