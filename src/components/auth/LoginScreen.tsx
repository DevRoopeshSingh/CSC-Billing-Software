
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Lock, User, Key, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";

export function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Trim whitespace defensively — invisible trailing/leading spaces are a
    // common source of false-negative login failures.
    const u = username.trim();
    const p = password;
    if (!u || !p) return;

    setLoading(true);
    try {
      await login({ username: u, password: p });
      toast("Welcome back!", "success");
    } catch (err: any) {
      toast(err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="bg-primary px-6 py-8 text-center text-primary-foreground">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">CSC Billing</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter username" autoFocus
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !username || !password}
            className={cn(
              "mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors",
              "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>

      {showReset && (
        <ResetPasswordModal
          initialUsername={username}
          onClose={() => setShowReset(false)}
        />
      )}
    </div>
  );
}

function ResetPasswordModal({
  initialUsername,
  onClose,
}: {
  initialUsername: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState(initialUsername);
  const [adminPin, setAdminPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast("Username is required", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    if (adminPin.length < 4) {
      toast("Admin PIN is required", "error");
      return;
    }

    setLoading(true);
    try {
      await ipc(IPC.USERS_RESET_PASSWORD_BY_PIN, {
        username: username.trim(),
        adminPin,
        newPassword,
      });
      toast("Password reset. You can sign in now.", "success");
      onClose();
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Reset failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Key className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Reset password</h3>
              <p className="text-[11px] text-primary-foreground/80">
                Authorize with the global Admin PIN.
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="e.g. admin"
              required
              autoFocus={!initialUsername}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Admin PIN</label>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-widest focus:border-primary focus:outline-none"
              placeholder="••••"
              required
              minLength={4}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
