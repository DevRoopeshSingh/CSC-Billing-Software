"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Loader2, ShieldCheck, User, Tag, Clock } from "lucide-react";

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    loadLogs();
  }, [currentUser]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get<AuditLog[]>("/api/audit");
      setLogs(data);
    } catch (err) {
      toast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-50" />
        <div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-1 text-sm max-w-sm">
            Only administrators can view the system audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Compliance & Audit Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable timeline of significant system actions.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Entity</th>
              <th className="px-6 py-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Loading logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {log.user.name}
                      </div>
                    ) : (
                      "System / Unknown"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${
                      log.action === "CREATE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      log.action === "UPDATE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      log.action === "DELETE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      {log.entityType} <span className="font-mono text-xs opacity-60">#{log.entityId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {log.details ? JSON.stringify(log.details) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
