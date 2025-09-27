const { app, BrowserWindow, shell, dialog, protocol } = require('electron');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
]);
const path = require('path');
const fs = require('fs');

const DEFAULT_DEV_SERVER_URL = 'http://localhost:5173';

function resolveWebDistDir() {
  const appPath = app.getAppPath();
  const override = process.env.WEB_DIST_DIR;

  if (override) {
    const candidate = path.isAbsolute(override)
      ? override
      : path.join(appPath, override);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    throw new Error(
      `Не удалось найти каталог с веб-клиентом по пути "${candidate}". ` +
        'Убедитесь, что указали корректный путь в переменной WEB_DIST_DIR.'
    );
  }

  const defaultPath = path.join(appPath, 'web-dist');
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  throw new Error(
    'Каталог web-dist не найден. Скопируйте собранный веб-клиент в desktop/web-dist или задайте WEB_DIST_DIR.'
  );
}

let productionProtocolRegistered = false;

function registerProductionProtocol(webDistDir) {
  if (productionProtocolRegistered) {
    return;
  }

  const normalizedRoot = path.normalize(webDistDir);
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : normalizedRoot + path.sep;

  protocol.registerFileProtocol(
    'app',
    (request, callback) => {
      try {
        const url = new URL(request.url);
        let relativePath = decodeURIComponent(url.pathname);

        if (!relativePath || relativePath === '/') {
          relativePath = 'index.html';
        } else {
          relativePath = relativePath.replace(/^\/+/, '');
        }

        const resolvedPath = path.normalize(path.join(normalizedRoot, relativePath));

        if (!resolvedPath.startsWith(rootWithSep)) {
          callback({ error: -6 });
          return;
        }

        callback({ path: resolvedPath });
      } catch (error) {
        callback({ error: -2 });
      }
    },
    (error) => {
      if (error) {
        throw new Error(`Не удалось зарегистрировать файловый протокол для desktop-клиента: ${error.message}`);
      }
    }
  );

  productionProtocolRegistered = true;
}

function loadContent(win) {
  const devServerUrl = process.env.DEV_SERVER_URL;

  if (!app.isPackaged && devServerUrl) {
    win.loadURL(devServerUrl);
    return;
  }

  const webDistDir = resolveWebDistDir();
  const indexPath = path.join(webDistDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `В каталоге веб-сборки отсутствует index.html (${indexPath}). ` +
        'Проверьте, что веб-клиент собран полностью.'
    );
  }

  registerProductionProtocol(webDistDir);
  win.loadURL('app://simple-logger/index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  try {
    loadContent(win);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Simple Logger Desktop', message);
    app.quit();
  }
}

app.on('ready', () => {
  if (!process.env.DEV_SERVER_URL && !app.isPackaged) {
    process.env.DEV_SERVER_URL = DEFAULT_DEV_SERVER_URL;
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
