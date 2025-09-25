# Logger Client Application

The `./client` directory contains a single-page application built with React and TypeScript. It provides the web interface for managing logging projects, browsing logs, and configuring notifications.

## Technology stack

- **Vite** – build tool and dev server.
- **React Router** – client-side routing between sections.
- **MUI** – UI components with light/dark theme support.
- **TanStack Query** – request caching and data synchronization with the API.
- **Axios** – HTTP client.
- **Chart.js** – visualizing metrics on the dashboard.

## Directory structure

```text
client/
├── docker-compose.yml      # Build and serve the static bundle with Nginx
├── Dockerfile              # Production image (Vite build + Nginx)
├── build-and-start-prod.sh # Build-and-run helper script
├── package.json            # Scripts and dependencies
└── src/
    ├── api/                # REST API helpers
    ├── components/         # Reusable UI blocks
    ├── hooks/              # Custom hooks (auth, translations)
    ├── localization/       # UI text resources
    ├── pages/              # Route-driven pages
    ├── providers/          # Theme, localization, and auth providers
    ├── theme.ts            # MUI theme definitions
    └── config.ts           # Environment configuration and API URL
```

## Environment variables

The client relies on Vite environment variables (`VITE_*`) provided via `.env` files or command-line flags:

- `VITE_API_URL` – base REST API URL (for example `http://localhost:3000/api`).
- `LOGGER_VERSION` – version string rendered in the footer.
- `LOGGER_PAGE_URL` – link to the product page.

When running through `docker-compose.yml`, values are passed as container environment variables (`API_URL`, `LOGGER_VERSION`, `LOGGER_PAGE_URL`) and baked into the build.

## Main interface sections

Routes are defined in `src/App.tsx` and become available after authentication:

1. **Dashboard** – overview of projects, active ping services, and the latest logs using charts and cards.
2. **Projects** – project table with search, quick navigation to logs, and create/edit forms (`AddProjectPage`, `EditProjectPage`).
3. **Ping services** – manage HTTP checks, edit or delete entries, trigger a single service or the whole project on demand, and observe background refresh every two minutes while the page stays active.
4. **Logs** – powerful log filter with URL state sharing, detailed view, JSON copy, and bulk deletion.
5. **Telegram** – manage bot recipients, enable/disable notifications, and configure tags.
6. **Settings** – IP whitelist, the API rate limit editor with confirmation warnings, and security options with instant API updates.
7. **FAQ** – static help page and documentation links.

A separate **Login** page handles token retrieval (`/api/auth/login`) and stores credentials inside the `AuthProvider`.

## Working with the API

All requests live in the `src/api` module. Each helper uses `axios` with the base URL from `config.ts` and automatically injects the token from `AuthContext`. Key operations include:

- `fetchProjects`, `createProject`, `updateProject`, `deleteProject` – project CRUD.
- `filterLogs`, `deleteLogs`, `ingestLog` – log retrieval and cleanup.
- `createPingService`, `updatePingService`, `deletePingService`, `triggerPingCheck` – uptime monitoring with on-demand checks.
- `fetchRateLimitSettings`, `updateRateLimitSettings`, `fetchTelegramStatus`, `fetchTelegramBotUrl` – security controls and Telegram diagnostics.
- `listWhitelist`, `addWhitelistIp`, `removeWhitelistIp` – access control.

TanStack Query handles caching and updates UI state after mutations.

## Developer commands

```bash
cd client
npm install          # install dependencies
npm run dev          # start the local dev server (http://localhost:5173)
npm run build        # production build
npm run preview      # preview the built bundle
npm run lint         # run ESLint
```

To run in Docker use `docker-compose.yml`:

```bash
cd client
docker compose up --build
```

The container builds the static bundle and serves it through Nginx on port `80`.

## UI and UX details

- Light and dark themes are supported via `ThemeModeProvider`; the choice is stored in `localStorage`.
- Translation strings live in `localization/translations.ts`; the active language is detected from the browser.
- Log filter state is stored in query parameters so you can share links.
- Data grid components rely on `@mui/x-data-grid` for virtualization and custom row actions.
- Telegram page displays the bot status (connected/token missing) based on `/api/settings/telegram-status` and shows the invite link from `/api/settings/telegram-url` when available.
- Ping services page refreshes check timestamps in the background every two minutes to keep the UI fresh without exceeding rate limits.
- Rate limit changes require confirmation and log a warning to the `logger-system` project for auditability.

Keep these principles in mind when extending the app: new pages should plug into `AppLayout`, call the API via existing hooks, and respect theming/localization.
