// src/lib/ipc.ts
// Thin typed wrapper around window.ipc.invoke.
// - Surfaces { error } shapes from the main process as thrown Errors so call
//   sites can toast or retry instead of silently receiving null.
// - Works in SSR / pre-hydration by returning a rejected promise.
// - Transparently injects the session token (from localStorage) as the first
//   argument of every IPC call. The main-process safeHandle wrapper unpacks
//   the token, validates it, and only then runs the handler. This means call
//   sites stay unchanged: `ipc(IPC.CUSTOMERS_LIST)` works as before.
//
// Token-bearing endpoints (resume, logout) need to send the token as a
// regular user-arg too, because their handlers are "public" and the wrapper
// discards the auth slot. ipcRaw() is provided for that case.

import type { IpcChannel } from "@/shared/ipc-channels";

export const BRIDGE_UNAVAILABLE_CODE = "IPC_BRIDGE_UNAVAILABLE";
export const TOKEN_STORAGE_KEY = "csc_auth_token";

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

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Internal: invoke without inspecting the result envelope.
async function invokeRaw(channel: IpcChannel, args: unknown[]): Promise<unknown> {
  if (!isBridgeAvailable()) {
    throw new IpcError(
      channel,
      "IPC bridge not available — open the desktop app instead of the browser preview.",
      BRIDGE_UNAVAILABLE_CODE
    );
  }
  return window.ipc!.invoke(channel, ...args);
}

function unwrap<T>(channel: IpcChannel, result: unknown): T {
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

export async function ipc<T = unknown>(
  channel: IpcChannel,
  ...args: unknown[]
): Promise<T> {
  const token = readToken();
  // Token always occupies arg slot 0; safeHandle in the main process unpacks
  // it, validates against the in-memory session store, and rejects with
  // "Not authenticated" / "Forbidden" before the handler body runs.
  const result = await invokeRaw(channel, [token, ...args]);
  return unwrap<T>(channel, result);
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
