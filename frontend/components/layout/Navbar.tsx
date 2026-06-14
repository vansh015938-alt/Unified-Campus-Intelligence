"use client";

import React from "react";
import { useApp } from "../../app/context/AppContext";
import { Sun, Moon, Sparkles, Menu, Activity } from "lucide-react";

export default function Navbar() {
  const { 
    theme, 
    toggleTheme, 
    student, 
    isMobileMenuOpen, 
    setMobileMenuOpen,
    servers 
  } = useApp();

  // Calculate condensed status
  const totalServers = servers.length;
  const onlineCount = servers.filter(s => s.status === "online").length;
  const allOnline = totalServers > 0 && onlineCount === totalServers;
  const allOffline = totalServers > 0 && onlineCount === 0;

  let healthColor = "bg-green-500";
  let healthLabel = "All Services Online";
  let glowClass = "pulse-glow-green";

  if (allOffline) {
    healthColor = "bg-red-500";
    healthLabel = "System Offline";
    glowClass = "pulse-glow-red";
  } else if (onlineCount < totalServers) {
    healthColor = "bg-amber-500";
    healthLabel = `Degraded (${onlineCount}/${totalServers} Up)`;
    glowClass = "shadow-[0_0_8px_rgba(245,158,11,0.5)]";
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 lg:px-8 glass-panel sticky top-0 z-40">
      {/* Mobile Drawer Trigger & Brand Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
          title="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:block">
          {student ? (
            <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground/90">
              Welcome back, <span className="text-primary font-bold">{student.name}</span>
              <Sparkles size={14} className="text-yellow-400 animate-pulse" />
            </h2>
          ) : (
            <h2 className="text-sm font-semibold text-muted-foreground">
              Viewing CampusPulse (Guest Mode)
            </h2>
          )}
        </div>
      </div>

      {/* Right side controls and Live Status Pill */}
      <div className="flex items-center gap-4">
        {/* Condensed Live System Status Pill */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-[11px] font-semibold text-foreground/90"
          title={`${healthLabel}: ${onlineCount} of ${totalServers} servers connected`}
        >
          <span className={`w-2 h-2 rounded-full ${healthColor} ${glowClass} ${allOnline ? "animate-pulse" : ""}`} />
          <span className="hidden xs:inline flex items-center gap-1">
            <Activity size={10} className="text-muted-foreground" />
            <span>MCP: {onlineCount}/{totalServers}</span>
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-border hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
          title="Toggle Light/Dark Theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
