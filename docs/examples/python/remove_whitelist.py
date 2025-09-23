"""Delete an IP address from the whitelist."""

import requests

BASE_URL = "http://localhost:3000/api"
TOKEN = "<token>"


def remove_whitelist() -> None:
    response = requests.delete(
        f"{BASE_URL}/settings/whitelist/192.168.0.10",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    response.raise_for_status()
    print("Removed:", response.json())


if __name__ == "__main__":
    remove_whitelist()
