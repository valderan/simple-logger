"""Authenticate against the Simple Logger API using the requests library."""

import requests

BASE_URL = "http://localhost:3000/api"


def login(username: str, password: str) -> str:
    """Perform POST /api/auth/login and return the received token."""

    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    response.raise_for_status()
    token = response.json()["token"]
    print("Received token:", token)
    return token


if __name__ == "__main__":
    login("admin", "secret")
