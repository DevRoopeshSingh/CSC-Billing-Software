"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { LoginRequest, SetupRequest, UserRole } from "@/shared/types";
import { api, ApiError } from "./api-client";
import { API } from "./api-routes";

// The renderer never holds a session token. The HttpOnly `csc_session` cookie
// does, and the server re-derives the canonical user (id, username, role) on
// every /api/auth/session call. Editing client state cannot grant a role.

interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  const checkInitialState = useCallback(async () => {
    try {
      const firstRun = await api.get<boolean>(API.AUTH_CHECK_FIRST_RUN);
      setIsFirstRun(firstRun);

      if (!firstRun) {
        const me = await api.get<{ user: SessionUser | null }>(
          API.AUTH_SESSION
        );
        setUser(me.user);
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
      const res = await api.post<{ user: SessionUser }>(
        API.AUTH_LOGIN,
        credentials
      );
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Login failed");
    }
  };

  const logout = async () => {
    try {
      await api.post(API.AUTH_LOGOUT);
    } catch {
      // Ignore — cookie wipe is server-side and we're tearing down anyway.
    }
    setUser(null);
  };

  const setupAdmin = async (data: SetupRequest) => {
    try {
      const res = await api.post<{ user: SessionUser }>(API.AUTH_SETUP, data);
      setUser(res.user);
      setIsFirstRun(false);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Setup failed");
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<{ user: SessionUser | null }>(API.AUTH_SESSION);
      setUser(me.user);
    } catch {
      // Transport failure — leave existing state.
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
