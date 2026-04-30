"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { LoginRequest, SetupRequest, UserRole } from "@/shared/types";
import { ipc, IpcError, TOKEN_STORAGE_KEY } from "./ipc";
import { IPC } from "@/shared/ipc-channels";

// The renderer never holds a full user record across reloads. It holds an
// opaque session token; the canonical user (id, username, role) is fetched
// from the main process on boot via USERS_RESUME_SESSION. This means that
// editing localStorage cannot grant a role: the main process re-derives
// everything from the DB.

interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
}

interface AuthLoginResponse {
  token: string;
  user: SessionUser;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  isFirstRun: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (data: SetupRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode, quota); fall through.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  const checkInitialState = useCallback(async () => {
    try {
      const firstRun = await ipc<boolean>(IPC.USERS_CHECK_FIRST_RUN);
      setIsFirstRun(firstRun);

      if (!firstRun) {
        const token = readToken();
        if (token) {
          // Resume returns the canonical user record from the DB, or null if
          // the token is unknown / expired / belongs to a disabled user.
          const me = await ipc<SessionUser | null>(
            IPC.USERS_RESUME_SESSION,
            token
          );
          if (me) {
            setUser(me);
          } else {
            writeToken(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to check auth state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkInitialState();
  }, [checkInitialState]);

  const login = async (credentials: LoginRequest) => {
    try {
      const res = await ipc<AuthLoginResponse>(IPC.USERS_LOGIN, credentials);
      writeToken(res.token);
      setUser(res.user);
    } catch (err) {
      if (err instanceof IpcError) throw err;
      throw new Error("Login failed");
    }
  };

  const logout = async () => {
    const token = readToken();
    if (token) {
      try {
        await ipc(IPC.USERS_LOGOUT, token);
      } catch {
        // Ignore — we're tearing down anyway.
      }
    }
    writeToken(null);
    setUser(null);
  };

  const setupAdmin = async (data: SetupRequest) => {
    try {
      const res = await ipc<AuthLoginResponse>(IPC.USERS_SETUP_ADMIN, data);
      writeToken(res.token);
      setUser(res.user);
      setIsFirstRun(false);
    } catch (err) {
      if (err instanceof IpcError) throw err;
      throw new Error("Setup failed");
    }
  };

  const refreshUser = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await ipc<SessionUser | null>(
        IPC.USERS_RESUME_SESSION,
        token
      );
      if (me) setUser(me);
      else {
        writeToken(null);
        setUser(null);
      }
    } catch {
      // Network/transport failure — leave existing state.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirstRun,
        login,
        logout,
        setupAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
