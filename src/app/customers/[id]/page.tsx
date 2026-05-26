"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import type { Customer } from "@/shared/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Tag, 
  UploadCloud, 
  FileText, 
  Trash2,
  Download
} from "lucide-react";

type CustomerDocument = {
  id: number;
  customerId: number;
  name: string;
  mimeType: string;
  filePath: string;
  createdAt: string;
};

const fetcher = <T,>(url: string) => api.get<T>(url);

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const { data: customer, isLoading } = useSWR<Customer>(API.CUSTOMER(id), fetcher);
  const { data: documents = [], mutate: loadDocs } = useSWR<CustomerDocument[]>(`/api/customers/${id}/documents`, fetcher);

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = window.prompt("Document name (e.g. Aadhaar Front):");
    if (!name) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    try {
      const res = await fetch(`/api/customers/${id}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      toast("Document uploaded", "success");
      loadDocs();
    } catch (err) {
      toast("Failed to upload document", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/api/customers/${id}/documents/${docId}`);
      toast("Document deleted", "success");
      loadDocs();
    } catch {
      toast("Failed to delete document", "error");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="p-8 text-center text-muted-foreground">Customer not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {customer.mobile && (
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {customer.mobile}</span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {customer.email}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Profile Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Aadhaar</span>
              <span className="font-medium text-foreground">{customer.aadhaarNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">PAN</span>
              <span className="font-medium text-foreground">{customer.panNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-foreground">{customer.address || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Loyalty Points</span>
              <span className="font-bold text-purple-600">{customer.loyaltyPoints || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tags</span>
              <span className="font-medium text-foreground">{customer.tags || "—"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Documents</h2>
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
              <UploadCloud className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload"}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*,.pdf" />
            </label>
          </div>
          <div className="flex-1 p-4 overflow-y-auto max-h-64 space-y-2">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center mt-4">No documents uploaded.</p>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-background/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/api/customers/${id}/documents/${doc.id}`} target="_blank" className="p-1.5 text-muted-foreground hover:bg-background rounded-md transition-colors" title="Download">
                      <Download className="h-4 w-4" />
                    </a>
                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
