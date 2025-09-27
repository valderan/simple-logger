# Simple Logger Desktop Client

This guide explains how to install, configure, and operate the Electron-based desktop client that reuses the Simple Logger web interface.

## Highlights

- Single code base for the UI: the production bundle generated in `client/dist` works for both web and desktop.
- Linux, Windows, and macOS builds produced from the same `./desktop` project.
- Flexible path configuration through environment variables.
- Development mode powered by the Vite dev server and production mode that serves static files.

## Requirements

- Node.js 18+
- npm 9+
- Built Simple Logger frontend (`npm run build` inside `./client`)
- Access to the API (`http://localhost:3000` by default)

## Directory overview

| Entry | Description |
| --- | --- |
| `main.js` | Electron main process: window lifecycle, loading the web bundle, error handling. |
| `preload.js` | Secure bridge between Electron and the renderer. |
| `scripts/run-electron.js` | Helper for launching Electron in dev and production scenarios. |
| `scripts/sync-web-dist.js` | Copies the prepared web bundle into `web-dist`. |
| `web-dist/` | Storage for the production-ready frontend files. |
| `README.md`, `README_EN.md` | Quick-start guides for Russian and English. |

## Preparing the web client

1. Go to `client` and install dependencies: `npm install`.
2. Run `npm run build` to generate the production bundle in `client/dist`.
3. Inside `desktop`, execute `npm run sync:web` to copy files into `web-dist`.

The `sync:web` script accepts `WEB_SOURCE_DIR`, allowing you to copy bundles from arbitrary locations (CI artifacts, shared storage, etc.).

## Running the desktop client

### Production mode

```bash
cd desktop
npm install
npm run sync:web  # refresh web-dist when needed
npm start
```

Electron loads `index.html` from `web-dist` (or from the folder defined by `WEB_DIST_DIR`).

### Development mode

```bash
# Terminal 1 – web client
cd client
npm run dev

# Terminal 2 – Electron shell
cd desktop
npm install
npm run dev
```

By default the desktop shell connects to `http://localhost:5173`. Override the address with `DEV_SERVER_URL`.

## Packaging installers

Electron Builder is configured in `desktop/package.json` and targets all major desktop platforms:

- `npm run build:linux` – AppImage and deb packages.
- `npm run build:win` – NSIS installer and portable build.
- `npm run build:mac` – DMG and ZIP artifacts.

`npm run build` produces artifacts for the current operating system. Everything is stored in `desktop/release`.

> macOS artifacts must be built on macOS or in CI that provides macOS runners.

## Environment variables

- `WEB_SOURCE_DIR` – source directory for `npm run sync:web` (defaults to `../client/dist`).
- `WEB_DIST_DIR` – directory that Electron loads during runtime (defaults to `./web-dist`).
- `DEV_SERVER_URL` – Vite dev server URL for development mode.

## Updating the application

1. Rebuild the frontend (`npm run build` in `client`).
2. Copy the files into `desktop/web-dist` via `npm run sync:web`.
3. Restart the desktop client or rerun the packaging command.

## QA checklist

- Verify the Russian and English locales render correctly on dashboard, logs, and settings screens.
- Resize the window to ensure tables and charts keep their layout.
- In development mode test API interactions against `http://localhost:3000`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank window or `index.html` missing | Check `web-dist` contents or adjust `WEB_DIST_DIR`. |
| Dev server fails to load | Make sure `npm run dev` is running in `client` and `DEV_SERVER_URL` is correct. |
| electron-builder errors | Confirm `web-dist` contains the build and run the command on a supported OS. |

## Additional resources

- [Desktop README (RU)](../../desktop/README.md)
- [Desktop README (EN)](../../desktop/README_EN.md)
- Existing API and platform documentation in `docs/`
