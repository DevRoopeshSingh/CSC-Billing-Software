"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Plus, Receipt, Loader2, IndianRupee, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  expenseDate: string;
  paymentMode: string;
}

export default function ExpensesPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "Other",
    description: "",
    paymentMode: "Cash",
  });

  const categories = ["Tea/Snacks", "Stationary", "Internet/Utilities", "Maintenance", "Travel", "Other"];
  const paymentModes = ["Cash", "UPI", "Card"];

  useEffect(() => {
    if (currentUser) {
      loadExpenses();
    }
  }, [currentUser]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.get<Expense[]>("/api/expenses");
      setExpenses(data);
    } catch (err) {
      toast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/expenses", {
        amount: amountNum,
        category: newExpense.category,
        description: newExpense.description,
        paymentMode: newExpense.paymentMode,
      });
      toast("Expense added successfully", "success");
      setShowAddModal(false);
      setNewExpense({ amount: "", category: "Other", description: "", paymentMode: "Cash" });
      loadExpenses();
    } catch (err) {
      toast("Failed to add expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Daily Expense Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1">Log shop expenses and petty cash flow.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Mode</th>
              <th className="px-6 py-4 text-right font-medium">Amount</th>
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
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Receipt className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {expense.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {expense.paymentMode}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-foreground">
                    ₹{expense.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
            Loading...
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground rounded-xl border border-border bg-card shadow-sm">
            <Receipt className="mx-auto h-8 w-8 mb-3 opacity-20" />
            No expenses recorded yet.
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {expense.category}
                </span>
                <span className="text-lg font-bold text-foreground">
                  ₹{expense.amount.toFixed(2)}
                </span>
              </div>
              {expense.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {expense.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {expense.paymentMode}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Payment Mode</label>
                <div className="flex gap-2">
                  {paymentModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNewExpense({ ...newExpense, paymentMode: mode })}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                        newExpense.paymentMode === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description (Optional)</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="e.g. Tea for customers"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
