const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Send a message to main process (fire-and-forget)
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },

  // Invoke a handler and await the result
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // Listen for a message from main process
  on: (channel, callback) => {
    const wrapped = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, wrapped);
    return wrapped;
  },

  // Listen once
  once: (channel, callback) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },

  // Remove a listener
  removeListener: (channel, wrapper) => {
    ipcRenderer.removeListener(channel, wrapper);
  },
});
