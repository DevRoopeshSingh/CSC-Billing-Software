"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Plus, HelpCircle, Loader2, BookOpen } from "lucide-react";

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
}

export default function HelpPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFaq, setNewFaq] = useState({
    question: "",
    answer: "",
    category: "General",
  });

  useEffect(() => {
    if (currentUser) loadFaqs();
  }, [currentUser]);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const data = await api.get<Faq[]>("/api/faq");
      setFaqs(data);
    } catch (err) {
      toast("Failed to load FAQs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/api/faq", newFaq);
      toast("FAQ added successfully", "success");
      setShowAddModal(false);
      setNewFaq({ question: "", answer: "", category: "General" });
      loadFaqs();
    } catch (err) {
      toast("Failed to add FAQ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by category for rendering
  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, Faq[]>);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground mt-1">Frequently asked questions and service guidelines.</p>
        </div>
        {currentUser?.role !== "viewer" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground border border-border rounded-xl bg-card">
          <HelpCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No knowledge base articles found.</p>
          <p className="text-sm mt-1">Start by adding your first FAQ.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(faqsByCategory).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {category}
              </h3>
              <div className="grid gap-4">
                {items.map(faq => (
                  <div key={faq.id} className="bg-card border border-border rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
                    <h4 className="font-semibold text-foreground mb-2 text-base">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Knowledge Base Entry</h3>
            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Question / Topic</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  placeholder="e.g. Services, Operations, General"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Answer / Content</label>
                <textarea
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
