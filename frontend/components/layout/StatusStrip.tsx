"use client";

import React from "react";
import { useApp } from "../../app/context/AppContext";
import { 
  Server, 
  BookOpen, 
  Utensils, 
  Calendar, 
  GraduationCap, 
  Bell 
} from "lucide-react";

const SERVER_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  library: BookOpen,
  cafeteria: Utensils,
  events: Calendar,
  academics: GraduationCap,
  notices: Bell,
};

export default function StatusStrip() {
  const { servers, serversLoading } = useApp();

  return (
    <div className="p-4 border-t border-border mt-auto">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Server size={14} />
        <span>MCP Network Status</span>
      </div>
      
      {serversLoading && servers.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-5 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {servers.map((srv) => {
            const IconComponent = SERVER_ICONS[srv.id] || Server;
            return (
              <div key={srv.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      srv.status === "online" 
                        ? "bg-green-500 animate-pulse pulse-glow-green" 
                        : "bg-red-500 pulse-glow-red"
                    }`} 
                  />
                  <IconComponent size={13} className="text-muted-foreground shrink-0" />
                  <span className="font-medium truncate text-foreground/80">{srv.name.replace(" MCP Server", "").replace(" & Transport", "")}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {srv.status === "online" ? `${srv.latency}ms` : "OFFLINE"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
