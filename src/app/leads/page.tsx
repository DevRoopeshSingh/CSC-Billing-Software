"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Plus, Users, Loader2, Phone, Mail, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";

interface Lead {
  id: number;
  name: string;
  mobile: string;
  email: string;
  serviceInterest: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
}

export default function LeadsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    mobile: "",
    email: "",
    serviceInterest: "",
    source: "manual",
    status: "NEW",
    notes: "",
  });

  useEffect(() => {
    if (currentUser) loadLeads();
  }, [currentUser]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.get<Lead[]>("/api/leads");
      setLeads(data);
    } catch (err) {
      toast("Failed to load leads", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name.trim()) return toast("Name is required", "error");

    setIsSubmitting(true);
    try {
      await api.post("/api/leads", newLead);
      toast("Lead added successfully", "success");
      setShowAddModal(false);
      setNewLead({ name: "", mobile: "", email: "", serviceInterest: "", source: "manual", status: "NEW", notes: "" });
      loadLeads();
    } catch (err) {
      toast("Failed to add lead", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.patch(`/api/leads/${id}`, { status });
      toast("Status updated", "success");
      loadLeads();
    } catch {
      toast("Failed to update status", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lead Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Track prospective customers and inquiries.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Name & Contact</th>
              <th className="px-6 py-4 font-medium">Service Interest</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  No leads recorded yet.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{lead.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {lead.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.mobile}</span>}
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {lead.serviceInterest || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={cn(
                        "text-xs font-medium rounded-full px-2.5 py-1 border outline-none",
                        lead.status === "NEW" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        lead.status === "CONTACTED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        lead.status === "CONVERTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-gray-50 text-gray-700 border-gray-200"
                      )}
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <button className="hover:text-primary transition-colors" title={lead.notes}>
                      <FileText className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add New Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Mobile</label>
                  <input
                    type="tel"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newLead.mobile}
                    onChange={(e) => setNewLead({ ...newLead, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Service Interest</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newLead.serviceInterest}
                  onChange={(e) => setNewLead({ ...newLead, serviceInterest: e.target.value })}
                  placeholder="e.g. PAN Card, Passport"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Notes (Optional)</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
