// src/shared/electron.d.ts
// Type declarations for the preload-exposed IPC bridge.

import type { IpcChannel } from "./ipc-channels";

export {};

declare global {
  interface Window {
    ipc?: {
      invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]) => Promise<T>;
    };
  }
}
