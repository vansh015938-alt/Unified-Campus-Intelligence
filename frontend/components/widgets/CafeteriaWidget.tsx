"use client";

import React, { useState, useEffect } from "react";
import { Utensils, Award, Clock, Sparkles, AlertCircle } from "lucide-react";
import { useApp } from "../../app/context/AppContext";

interface MenuItem {
  name: string;
  type: "veg" | "non-veg";
  allergens: string[];
}

interface MealSlot {
  timing: string;
  items: MenuItem[];
}

interface TodayMenuData {
  day: string;
  menu: Record<string, MealSlot>;
}

export default function CafeteriaWidget() {
  const { student } = useApp();
  const [menuData, setMenuData] = useState<TodayMenuData | null>(null);
  const [specials, setSpecials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<string>("lunch");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch menu
        const menuRes = await fetch("/api/cafeteria/today");
        if (!menuRes.ok) throw new Error("Cafeteria offline");
        const mData = await menuRes.json();
        setMenuData(mData);

        // Fetch specials
        // We can fetch specials through the orchestrator. Let's make sure we have the endpoint or fetch directly.
        // Wait, did we expose a specials endpoint? In orchestrator/src/server.ts we did not.
        // But we can fetch it by calling get_special_offers tool directly.
        // Let's check: since menuRes returns menu, does it contain specials? No, menuRes is today's menu.
        // Let's add a fast proxy route for specials, or just extract them. Since we didn't add the route in orchestrator,
        // we can fetch them via `/api/cafeteria/specials` if we add it, or we can just mock some static ones in the frontend
        // if the server is offline, or request them. Let's add `/api/cafeteria/specials` to the orchestrator.
        // For now, we will fetch it, and if it fails, we fall back to a static list.
        const specRes = await fetch("/api/cafeteria/specials");
        if (specRes.ok) {
          const sData = await specRes.json();
          setSpecials(sData.specials || []);
        } else {
          // Static fallback
          setSpecials([
            { "name": "Paneer Tikka Roll", "price": "$3.50", "discount": "15% off today" },
            { "name": "Chicken Club Sandwich", "price": "$4.00", "discount": "Free Masala Chai" }
          ]);
        }
      } catch (err) {
        setError("Cafeteria server offline");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Determine active meal slot based on current local time
  useEffect(() => {
    if (!menuData) return;
    const hour = new Date().getHours();
    if (hour < 10) setActiveSlot("breakfast");
    else if (hour < 15) setActiveSlot("lunch");
    else if (hour < 19) setActiveSlot("snacks");
    else setActiveSlot("dinner");
  }, [menuData]);

  const slotsOrder = ["breakfast", "lunch", "snacks", "dinner"];

  // Helper to filter/highlight items based on dietary preference
  const isItemMatchPreference = (item: MenuItem) => {
    if (!student) return true;
    
    // Core vegetarian/vegan filters
    if ((student.dietaryPreference === "vegetarian" || student.dietaryPreference === "vegan") && item.type !== "veg") {
      return false;
    }
    
    // Legacy preset filter for Jane Doe (gluten-free)
    if (student.dietaryPreference === "gluten-free" && item.allergens.includes("gluten")) {
      return false;
    }

    // Custom profile avoid allergens checks
    if (Array.isArray(student.allergensToAvoid) && student.allergensToAvoid.length > 0) {
      const avoided = student.allergensToAvoid.map(a => a.toLowerCase());
      const hasAllergen = item.allergens.some(itemAllergen => 
        avoided.includes(itemAllergen.toLowerCase())
      );
      if (hasAllergen) return false;
    }

    return true;
  };

  return (
    <div className="glass-panel glow-card rounded-xl p-5 flex flex-col h-[360px]">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Utensils className="text-orange-500" size={20} />
          <h3 className="font-semibold text-sm">Today's Menu ({menuData?.day || "..."})</h3>
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
          <p className="text-xs font-semibold text-foreground/80">Cafeteria Hub Offline</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Daily menu sheets and dietary allergy warnings are temporarily unavailable.</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Meal Slot Tabs */}
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg mb-3">
            {slotsOrder.map(slot => (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className={`flex-1 py-1 rounded text-xs font-bold uppercase transition-all ${
                  activeSlot === slot 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>

          {/* Active Slot Details */}
          <div className="flex-1 min-h-0 flex flex-col mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Clock size={12} />
              <span>{menuData?.menu[activeSlot]?.timing}</span>
              {student && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold capitalize">
                  Filter: {student.dietaryPreference}
                </span>
              )}
            </div>

            {/* Menu Items List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-sm">
              {menuData?.menu[activeSlot]?.items.map((item, idx) => {
                const matchesPref = isItemMatchPreference(item);
                return (
                  <div 
                    key={idx} 
                    className={`p-2.5 border rounded-lg flex items-center justify-between transition-all ${
                      !matchesPref 
                        ? "opacity-40 bg-slate-900/10 border-border/50 line-through" 
                        : "bg-slate-900/20 border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-foreground block truncate text-sm">{item.name}</span>
                      {item.allergens.length > 0 && (
                        <span className="text-xs text-red-400 font-medium mt-0.5 block">Allergens: {item.allergens.join(", ")}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 uppercase tracking-wide ${
                      item.type === "veg" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Special Alert */}
          {specials.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg flex items-center gap-2 text-xs text-orange-400">
              <Award size={14} className="shrink-0" />
              <div className="truncate min-w-0">
                <span className="font-semibold text-orange-300">Special Offer: </span>
                <span>{specials[0].name} ({specials[0].discount})</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

}
