import os
import requests

API_URL = os.getenv('API_URL', 'http://localhost:3000')
PROJECT_UUID = os.getenv('PROJECT_UUID', '00000000-0000-0000-0000-000000000000')

response = requests.post(
    f"{API_URL}/api/logs",
    json={
        "uuid": PROJECT_UUID,
        "log": {
            "level": "INFO",
            "tags": ["TEST"]
        }
    },
    timeout=10,
)

if response.status_code == 400:
    print('Ошибка формата лога:', response.json())
else:
    response.raise_for_status()
