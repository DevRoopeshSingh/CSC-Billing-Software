"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, Plus } from "lucide-react";

interface ServiceSuggestionsProps {
  customerId: string | number;
  pastServices?: string[];
  onSelectService: (serviceName: string) => void;
}

export default function ServiceSuggestions({ customerId, pastServices = [], onSelectService }: ServiceSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: Number(customerId), pastServices })
        });
        
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestedServices || []);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [customerId, pastServices]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/60 py-2">
        <Sparkles size={16} className="animate-pulse text-primary" /> 
        <span>Analyzing customer patterns...</span>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="flex items-center gap-1 text-sm font-medium text-primary">
        <Sparkles size={14} /> AI Suggestions:
      </span>
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelectService(suggestion)}
          className="badge badge-primary badge-outline hover:badge-primary cursor-pointer gap-1 p-3 transition-colors"
        >
          {suggestion} <Plus size={12} />
        </button>
      ))}
    </div>
  );
}
