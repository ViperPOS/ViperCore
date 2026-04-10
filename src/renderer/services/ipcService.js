const { ipcRenderer } = require('electron');

/**
 * IPC Service for bidirectional communication between React and Electron main process
 */
export const ipcService = {
  // Send message to main process without expecting response
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },

  // Send message and expect response
  invoke: async (channel, ...args) => {
    return await ipcRenderer.invoke(channel, ...args);
  },

  // Listen for messages from main process
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => {
      callback(...args);
    });
  },

  // One-time listener
  once: (channel, callback) => {
    ipcRenderer.once(channel, (event, ...args) => {
      callback(...args);
    });
  },

  // Remove listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

export default ipcService;
