#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');
const defaultSource = path.resolve(projectRoot, '..', 'client', 'dist');
const customSource = process.env.WEB_SOURCE_DIR || process.env.SIMPLE_LOGGER_WEB_DIST;
const sourceDir = customSource
  ? path.resolve(projectRoot, customSource)
  : defaultSource;
const targetDir = path.resolve(projectRoot, 'web-dist');

async function ensureSource() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `Каталог с веб-сборкой не найден: ${sourceDir}. ` +
        'Сначала выполните сборку React-клиента (`npm run build` в ./client) или задайте WEB_SOURCE_DIR.'
    );
  }
}

async function copyWebDist() {
  await ensureSource();
  await fsExtra.ensureDir(targetDir);
  await fsExtra.emptyDir(targetDir);
  await fsExtra.copy(sourceDir, targetDir, { dereference: true });
  console.log(`Веб-сборка скопирована из ${sourceDir} в ${targetDir}`);
}

copyWebDist().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
