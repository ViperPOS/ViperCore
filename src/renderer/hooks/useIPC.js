import { useEffect, useCallback } from 'react';
import ipcService from '../services/ipcService';

/**
 * Hook for listening to IPC events from the main process
 * @param {string} channel - IPC channel name
 * @param {function} callback - Callback function when message is received
 */
export function useIPC(channel, callback) {
  useEffect(() => {
    if (!channel || !callback) return;

    ipcService.on(channel, callback);

    return () => {
      ipcService.removeListener(channel, callback);
    };
  }, [channel, callback]);
}

/**
 * Hook for invoking IPC calls to the main process
 * @returns {function} - invoke function with signature invoke(channel, ...args)
 */
export function useIPCInvoke() {
  return useCallback((channel, ...args) => {
    return ipcService.invoke(channel, ...args);
  }, []);
}

export default useIPC;
