// src/lib/ipc.ts
// Thin typed wrapper around window.ipc.invoke.
// - Surfaces { error } shapes from the main process as thrown Errors
//   so call sites can toast or retry instead of silently receiving null.
// - Works in SSR / pre-hydration by returning a rejected promise.

import type { IpcChannel } from "@/shared/ipc-channels";

export class IpcError extends Error {
  channel: string;
  constructor(channel: string, message: string) {
    super(message);
    this.name = "IpcError";
    this.channel = channel;
  }
}

export async function ipc<T = unknown>(
  channel: IpcChannel,
  ...args: unknown[]
): Promise<T> {
  if (typeof window === "undefined" || !window.ipc) {
    throw new IpcError(channel, "IPC bridge not available");
  }
  const result = (await window.ipc.invoke(channel, ...args)) as
    | T
    | { error: string };
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string"
  ) {
    throw new IpcError(channel, (result as { error: string }).error);
  }
  return result as T;
}

export async function ipcTry<T = unknown>(
  channel: IpcChannel,
  ...args: unknown[]
): Promise<T | null> {
  try {
    return await ipc<T>(channel, ...args);
  } catch {
    return null;
  }
}
