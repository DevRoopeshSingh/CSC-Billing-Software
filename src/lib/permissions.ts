"use client";

import { useAuth } from "@/lib/auth-context";

// Single source of truth for client-side permission checks. The backend
// remains the canonical authority — every IPC handler enforces its own
// policy via `safeHandle`. These hooks exist so that UI gates use one
// consistent name and meaning across the app.
//
//   useCanAdmin() → admin only        (settings, users, backups, branding)
//   useCanWrite() → admin or staff    (create/edit/delete/print)
//   useIsViewer() → viewer            (used for read-only flagging)

export function useCanAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === "admin";
}

export function useCanWrite(): boolean {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "staff";
}

export function useIsViewer(): boolean {
  const { user } = useAuth();
  return user?.role === "viewer";
}
