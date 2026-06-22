"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import { Plus, Clock, Loader2, IndianRupee, History, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shift {
  id: number;
  status: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  expectedEndingCash: number;
  actualEndingCash: number;
  totalCashCollected: number;
  digitalPaymentsCollected: number;
  udharIssued: number;
  expensesDuringShift: number;
  discrepancy: number;
  notes: string;
}

interface ShiftMath {
  startTime: string;
  startingCash: number;
  totalCashCollected: number;
  digitalPaymentsCollected: number;
  udharIssued: number;
  expensesDuringShift: number;
  expectedEndingCash: number;
}

export default function ShiftsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  
  const [mathLoading, setMathLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [shiftMath, setShiftMath] = useState<ShiftMath | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [history, active] = await Promise.all([
        api.get<Shift[]>("/api/shifts"),
        api.get<Shift | null>("/api/shifts/active").catch(() => null)
      ]);
      setShifts(history);
      setActiveShift(active);
    } catch (err) {
      toast("Failed to load shift data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const starting = parseFloat(openingCash);
    if (isNaN(starting) || starting < 0) {
      toast("Please enter a valid starting cash amount", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/api/shifts", { startingCash: starting });
      toast("Shift started successfully", "success");
      setShowStartModal(false);
      setOpeningCash("");
      loadData();
    } catch (err) {
      toast("Failed to start shift", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEndShift = async () => {
    if (!activeShift) return;
    setShowEndModal(true);
    setMathLoading(true);
    try {
      const data = await api.get<ShiftMath>(`/api/shifts/${activeShift.id}/math`);
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
    if (!shiftMath || !activeShift) return;

    const actual = parseFloat(actualCash);
    if (isNaN(actual) || actual < 0) {
      toast("Please enter a valid actual cash amount", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/shifts/${activeShift.id}/close`, {
        actualEndingCash: actual,
        notes,
      });
      toast("Shift ended and cash reconciled", "success");
      setShowEndModal(false);
      setNotes("");
      loadData();
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
          <p className="text-sm text-muted-foreground mt-1">Manage opening cash and reconcile physical cash drawer at the end of the shift.</p>
        </div>
        {!loading && (
          activeShift ? (
            <button
              onClick={handleOpenEndShift}
              className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              End Shift
            </button>
          ) : (
            <button
              onClick={() => setShowStartModal(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Clock className="h-4 w-4" />
              Start Shift
            </button>
          )
        )}
      </div>

      {activeShift && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-wide">Current Shift Active</p>
              <p className="text-xl font-bold">Started at {new Date(activeShift.startTime).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="flex gap-8 text-center md:text-right">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Opening Cash</p>
              <p className="text-lg font-bold">₹{activeShift.startingCash.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

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
            <div key={shift.id} className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3",
              shift.status === "ACTIVE" && "border-primary/50 bg-primary/5"
            )}>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div>
                  <div className="font-medium text-foreground">
                    {new Date(shift.startTime).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(shift.startTime).toLocaleTimeString()} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'Active'}
                  </div>
                </div>
                <div className="text-right">
                  {shift.status === "ACTIVE" ? (
                    <span className="text-xs font-medium text-primary">In Progress</span>
                  ) : shift.discrepancy === 0 ? (
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
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs uppercase">Opening:</span>
                  <span className="font-medium">₹{shift.startingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs uppercase">Cash In:</span>
                  <span className="font-medium text-green-600">+₹{shift.totalCashCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs uppercase">Digital:</span>
                  <span className="font-medium">₹{shift.digitalPaymentsCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs uppercase">Expenses:</span>
                  <span className="font-medium text-red-500">-₹{shift.expensesDuringShift.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop History Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Shift Time</th>
              <th className="px-6 py-4 font-medium text-right">Opening</th>
              <th className="px-6 py-4 font-medium text-right">Cash In</th>
              <th className="px-6 py-4 font-medium text-right">Digital</th>
              <th className="px-6 py-4 font-medium text-right">Expenses</th>
              <th className="px-6 py-4 font-medium text-right">Discrepancy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Loading...
                </td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <History className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  No shift handovers recorded yet.
                </td>
              </tr>
            ) : (
              shifts.map((shift) => (
                <tr key={shift.id} className={cn("transition-colors hover:bg-muted/30", shift.status === "ACTIVE" && "bg-primary/5")}>
                  <td className="px-6 py-4">
                    <div className="font-medium">
                      {new Date(shift.startTime).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(shift.startTime).toLocaleTimeString()} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'Active'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
                    ₹{shift.startingCash.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">
                    +₹{shift.totalCashCollected.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">
                    ₹{shift.digitalPaymentsCollected.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-500">
                    -₹{shift.expensesDuringShift.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {shift.status === "ACTIVE" ? (
                      <span className="text-xs font-medium text-primary">In Progress</span>
                    ) : shift.discrepancy === 0 ? (
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

      {/* Start Shift Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Start New Shift</h3>
            <form onSubmit={handleStartShift} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Opening Cash in Drawer (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
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
                  Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <span>Opening Cash:</span>
                    <span>₹{shiftMath.startingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Cash Collected:</span>
                    <span className="text-green-600 dark:text-green-400">+ ₹{shiftMath.totalCashCollected.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-b border-border/50 pb-2">
                    <span>- Expenses (Cash):</span>
                    <span className="text-red-500">- ₹{shiftMath.expensesDuringShift.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1">
                    <span>Expected Cash in Drawer:</span>
                    <span>₹{shiftMath.expectedEndingCash.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="rounded border border-border p-3">
                        <p className="text-xs text-muted-foreground uppercase">Digital Received</p>
                        <p className="font-medium">₹{shiftMath.digitalPaymentsCollected.toFixed(2)}</p>
                    </div>
                    <div className="rounded border border-border p-3">
                        <p className="text-xs text-muted-foreground uppercase">Udhar Issued</p>
                        <p className="font-medium">₹{shiftMath.udharIssued.toFixed(2)}</p>
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
                      "text-xs mt-2 font-medium",
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
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
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
