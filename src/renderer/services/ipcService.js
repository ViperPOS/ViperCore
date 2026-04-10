const electron = typeof window !== 'undefined' && window.require
  ? window.require('electron')
  : null;

const ipcRenderer = electron?.ipcRenderer || null;
const listenerMap = new Map();

function getChannelMap(channel) {
  if (!listenerMap.has(channel)) {
    listenerMap.set(channel, new Map());
  }
  return listenerMap.get(channel);
}

/**
 * IPC Service for bidirectional communication between React and Electron main process
 */
export const ipcService = {
  isAvailable: () => Boolean(ipcRenderer),

  // Send message to main process without expecting response
  send: (channel, ...args) => {
    if (!ipcRenderer) return;
    ipcRenderer.send(channel, ...args);
  },

  // Send message and expect response
  invoke: async (channel, ...args) => {
    if (!ipcRenderer) {
      throw new Error('ipcRenderer is not available in this environment');
    }
    return await ipcRenderer.invoke(channel, ...args);
  },

  // Listen for messages from main process
  on: (channel, callback) => {
    if (!ipcRenderer) return;
    const wrapped = (event, ...args) => {
      callback(...args);
    };

    const channelMap = getChannelMap(channel);
    channelMap.set(callback, wrapped);
    ipcRenderer.on(channel, wrapped);
  },

  // One-time listener
  once: (channel, callback) => {
    if (!ipcRenderer) return;
    ipcRenderer.once(channel, (event, ...args) => {
      callback(...args);
    });
  },

  // Remove listener
  removeListener: (channel, callback) => {
    if (!ipcRenderer) return;
    const channelMap = listenerMap.get(channel);
    const wrapped = channelMap?.get(callback);
    if (!wrapped) return;
    ipcRenderer.removeListener(channel, wrapped);
    channelMap.delete(callback);
  },

  // Send an event and wait for a single reply event.
  requestReply: (sendChannel, replyChannel, payload, timeoutMs = 10000) => {
    if (!ipcRenderer) {
      return Promise.reject(new Error('ipcRenderer is not available in this environment'));
    }

    return new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        ipcRenderer.removeListener(replyChannel, onReply);
      };

      const onReply = (_event, data) => {
        cleanup();
        resolve(data);
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${replyChannel}`));
      }, timeoutMs);

      ipcRenderer.on(replyChannel, onReply);
      ipcRenderer.send(sendChannel, payload);
    });
  },
};

export default ipcService;
