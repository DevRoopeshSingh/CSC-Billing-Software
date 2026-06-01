"use client";
import React, { useState } from "react";
import { Wand2, X, Loader2, Copy, Check } from "lucide-react";

interface ReminderModalProps {
  customerName: string;
  invoiceId: string;
  amount: number;
  dueDate?: string;
  services: string[];
}

export default function ReminderModal({ customerName, invoiceId, amount, dueDate, services }: ReminderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [whatsappBody, setWhatsappBody] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  const generateReminder = async () => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, invoiceId, amount, dueDate, services })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailBody(data.emailBody);
        setWhatsappBody(data.whatsappBody);
      } else {
        setEmailBody(`Error: ${data.error}`);
      }
    } catch (error) {
      setEmailBody("Failed to generate reminder.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'email' | 'wa') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2000);
    }
  };

  return (
    <>
      <button onClick={generateReminder} className="inline-flex items-center gap-2 rounded-md border border-warning px-3 py-1.5 text-sm font-medium text-warning hover:bg-warning hover:text-white">
        <Wand2 size={16} /> Generate Reminder
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl border border-border w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Wand2 className="text-warning" size={20} /> AI Payment Reminder
              </h3>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-2 hover:bg-background">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Drafting personalized reminder...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">WhatsApp Message</label>
                      <button onClick={() => handleCopy(whatsappBody, 'wa')} className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs hover:bg-muted">
                        {copiedWa ? <Check size={14} className="text-success" /> : <Copy size={14} />} 
                        {copiedWa ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <textarea 
                      className="w-full h-32 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={whatsappBody}
                      onChange={(e) => setWhatsappBody(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">Email Template</label>
                      <button onClick={() => handleCopy(emailBody, 'email')} className="inline-flex items-center gap-1 rounded-md p-1.5 text-xs hover:bg-muted">
                        {copiedEmail ? <Check size={14} className="text-success" /> : <Copy size={14} />} 
                        {copiedEmail ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <textarea 
                      className="w-full h-48 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
