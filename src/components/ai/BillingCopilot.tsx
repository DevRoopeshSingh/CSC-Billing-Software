"use client";
import React, { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

export default function BillingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string, data?: any, sql?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery })
      });
      const json = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "ai", content: `Error: ${json.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", content: json.explanation, data: json.data, sql: json.sql }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "ai", content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-[400px] bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-primary text-primary-content p-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18} /> Billing Copilot</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-primary-focus p-1 rounded"><X size={18} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/50">
            {messages.length === 0 && (
              <div className="text-center text-sm text-base-content/60 mt-10">
                Ask me about your billing data! <br/> e.g. "Total revenue this month" or "Top 5 customers"
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`p-3 rounded-lg max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-content rounded-br-none" : "bg-base-100 border border-base-300 rounded-bl-none"}`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
                {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                   <div className="mt-2 text-xs bg-base-100 border border-base-300 p-2 rounded w-full overflow-x-auto shadow-sm">
                     <table className="table table-xs w-full">
                       <thead>
                         <tr>{Object.keys(msg.data[0]).map(k => <th key={k}>{k}</th>)}</tr>
                       </thead>
                       <tbody>
                         {msg.data.slice(0, 5).map((row: any, rId: number) => (
                           <tr key={rId}>
                             {Object.values(row).map((val: any, cId: number) => <td key={cId}>{String(val)}</td>)}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {msg.data.length > 5 && <div className="text-center mt-1 text-base-content/50 p-1">...and {msg.data.length - 5} more</div>}
                   </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-base-100 border border-base-300 p-3 rounded-lg rounded-bl-none"><Loader2 className="animate-spin" size={16} /></div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-base-300 bg-base-100 flex gap-2">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Ask anything..." 
              className="input input-bordered input-sm flex-1"
            />
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-sm px-3">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="btn btn-circle btn-primary btn-lg shadow-lg hover:scale-105 transition-transform"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}
