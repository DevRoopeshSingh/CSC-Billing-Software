"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Plus, Clock, Loader2, IndianRupee, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shift {
  id: number;
  shiftDate: string;
  startingCash: number;
  expectedEndingCash: number;
  actualEndingCash: number;
  discrepancy: number;
  notes: string;
}

interface ShiftMath {
  lastShiftDate: string | null;
  startingCash: number;
  cashInvoices: number;
  cashExpenses: number;
  expectedEndingCash: number;
}

export default function ShiftsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // End Shift Modal
  const [showEndModal, setShowEndModal] = useState(false);
  const [mathLoading, setMathLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shiftMath, setShiftMath] = useState<ShiftMath | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (currentUser) {
      loadShifts();
    }
  }, [currentUser]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await api.get<Shift[]>("/api/shifts");
      setShifts(data);
    } catch (err) {
      toast("Failed to load shift history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEndShift = async () => {
    setShowEndModal(true);
    setMathLoading(true);
    try {
      const data = await api.get<ShiftMath>("/api/shifts/math");
      setShiftMath(data);
      setActualCash(""); // user needs to type it
    } catch (err) {
      toast("Failed to load expected cash data", "error");
    } finally {
      setMathLoading(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftMath) return;

    const actual = parseFloat(actualCash);
    if (isNaN(actual) || actual < 0) {
      toast("Please enter a valid actual cash amount", "error");
      return;
    }

    setIsSubmitting(true);
    const discrepancy = actual - shiftMath.expectedEndingCash;

    try {
      await api.post("/api/shifts", {
        startingCash: shiftMath.startingCash,
        expectedEndingCash: shiftMath.expectedEndingCash,
        actualEndingCash: actual,
        discrepancy,
        notes,
      });
      toast("Shift ended and cash recorded", "success");
      setShowEndModal(false);
      setNotes("");
      loadShifts();
    } catch (err) {
      toast("Failed to record shift handover", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Shift Handover Register</h2>
          <p className="text-sm text-muted-foreground mt-1">Reconcile physical cash drawer at the end of the shift.</p>
        </div>
        <button
          onClick={handleOpenEndShift}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Clock className="h-4 w-4" />
          End Shift
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Shift Ended</th>
              <th className="px-6 py-4 font-medium text-right">Starting Cash</th>
              <th className="px-6 py-4 font-medium text-right">Expected</th>
              <th className="px-6 py-4 font-medium text-right">Actual Counted</th>
              <th className="px-6 py-4 font-medium text-right">Discrepancy</th>
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
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <History className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  No shift handovers recorded yet.
                </td>
              </tr>
            ) : (
              shifts.map((shift) => (
                <tr key={shift.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    {new Date(shift.shiftDate).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
                    ₹{shift.startingCash.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
                    ₹{shift.expectedEndingCash.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    ₹{shift.actualEndingCash.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {shift.discrepancy === 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium text-xs bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Match</span>
                    ) : (
                      <span className={cn(
                        "font-medium text-xs px-2 py-1 rounded-full",
                        shift.discrepancy > 0 
                          ? "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" 
                          : "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
                      )}>
                        {shift.discrepancy > 0 ? "+" : ""}₹{shift.discrepancy.toFixed(2)}
                      </span>
                    )}
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
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground rounded-xl border border-border bg-card shadow-sm">
            <History className="mx-auto h-8 w-8 mb-3 opacity-20" />
            No shift handovers recorded yet.
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-sm font-medium">
                  {new Date(shift.shiftDate).toLocaleString()}
                </span>
                {shift.discrepancy === 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium text-[10px] bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Match</span>
                ) : (
                  <span className={cn(
                    "font-medium text-xs px-2 py-0.5 rounded-full",
                    shift.discrepancy > 0 
                      ? "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" 
                      : "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
                  )}>
                    {shift.discrepancy > 0 ? "+" : ""}₹{shift.discrepancy.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Expected</p>
                  <p className="font-medium">₹{shift.expectedEndingCash.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Actual Counted</p>
                  <p className="font-medium text-foreground">₹{shift.actualEndingCash.toFixed(2)}</p>
                </div>
              </div>
              {shift.notes && (
                <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded-lg">
                  {shift.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* End Shift Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">End Shift Reconciliation</h3>
            
            {mathLoading || !shiftMath ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Calculating expected cash...</p>
              </div>
            ) : (
              <form onSubmit={handleEndShift} className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm border border-border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Starting Cash:</span>
                    <span>₹{shiftMath.startingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Cash Invoices:</span>
                    <span className="text-green-600 dark:text-green-400">+ ₹{shiftMath.cashInvoices.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-b border-border/50 pb-2">
                    <span>- Cash Expenses:</span>
                    <span className="text-red-600 dark:text-red-400">- ₹{shiftMath.cashExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1">
                    <span>Expected Ending Cash:</span>
                    <span>₹{shiftMath.expectedEndingCash.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Physical Cash Counted (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                  />
                  {actualCash !== "" && !isNaN(parseFloat(actualCash)) && (
                    <p className={cn(
                      "text-xs mt-2",
                      parseFloat(actualCash) - shiftMath.expectedEndingCash === 0 ? "text-green-600" :
                      parseFloat(actualCash) - shiftMath.expectedEndingCash > 0 ? "text-blue-600" : "text-red-600"
                    )}>
                      Discrepancy: {(parseFloat(actualCash) - shiftMath.expectedEndingCash) > 0 ? "+" : ""}
                      ₹{(parseFloat(actualCash) - shiftMath.expectedEndingCash).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Notes (Optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Explain any discrepancy..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowEndModal(false)}
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
                    Confirm Handover
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
