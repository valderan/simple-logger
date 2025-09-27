const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('simpleLogger', {
  version: '1.1.0'
});
