"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, DEMO_STUDENTS } from "../../app/context/AppContext";
import StatusStrip from "./StatusStrip";
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  LogOut, 
  User, 
  Sparkles,
  BookOpen,
  Utensils,
  Calendar,
  GraduationCap
} from "lucide-react";

const CAMPUS_CLUBS = [
  "CS Club",
  "Robotics Club",
  "Music Club",
  "Sports Association",
  "Placement Cell",
  "Literary Society",
  "Electronics Society",
  "E-Cell",
  "Arts & Photo Club",
  "Cultural Committee",
  "Debating Society",
  "Dramatics Club"
];

const COMMON_ALLERGENS = ["gluten", "dairy", "peanuts", "soy", "eggs"];

export default function Sidebar() {
  const pathname = usePathname();
  const { 
    student, 
    loginAsStudent, 
    loginAsCustomStudent, 
    logoutStudent, 
    isMobileMenuOpen, 
    setMobileMenuOpen,
    customApiKey,
    setCustomApiKey
  } = useApp();

  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [dietaryPref, setDietaryPref] = useState("none");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquareCode }
  ];

  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev => 
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  const handleClubChange = (club: string) => {
    setSelectedClubs(prev => 
      prev.includes(club) ? prev.filter(c => c !== club) : [...prev, club]
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = profileName.trim() || "Guest Student";
    
    // Create new profile object
    const newProfile = {
      id: "STU-CUSTOM",
      name: displayName,
      dietaryPreference: dietaryPref,
      allergensToAvoid: selectedAllergens,
      favoriteClubs: selectedClubs,
      favoriteClub: selectedClubs[0] || "", // fallback compatibility
      isCustomProfile: true
    };

    loginAsCustomStudent(newProfile);
    setIsCreatingProfile(false);
    setMobileMenuOpen(false);

    // Reset local state fields
    setProfileName("");
    setDietaryPref("none");
    setSelectedAllergens([]);
    setSelectedClubs([]);
  };

  return (
    <>
      {/* Semi-transparent Backdrop Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}
      <aside className={`w-64 border-r border-border flex flex-col glass-panel h-screen shrink-0 sticky top-0 lg:flex ${
        isMobileMenuOpen ? "flex fixed inset-y-0 left-0 z-50 w-64 bg-card animate-entrance" : "hidden"
      }`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/30 shrink-0">
              C
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base tracking-tight text-foreground truncate">CampusPulse</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Federated Intelligence</p>
            </div>
          </div>

          {/* Close Button on Mobile Drawer */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Close Navigation Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
                {item.name === "AI Assistant" && (
                  <Sparkles size={12} className="ml-auto text-yellow-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Simulated Student Auth Panel */}
        <div className="p-4 border-t border-border bg-slate-900/10">
          {student ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border border-border text-foreground/80">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate leading-snug">{student.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono truncate">{student.id}</p>
                </div>
              </div>
              
              {/* Metadata Tags */}
              <div className="space-y-1 bg-black/20 p-2 rounded-lg text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dietary:</span>
                  <span className="font-medium text-foreground/90 capitalize">
                    {student.dietaryPreference === "none" ? "None" : student.dietaryPreference}
                  </span>
                </div>
                {Array.isArray(student.allergensToAvoid) && student.allergensToAvoid.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allergens:</span>
                    <span className="font-medium text-foreground/90 truncate max-w-[100px]" title={student.allergensToAvoid.join(", ")}>
                      {student.allergensToAvoid.join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interests:</span>
                  <span className="font-medium text-foreground/90 truncate max-w-[110px]" title={student.favoriteClubs?.join(", ") || student.favoriteClub}>
                    {student.favoriteClubs && student.favoriteClubs.length > 0
                      ? student.favoriteClubs.join(", ") 
                      : student.favoriteClub || "None"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { logoutStudent(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive rounded-lg text-xs font-semibold text-muted-foreground transition-all duration-200 cursor-pointer"
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : isCreatingProfile ? (
            /* inline form to create my profile */
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs bg-black/20 p-3 rounded-lg border border-border">
              <h4 className="text-xs font-bold text-foreground">Create My Profile</h4>
              
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-secondary/80 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Diet selection */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase">Dietary Preference</label>
                <select
                  value={dietaryPref}
                  onChange={(e) => setDietaryPref(e.target.value)}
                  className="w-full bg-secondary/80 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="none">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten-Free</option>
                </select>
              </div>

              {/* Allergens Checklist */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase block">Avoid Allergens</label>
                <div className="grid grid-cols-2 gap-1 bg-black/10 p-1.5 rounded">
                  {COMMON_ALLERGENS.map(a => (
                    <label key={a} className="flex items-center gap-1.5 text-[10.5px] cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(a)}
                        onChange={() => handleAllergenChange(a)}
                        className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="capitalize">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clubs Selection (Scrollable) */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase block">Favorite Clubs & Interests</label>
                <div className="h-20 overflow-y-auto border border-border rounded bg-black/25 p-1.5 space-y-1">
                  {CAMPUS_CLUBS.map(club => (
                    <label key={club} className="flex items-center gap-1.5 text-[10.5px] cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedClubs.includes(club)}
                        onChange={() => handleClubChange(club)}
                        className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span>{club}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(false)}
                  className="flex-1 py-1 px-2 border border-border rounded hover:bg-secondary text-center font-semibold text-muted-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1 px-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-center font-bold cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Simulate Student Account</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { loginAsStudent("STU12345"); setMobileMenuOpen(false); }}
                  className="px-2 py-2 border border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/80 rounded-lg text-[11px] font-semibold text-foreground text-left transition-all duration-200 cursor-pointer"
                >
                  <div className="font-bold">Alex M.</div>
                  <div className="text-[9px] text-muted-foreground font-mono">STU12345</div>
                </button>
                <button
                  onClick={() => { loginAsStudent("STU67890"); setMobileMenuOpen(false); }}
                  className="px-2 py-2 border border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/80 rounded-lg text-[11px] font-semibold text-foreground text-left transition-all duration-200 cursor-pointer"
                >
                  <div className="font-bold">Jane D.</div>
                  <div className="text-[9px] text-muted-foreground font-mono">STU67890</div>
                </button>
              </div>

              {/* Add Custom Profile option */}
              <button
                onClick={() => setIsCreatingProfile(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border hover:border-primary/55 bg-secondary/15 hover:bg-secondary/40 rounded-lg text-[11.5px] font-bold text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
              >
                <span>+ Create My Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom API Key input */}
        <div className="p-4 border-t border-border bg-slate-900/5 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Custom Groq API Key</label>
            <div className="relative">
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-secondary/40 border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/30"
              />
              {customApiKey && (
                <button
                  type="button"
                  onClick={() => setCustomApiKey("")}
                  className="absolute right-2.5 top-2.5 text-[10px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                  title="Clear API Key"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[9.5px] text-muted-foreground leading-tight">
              Saves locally to your browser context. Leave blank to use shared key.
            </p>
          </div>
        </div>

        {/* Health Status Indicator */}
        <StatusStrip />
      </aside>
    </>
  );
}

