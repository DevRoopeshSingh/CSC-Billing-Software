"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { User, UserRole } from "@/shared/types";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import { Plus, Shield, User as UserIcon, Trash2, Key, Loader2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersSettingsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await ipc<User[]>(IPC.USERS_LIST);
      setUsers(data);
    } catch (err: any) {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      toast("Cannot disable your own account", "error");
      return;
    }
    try {
      await ipc(IPC.USERS_UPDATE, targetUser.id, { isActive: !targetUser.isActive });
      toast(`User ${targetUser.username} ${!targetUser.isActive ? 'activated' : 'disabled'}`, "success");
      loadUsers();
    } catch (err: any) {
      toast("Failed to update user", "error");
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        You do not have permission to access user settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage staff access and roles across the billing system.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} className="group transition-colors hover:bg-muted/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold uppercase">
                      {u.username.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.username}</p>
                      {u.email && <p className="text-[11px] text-muted-foreground">{u.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                    u.role === "admin" ? "bg-red-500/10 text-red-500" :
                    u.role === "staff" ? "bg-blue-500/10 text-blue-500" :
                    "bg-gray-500/10 text-gray-500"
                  )}>
                    {u.role === "admin" && <Shield className="h-3 w-3" />}
                    {u.role === "staff" && <Edit2 className="h-3 w-3" />}
                    {u.role === "viewer" && <UserIcon className="h-3 w-3" />}
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-block rounded-full px-2.5 py-1 text-[11px] font-medium",
                    u.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                  )}>
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setShowPasswordModal(u.id!)}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                      title="Change Password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleActive(u)}
                      disabled={u.id === currentUser?.id}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      title={u.isActive ? "Disable User" : "Enable User"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdded={loadUsers} />}
      {showPasswordModal && <ChangePasswordModal userId={showPasswordModal} onClose={() => setShowPasswordModal(null)} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ username: "", password: "", role: "staff" as UserRole });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await ipc(IPC.USERS_CREATE, formData);
      toast("User created successfully", "success");
      onAdded();
      onClose();
    } catch (err: any) {
      toast(err.message || "Failed to create user", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add New User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Username</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Role</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ userId, onClose }: { userId: number, onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await ipc(IPC.USERS_CHANGE_PASSWORD, { userId, newPassword: password });
      toast("Password updated successfully", "success");
      onClose();
    } catch (err: any) {
      toast(err.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
