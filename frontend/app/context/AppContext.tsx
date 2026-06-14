"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "dark" | "light";

export interface Student {
  id: string;
  name: string;
  dietaryPreference: string; // "vegetarian" | "gluten-free" | "none" | "vegan"
  allergensToAvoid?: string[];
  favoriteClub?: string;
  favoriteClubs?: string[];
  isCustomProfile?: boolean;
}

export interface ServerHealth {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline";
  latency: number;
  error: string | null;
}

interface AppContextType {
  theme: Theme;
  student: Student | null;
  customApiKey: string;
  toggleTheme: () => void;
  loginAsStudent: (id: string) => void;
  loginAsCustomStudent: (customProfile: Student) => void;
  logoutStudent: () => void;
  setCustomApiKey: (key: string) => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  servers: ServerHealth[];
  serversLoading: boolean;
  refreshStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Seeding 2 demo accounts in memory for easy testing
export const DEMO_STUDENTS: Record<string, Student> = {
  "STU12345": {
    id: "STU12345",
    name: "Alex Mercer",
    dietaryPreference: "vegetarian",
    favoriteClub: "CS Club"
  },
  "STU67890": {
    id: "STU67890",
    name: "Jane Doe",
    dietaryPreference: "gluten-free",
    favoriteClub: "Robotics Club"
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [student, setStudent] = useState<Student | null>(null);
  const [customApiKey, setCustomApiKeyState] = useState("");
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servers, setServers] = useState<ServerHealth[]>([]);
  const [serversLoading, setServersLoading] = useState(true);

  // Initialize theme and session from localStorage if present
  useEffect(() => {
    const savedTheme = localStorage.getItem("campuspulse-theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.className = savedTheme === "light" ? "light-theme" : "";
    }

    const savedStudentId = localStorage.getItem("campuspulse-student-id");
    if (savedStudentId && DEMO_STUDENTS[savedStudentId]) {
      setStudent(DEMO_STUDENTS[savedStudentId]);
    }

    const savedKey = localStorage.getItem("campuspulse-groq-key");
    if (savedKey) {
      setCustomApiKeyState(savedKey);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("campuspulse-theme", nextTheme);
    document.documentElement.className = nextTheme === "light" ? "light-theme" : "";
  };

  const loginAsStudent = (id: string) => {
    if (DEMO_STUDENTS[id]) {
      setStudent(DEMO_STUDENTS[id]);
      localStorage.setItem("campuspulse-student-id", id);
    }
  };

  const loginAsCustomStudent = (customProfile: Student) => {
    setStudent(customProfile);
    // Explicitly do not persist to localStorage so it naturally resets on page reload as requested
    localStorage.removeItem("campuspulse-student-id");
  };

  const logoutStudent = () => {
    setStudent(null);
    localStorage.removeItem("campuspulse-student-id");
  };

  const setCustomApiKey = (key: string) => {
    setCustomApiKeyState(key);
    if (key) {
      localStorage.setItem("campuspulse-groq-key", key);
    } else {
      localStorage.removeItem("campuspulse-groq-key");
    }
  };

  const refreshStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (data && data.servers) {
        setServers(data.servers);
      }
    } catch (err) {
      console.error("Error fetching health status in context:", err);
    } finally {
      setServersLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ 
      theme, 
      student, 
      customApiKey,
      toggleTheme, 
      loginAsStudent, 
      loginAsCustomStudent,
      logoutStudent,
      setCustomApiKey,
      isMobileMenuOpen,
      setMobileMenuOpen,
      servers,
      serversLoading,
      refreshStatus
    }}>
      {children}
    </AppContext.Provider>
  );
}


export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
