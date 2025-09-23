# Примеры использования API

## Авторизация

```
POST /api/auth/login
{
  "username": "admin",
  "password": "secret"
}
```

Ответ:
```
{
  "token": "<JWT-like токен>"
}
```
Используйте токен в заголовке `Authorization: Bearer <token>`.

## Создание проекта

```
POST /api/projects
Authorization: Bearer <token>
{
  "name": "Orders Service",
  "description": "Обработка заказов",
  "logFormat": {"level": "string", "message": "string"},
  "customTags": ["PAYMENT", "SMS"],
  "telegramNotify": {
    "enabled": true,
    "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
    "antiSpamInterval": 30
  },
  "debugMode": false
}
```

Ответ содержит созданный проект и UUID.

## Отправка лога

```
POST /api/logs
{
  "uuid": "<uuid проекта>",
  "log": {
    "level": "ERROR",
    "message": "Ошибка оплаты",
    "tags": ["PAYMENT"],
    "timestamp": "2024-05-20T10:00:00.000Z",
    "metadata": {
      "ip": "10.0.0.5",
      "service": "billing",
      "user": "user-1",
      "extra": {"orderId": "A-42"}
    }
  }
}
```

## Фильтрация логов

```
GET /api/logs?uuid=<uuid>&level=ERROR&tag=PAYMENT&startDate=2024-05-01
Authorization: Bearer <token>
```

Поддерживаемые параметры: `level`, `text`, `tag`, `user`, `ip`, `service`, `startDate`, `endDate`.

## Управление ping-сервисами

```
POST /api/projects/<uuid>/ping-services
Authorization: Bearer <token>
{
  "name": "Billing",
  "url": "https://billing.example.com/health",
  "interval": 60,
  "telegramTags": ["PING_DOWN"]
}
```

Запрос `/api/projects/<uuid>/ping-services/check` запускает проверку вручную.

## Белый список IP

```
POST /api/settings/whitelist
Authorization: Bearer <token>
{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

Удаление IP:
```
DELETE /api/settings/whitelist/192.168.0.10
Authorization: Bearer <token>
```
