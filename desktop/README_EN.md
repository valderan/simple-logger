# Simple Logger Desktop

Simple Logger Desktop is an Electron wrapper around the Simple Logger web client. The goal is to reuse the same React build for both browser and desktop users on Windows, Linux, and macOS.

## Project structure

- `main.js` – Electron main process that creates the application window and loads the frontend.
- `preload.js` – secure bridge between the renderer and the main process.
- `scripts/` – helper utilities for development and packaging.
- `web-dist/` – location from which Electron serves the production build of the web client. Copy `client/dist` here.

## Requirements

- Node.js 18 or newer
- npm 9+
- Production build of the Simple Logger client (`npm run build` inside `./client`)

## Quick start

1. Install dependencies:

   ```bash
   cd desktop
   npm install
   ```

2. Build the web client and copy it into `web-dist`:

   ```bash
   cd ../client
   npm install
   npm run build
   cd ../desktop
   npm run sync:web
   ```

   The `sync:web` script copies `../client/dist` (or the folder set in `WEB_SOURCE_DIR`) into `desktop/web-dist`.

3. Launch the desktop shell that uses the local build:

   ```bash
   npm start
   ```

## Development mode

To work against the Vite dev server:

1. Start the frontend:

   ```bash
   cd ../client
   npm run dev
   ```

2. Start Electron in development mode:

   ```bash
   cd desktop
   npm run dev
   ```

The `dev` script falls back to `DEV_SERVER_URL=http://localhost:5173`. Override it when needed:

```bash
DEV_SERVER_URL=http://localhost:4173 npm run dev
```

## Packaging

[`electron-builder`](https://www.electron.build/) produces installers and archives. Make sure `web-dist` contains the latest web build before packaging.

- Build artifacts for the current platform:

  ```bash
  npm run build
  ```

- Platform-specific commands:

  ```bash
  npm run build:linux   # AppImage and deb
  npm run build:win     # NSIS installer and portable
  npm run build:mac     # DMG and ZIP
  ```

Artifacts are stored in `desktop/release`.

> **Note:** macOS packages must be produced on macOS or on CI with macOS runners.

## Custom web build locations

Provide `WEB_SOURCE_DIR` when running `npm run sync:web` to copy a build from a custom path (relative to `desktop/` or absolute):

```bash
WEB_SOURCE_DIR=../path/to/custom/dist npm run sync:web
```

When launching the app you can also point Electron to a different directory by setting `WEB_DIST_DIR`:

```bash
WEB_DIST_DIR=/opt/simple-logger/web npm start
```

## Updating the embedded frontend

1. Rebuild the web client (`npm run build` inside `./client`).
2. Copy the new build into `desktop/web-dist` (`npm run sync:web`).
3. Re-run the desired packaging command.

## Troubleshooting

- **Blank window or missing `index.html`.** Ensure `web-dist` exists, contains the production build, or configure `WEB_DIST_DIR`.
- **Dev server does not load.** Confirm `npm run dev` inside `client` is running and reachable at `DEV_SERVER_URL`.
- **Cross-platform builds fail.** Electron Builder needs to run on the target OS or inside CI that supports it.

## License

The desktop project inherits the MIT license from the main Simple Logger repository.
