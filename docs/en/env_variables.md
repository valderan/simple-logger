# Environment variables

The tables below list every environment variable used by the Simple Logger services. Supply them via `.env` files, container environment sections, or before running build/start commands. Values are grouped per service.

## API (`./api`)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string. Defaults to `mongodb://localhost:27017/logger` when unset. |
| `PORT` | HTTP port for the API server. Defaults to `3000`. |
| `ADMIN_USER` | Admin username for `/api/auth/login`. |
| `ADMIN_PASS` | Admin password. The `ADMIN_USER`/`ADMIN_PASS` pair is required to access the dashboard. |
| `ADMIN_IP` | Extra allowlisted IP address. While set, the value cannot be removed from the UI. |
| `BOT_API_KEY` | Telegram bot token. Enables polling and notifications when provided. |
| `BOT_URL` | Explicit bot URL. When missing, the service asks Telegram for the bot username. |

## Client (`./client`)

The frontend is built with Vite and reads only variables prefixed with `VITE_`.

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Default REST API base URL (for example `http://localhost:3000/api`). Used on the sign-in screen. |
| `VITE_LOGGER_VERSION` | Displayed product version. Rendered in the sidebar and on the login page. |
| `VITE_LOGGER_PAGE_URL` | Link to your product site or repository. Applied to the logo and exposed on the login page. |

> ℹ️ When building via `docker compose`, pass these values through the client service `environment` section or export them before running `npm run build`.
