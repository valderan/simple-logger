#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');

const args = process.argv.slice(2);
const filteredArgs = [];
let devMode = false;

for (const arg of args) {
  if (arg === '--dev') {
    devMode = true;
    continue;
  }
  filteredArgs.push(arg);
}

if (devMode && !process.env.DEV_SERVER_URL) {
  process.env.DEV_SERVER_URL = 'http://localhost:5173';
}

const child = spawn(electron, ['.'].concat(filteredArgs), {
  stdio: 'inherit',
  env: process.env,
  cwd: path.resolve(__dirname, '..')
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
