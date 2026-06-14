"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, Search, FileText, Calendar, AlertCircle } from "lucide-react";

interface CalendarEvent {
  event: string;
  start_date: string;
  end_date: string;
  type: "academic" | "holiday" | "exam";
}

interface HandbookResult {
  id: string;
  title: string;
  page: number;
  content: string;
}

export default function AcademicsWidget() {
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HandbookResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        setLoading(true);
        const res = await fetch("/api/academics/calendar");
        if (!res.ok) throw new Error("Academics offline");
        const data = await res.json();
        setCalendar(data.calendar || []);
      } catch (err) {
        setError("Academics server offline");
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // In academics-server we have search_handbook. Let's add direct endpoint support in the orchestrator
      // so the widget can hit it directly, or mock.
      // Let's implement `/api/academics/handbook?query=...` in orchestrator/src/server.ts!
      const res = await fetch(`/api/academics/handbook?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchResults([]);
      console.error("Handbook search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  // Get next 3 upcoming academic dates
  const upcomingAcademicDates = calendar
    .filter(item => new Date(item.start_date) >= new Date())
    .slice(0, 3);

  return (
    <div className="glass-panel glow-card rounded-xl p-5 flex flex-col h-[360px]">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-purple-400" size={20} />
          <h3 className="font-semibold text-sm">Academic Policy & Calendar</h3>
        </div>
        
        {error ? (
          <span className="text-xs bg-[var(--status-offline-bg)] text-[var(--status-offline)] px-2.5 py-0.5 rounded font-semibold">Offline</span>
        ) : (
          <span className="text-xs bg-[var(--status-online-bg)] text-[var(--status-online)] px-2.5 py-0.5 rounded font-semibold">Online</span>
        )}
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-red-500/5 rounded-lg border border-red-500/10">
          <AlertCircle className="text-red-500 mb-2" size={32} />
          <p className="text-xs font-semibold text-foreground/80">Academics Service Offline</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Curriculums, handbook policies, and exam timetables are temporarily unavailable.</p>
        </div>
      ) : (
        <>
          {/* Handbook Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendance, grade, rules..."
                className="w-full bg-secondary/60 text-xs px-3 py-2.5 pl-8 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
            </div>
            <button 
              type="submit" 
              disabled={searching}
              className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {searching ? "..." : "Search"}
            </button>
          </form>

          {/* Dynamic Content Pane: Search Results OR Calendar Milestones */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm">
            {searchQuery && searchResults.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
                  <span>Policy Matches</span>
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-primary hover:underline font-semibold">Clear</button>
                </div>
                {searchResults.map(res => (
                  <div key={res.id} className="p-2.5 border border-border bg-slate-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1 font-semibold text-foreground text-sm">
                      <span>{res.title}</span>
                      <span className="text-xs text-muted-foreground font-mono">Page {res.page}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{res.content}</p>
                  </div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-2">
                <span>No matching policies found. Try another query or check spelling.</span>
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-primary hover:underline mt-1.5 text-xs">Show Academic Calendar</button>
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                  <Calendar size={12} />
                  <span>Upcoming Term Milestones</span>
                </div>
                {upcomingAcademicDates.length > 0 ? (
                  upcomingAcademicDates.map((milestone, idx) => (
                    <div key={idx} className="p-2.5 border border-border bg-slate-900/10 rounded-lg flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-foreground/80 block truncate text-sm">{milestone.event}</span>
                        <span className="text-xs text-muted-foreground block font-mono mt-0.5">{milestone.start_date} {milestone.end_date !== milestone.start_date ? `to ${milestone.end_date}` : ""}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        milestone.type === "exam" 
                          ? "bg-red-500/10 text-red-500" 
                          : milestone.type === "holiday" 
                          ? "bg-yellow-500/10 text-yellow-500" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {milestone.type}
                      </span>
                    </div>
                  ))
                ) : (
                  // If all dates are past in calendar.json (since it is set in 2026 and current date is 2026),
                  // show the full calendar list instead
                  calendar.slice(0, 3).map((milestone, idx) => (
                    <div key={idx} className="p-2.5 border border-border bg-slate-900/10 rounded-lg flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-foreground/80 block truncate text-sm">{milestone.event}</span>
                        <span className="text-xs text-muted-foreground block font-mono mt-0.5">{milestone.start_date} {milestone.end_date !== milestone.start_date ? `to ${milestone.end_date}` : ""}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        milestone.type === "exam" 
                          ? "bg-red-500/10 text-red-500" 
                          : milestone.type === "holiday" 
                          ? "bg-yellow-500/10 text-yellow-500" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {milestone.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

}
