"use client";

import React, { useState, useEffect } from "react";
import { Bell, Bus, Navigation, MapPin, AlertCircle } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  importance: "high" | "medium" | "low";
}

interface Shuttle {
  route_id: string;
  name: string;
  stops: string[];
  timings: {
    weekdays: string;
    weekends: string;
  };
  driver_contact: string;
}

export default function NoticesTransportWidget() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [shuttles, setShuttles] = useState<Shuttle[]>([]);
  const [activeTab, setActiveTab] = useState<"notices" | "transit">("notices");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch notices
        const noticesUrl = filterCategory && filterCategory !== "all" 
          ? `/api/notices/latest?category=${filterCategory}` 
          : "/api/notices/latest";
        const noticesRes = await fetch(noticesUrl);
        if (!noticesRes.ok) throw new Error("Notices offline");
        const nData = await noticesRes.json();
        setNotices(nData.notices || []);

        // Fetch shuttle schedules
        const shuttleRes = await fetch("/api/shuttle/schedule");
        if (!shuttleRes.ok) throw new Error("Shuttle offline");
        const sData = await shuttleRes.json();
        setShuttles(sData.shuttles || []);
      } catch (err) {
        setError("Notices & Transport server offline");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filterCategory]);

  return (
    <div className="glass-panel glow-card rounded-xl p-5 flex flex-col h-[360px]">
      {/* Widget Header with Toggle */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div className="flex gap-3 text-sm">
          <button 
            onClick={() => setActiveTab("notices")} 
            className={`font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "notices" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell size={18} />
            <span>Notices</span>
          </button>
          <button 
            onClick={() => setActiveTab("transit")} 
            className={`font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "transit" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bus size={18} />
            <span>Shuttles</span>
          </button>
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
          <p className="text-xs font-semibold text-foreground/80">Transit & Notices Offline</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium font-sans">Shuttle bus trackings and official dean office announcements are temporarily unavailable.</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div className="h-6 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : activeTab === "notices" ? (
        /* Notices Tab Content */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Category Filter bar */}
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 text-xs">
            {["all", "exams", "fees", "holidays"].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-0.5 rounded-full font-semibold capitalize transition-all ${
                  filterCategory === cat 
                    ? "bg-secondary text-foreground border border-muted" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notices Scroll Box */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm">
            {notices.length > 0 ? (
              notices.map(notice => (
                <div key={notice.id} className="p-2.5 border border-border bg-slate-900/10 hover:border-primary/10 rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-foreground text-sm truncate">{notice.title}</h4>
                    {notice.importance === "high" && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 animate-pulse">Urgent</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-1.5">{notice.content}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground/80 font-mono">
                    <span className="bg-secondary px-1.5 py-0.5 rounded font-semibold capitalize">{notice.category}</span>
                    <span>{notice.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs py-4">
                No active announcements under this filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Shuttles Tab Content */
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-sm">
          {shuttles.length > 0 ? (
            shuttles.map(shuttle => (
              <div key={shuttle.route_id} className="p-2.5 border border-border bg-slate-900/10 rounded-lg hover:border-primary/15 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                    {shuttle.name}
                  </h4>
                  <span className="text-xs bg-secondary border border-border px-1.5 py-0.5 rounded font-mono font-bold text-muted-foreground">{shuttle.route_id}</span>
                </div>
                
                {/* Loop stops indicator */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 truncate">
                  <MapPin size={11} className="text-primary shrink-0" />
                  <span className="truncate">{shuttle.stops.join(" ➔ ")}</span>
                </div>

                <div className="flex justify-between items-center text-xs bg-black/10 p-1.5 rounded text-muted-foreground">
                  <span className="truncate max-w-[200px]" title={shuttle.timings.weekdays}>Weekdays: {shuttle.timings.weekdays.split(",")[0]}</span>
                  <span className="font-mono text-xs shrink-0 text-primary hover:underline cursor-pointer" title={shuttle.driver_contact}>Call Driver</span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs py-4">
              No shuttle lines found.
            </div>
          )}
        </div>
      )}
    </div>
  );

}
