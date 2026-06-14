"use client";

import React, { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Users, Star, AlertCircle } from "lucide-react";
import { useApp } from "../../app/context/AppContext";

interface EventData {
  id: string;
  title: string;
  description: string;
  club: string;
  venue: string;
  time: string;
  capacity: number;
  registered: number;
  registrationLink: string;
  date: string;
}

export default function EventsWidget() {
  const { student } = useApp();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        // Request events in 30 days window, widget will display next 3
        const res = await fetch("/api/events/upcoming?days=30");
        if (!res.ok) throw new Error("Events offline");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        setError("Events server offline");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Format relative date countdown string
  const getRelativeDateString = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Past Event";
    return `In ${diffDays} days`;
  };

  // Select next 3 events
  const displayEvents = events.slice(0, 3);

  return (
    <div className="glass-panel glow-card rounded-xl p-5 flex flex-col h-[360px]">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="text-cyan-400" size={20} />
          <h3 className="font-semibold text-sm">Upcoming Campus Events</h3>
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
          <p className="text-xs font-semibold text-foreground/80">Events Server Offline</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Club fests, workshops, and sports timetables are temporarily unavailable.</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[75px] bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
          No campus events scheduled in the next 30 days.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {displayEvents.map((evt) => {
            const relativeTime = getRelativeDateString(evt.date);
            const isFavoriteClub = !!(student && (
              evt.club === student.favoriteClub ||
              (Array.isArray(student.favoriteClubs) && student.favoriteClubs.includes(evt.club))
            ));
            const regPercentage = Math.round((evt.registered / evt.capacity) * 100);

            return (
              <div 
                key={evt.id}
                className={`p-2.5 border rounded-lg flex flex-col relative transition-all duration-200 ${
                  isFavoriteClub 
                    ? "bg-primary/5 border-primary/40 shadow-sm shadow-primary/5" 
                    : "bg-slate-900/20 border-border hover:border-primary/20"
                }`}
              >
                {/* Event header */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate text-foreground flex items-center gap-1.5">
                      {evt.title}
                      {isFavoriteClub && (
                        <span title="Favorite Club Event">
                          <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground font-semibold uppercase mt-0.5">{evt.club}</p>
                  </div>
                  
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    relativeTime === "Today" 
                      ? "bg-red-500/20 text-red-400 animate-pulse" 
                      : relativeTime === "Tomorrow"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-cyan-500/10 text-cyan-400"
                  }`}>
                    {relativeTime}
                  </span>
                </div>

                {/* Event metadata footer */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{evt.venue}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock size={11} className="shrink-0" />
                    <span>{evt.time.split(" - ")[0]}</span>
                  </div>
                </div>

                {/* Event capacity progress bar */}
                <div className="mt-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-1 font-mono">
                    <span>Enrolled: {evt.registered} / {evt.capacity}</span>
                    <span className={`font-bold ${
                      regPercentage >= 90 ? "text-red-500" : regPercentage >= 80 ? "text-amber-500" : "text-green-500"
                    }`}>
                      {regPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary/80 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        regPercentage >= 90 ? "bg-red-500" : regPercentage >= 80 ? "bg-amber-500" : "bg-green-500"
                      }`} 
                      style={{ width: `${Math.min(regPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
