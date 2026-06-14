"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, ArrowRight } from "lucide-react";

export default function QuickAskPulse() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/assistant?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    router.push(`/assistant?q=${encodeURIComponent(suggestion)}`);
  };

  const suggestions = [
    "What is for lunch today?",
    "Is 'Introduction to Algorithms' available?",
    "When is the next shuttle bus?",
    "When are the final exams?"
  ];

  return (
    <div className="glass-panel rounded-xl p-6 glow-card w-full border border-white/10 relative overflow-hidden animate-entrance">
      {/* Background ambient decorative gradient glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Quick Ask Pulse</h3>
          <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
            AI Assistant
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Query the live federated campus network in plain English.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about books, mess menus, academic policies, or shuttle times..."
              className="w-full bg-secondary/40 text-xs px-4 py-3 pl-10 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground placeholder-muted-foreground transition-all duration-200"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-primary/20 shrink-0 hover:translate-x-0.5"
          >
            <span>Ask</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Suggestions Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10.5px]">
          <span className="text-muted-foreground">Try asking:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              className="px-2.5 py-1 border border-border hover:border-primary/30 bg-secondary/20 hover:bg-secondary/65 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer font-medium"
              suppressHydrationWarning
            >
              {sug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
