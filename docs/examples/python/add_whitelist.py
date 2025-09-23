"""Add or update an IP address in the whitelist."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def add_whitelist() -> None:
    payload = {"ip": "192.168.0.10", "description": "VPN gateway"}
    response = requests.post(
        f"{BASE_URL}/settings/whitelist",
        json=payload,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    print("Saved whitelist record:", response.json())


if __name__ == "__main__":
    add_whitelist()
