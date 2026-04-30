"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ShieldCheck, User, Lock, Key } from "lucide-react";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export function SetupScreen() {
  const { setupAdmin } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    if (adminPin.length < 4) {
      toast("Admin PIN must be at least 4 characters", "error");
      return;
    }

    setLoading(true);
    try {
      await setupAdmin({ username, password, adminPin });
      toast("Admin setup complete!", "success");
    } catch (err: any) {
      toast(err.message || "Setup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="bg-primary px-6 py-8 text-center text-primary-foreground">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Initial Setup</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">Create your admin account and global PIN.</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Admin Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="admin"
                  required
                  minLength={3}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">Global Admin PIN</label>
              <p className="mb-2 text-[11px] text-muted-foreground leading-tight">
                This PIN will be required for destructive actions like deleting invoices or customers. Keep it safe.
              </p>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 1234"
                  required
                  minLength={4}
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword || !adminPin}
            className={cn(
              "mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors",
              "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Creating Admin..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
