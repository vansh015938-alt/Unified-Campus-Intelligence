import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./context/AppContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CampusPulse - Federated AI Dashboard",
  description: "Unified Campus Intelligence Platform powered by Groq and MCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground flex" suppressHydrationWarning>
        <AppProvider>
          {/* Main Layout Container */}
          <div className="flex w-full min-h-screen">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1 p-8 overflow-y-auto bg-slate-950/10">
                {children}
              </main>
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
