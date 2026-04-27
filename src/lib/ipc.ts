// src/lib/ipc.ts
// Thin typed wrapper around window.ipc.invoke.
// - Surfaces { error } shapes from the main process as thrown Errors
//   so call sites can toast or retry instead of silently receiving null.
// - Works in SSR / pre-hydration by returning a rejected promise.

import type { IpcChannel } from "@/shared/ipc-channels";

export const BRIDGE_UNAVAILABLE_CODE = "IPC_BRIDGE_UNAVAILABLE";

export class IpcError extends Error {
  channel: string;
  code?: string;
  constructor(channel: string, message: string, code?: string) {
    super(message);
    this.name = "IpcError";
    this.channel = channel;
    this.code = code;
  }
}

export function isBridgeAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.ipc);
}

export function isBridgeMissingError(err: unknown): err is IpcError {
  return err instanceof IpcError && err.code === BRIDGE_UNAVAILABLE_CODE;
}

export async function ipc<T = unknown>(
  channel: IpcChannel,
  ...args: unknown[]
): Promise<T> {
  if (!isBridgeAvailable()) {
    throw new IpcError(
      channel,
      "IPC bridge not available — open the desktop app instead of the browser preview.",
      BRIDGE_UNAVAILABLE_CODE
    );
  }
  const result = (await window.ipc!.invoke(channel, ...args)) as
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
