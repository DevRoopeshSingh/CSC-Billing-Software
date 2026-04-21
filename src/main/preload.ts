// src/main/preload.ts
// Context-bridge: expose window.ipc.invoke, gated by a channel allowlist.

import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels";

const ALLOWED = new Set<string>(Object.values(IPC));

contextBridge.exposeInMainWorld("ipc", {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!ALLOWED.has(channel)) {
      return Promise.reject(
        new Error(`[preload] Channel not allowed: ${channel}`)
      );
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
