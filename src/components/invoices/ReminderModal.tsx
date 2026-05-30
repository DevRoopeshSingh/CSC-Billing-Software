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
      <button onClick={generateReminder} className="btn btn-outline btn-warning btn-sm gap-2">
        <Wand2 size={16} /> Generate Reminder
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Wand2 className="text-warning" size={20} /> AI Payment Reminder
              </h3>
              <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-sm btn-circle">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Drafting personalized reminder...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">WhatsApp Message</label>
                      <button onClick={() => handleCopy(whatsappBody, 'wa')} className="btn btn-ghost btn-xs gap-1">
                        {copiedWa ? <Check size={14} className="text-success" /> : <Copy size={14} />} 
                        {copiedWa ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <textarea 
                      className="textarea textarea-bordered w-full h-32" 
                      value={whatsappBody}
                      onChange={(e) => setWhatsappBody(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">Email Template</label>
                      <button onClick={() => handleCopy(emailBody, 'email')} className="btn btn-ghost btn-xs gap-1">
                        {copiedEmail ? <Check size={14} className="text-success" /> : <Copy size={14} />} 
                        {copiedEmail ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <textarea 
                      className="textarea textarea-bordered w-full h-48" 
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
