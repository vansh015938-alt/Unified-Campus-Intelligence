import React from "react";
import LibraryWidget from "../components/widgets/LibraryWidget";
import CafeteriaWidget from "../components/widgets/CafeteriaWidget";
import EventsWidget from "../components/widgets/EventsWidget";
import AcademicsWidget from "../components/widgets/AcademicsWidget";
import NoticesTransportWidget from "../components/widgets/NoticesTransportWidget";
import QuickAskPulse from "../components/widgets/QuickAskPulse";

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-entrance">
      {/* Dashboard Greetings */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Overview</h2>
          <p className="text-xs text-muted-foreground mt-1">Real-time federated updates from all university databases.</p>
        </div>
      </div>

      {/* Quick Ask Pulse Command Bar */}
      <QuickAskPulse />

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LibraryWidget />
        <CafeteriaWidget />
        <EventsWidget />
        <AcademicsWidget />
        <NoticesTransportWidget />
      </div>
    </div>
  );
}
