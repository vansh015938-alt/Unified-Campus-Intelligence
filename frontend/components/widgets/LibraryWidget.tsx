"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Search, Clock, MapPin, CheckCircle, XCircle, Bookmark } from "lucide-react";
import { useApp } from "../../app/context/AppContext";

interface BookData {
  id: string;
  title: string;
  author: string;
  subject: string;
  available_copies: number;
  total_copies: number;
  location: string;
}

const POPULAR_BOOKS = [
  {
    id: "978-0132350884",
    title: "Clean Code",
    author: "Robert C. Martin",
    subject: "Computer Science",
    available_copies: 3,
    location: "Shelf CS-01"
  },
  {
    id: "978-0262033848",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    subject: "Computer Science",
    available_copies: 4,
    location: "Shelf CS-02"
  },
  {
    id: "978-1449331818",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    subject: "Computer Science",
    available_copies: 0,
    location: "Shelf CS-05"
  }
];

export default function LibraryWidget() {
  const { student } = useApp();
  const [activeTab, setActiveTab] = useState<"catalog" | "borrowed">("catalog");
  const [hours, setHours] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookData[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);
  const [loadingBorrowed, setLoadingBorrowed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDirectSearch = async (title: string) => {
    setSearchQuery(title);
    setSearching(true);
    try {
      const res = await fetch(`/api/library/search?query=${encodeURIComponent(title)}`);
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      setSearchResults(data.books || []);
    } catch (err) {
      setSearchResults([]);
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    async function fetchHours() {
      try {
        const res = await fetch("/api/library/hours");
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();
        setHours(data.hours);
      } catch (err) {
        setError("Library server offline");
      } finally {
        setLoadingHours(false);
      }
    }
    fetchHours();
  }, []);

  // Reset tab when student logs out
  useEffect(() => {
    if (!student) {
      setActiveTab("catalog");
    }
  }, [student]);

  // Clear search results when search query is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);


  // Fetch borrowed books when tab transitions to "borrowed"
  useEffect(() => {
    if (!student || activeTab !== "borrowed") return;

    async function fetchBorrowed() {
      try {
        setLoadingBorrowed(true);
        const res = await fetch(`/api/library/borrowed?studentId=${student?.id || ""}`);
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();
        setBorrowedBooks(data.borrowed_books || []);
      } catch (err) {
        console.error("Failed to fetch borrowed books:", err);
        setBorrowedBooks([]);
      } finally {
        setLoadingBorrowed(false);
      }
    }
    fetchBorrowed();
  }, [student, activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/library/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      setSearchResults(data.books || []);
    } catch (err) {
      setSearchResults([]);
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="glass-panel glow-card rounded-xl p-5 flex flex-col h-[360px]">
      {/* Widget Header with Toggle */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
        {student ? (
          <div className="flex gap-3 text-sm">
            <button 
              onClick={() => setActiveTab("catalog")} 
              className={`font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "catalog" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen size={18} />
              <span>Catalogue</span>
            </button>
            <button 
              onClick={() => setActiveTab("borrowed")} 
              className={`font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "borrowed" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark size={18} />
              <span>My Library</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary" size={20} />
            <h3 className="font-semibold text-sm">Library Catalogue</h3>
          </div>
        )}
        
        {error ? (
          <span className="text-xs bg-[var(--status-offline-bg)] text-[var(--status-offline)] px-2.5 py-0.5 rounded font-semibold flex items-center gap-1">
            <XCircle size={12} /> Offline
          </span>
        ) : (
          <span className="text-xs bg-[var(--status-online-bg)] text-[var(--status-online)] px-2.5 py-0.5 rounded font-semibold flex items-center gap-1">
            <CheckCircle size={12} /> Online
          </span>
        )}
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-red-500/5 rounded-lg border border-red-500/10">
          <XCircle className="text-red-500 mb-2" size={32} />
          <p className="text-xs font-semibold text-foreground/80">Library Database Offline</p>
          <p className="text-xs text-muted-foreground mt-1.5">Direct book searches and reservations are temporarily unavailable.</p>
        </div>
      ) : (
        <>
          {activeTab === "catalog" ? (
            <>
              {/* Library Hours */}
              <div className="flex items-start gap-2.5 bg-slate-900/40 p-2.5 rounded-lg mb-4 text-xs animate-entrance">
                <Clock size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-foreground/80 block">Today's Hours</span>
                  <span className="text-muted-foreground truncate block">
                    {loadingHours ? "Loading..." : hours?.weekdays || "08:00 AM - 10:00 PM"}
                  </span>
                </div>
              </div>

              {/* Book Search Form */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search code, title, topic..."
                    className="w-full bg-secondary/60 text-xs px-3 py-2.5 pl-8 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <Search size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                <button 
                  type="submit" 
                  disabled={searching}
                  className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {searching ? "..." : "Search"}
                </button>
              </form>

              {/* Search Results / Recommendation Area */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm">
                {searchResults.length > 0 ? (
                  searchResults.map(book => (
                    <div key={book.id} className="p-2.5 border border-border bg-slate-900/20 rounded-lg flex items-center justify-between animate-entrance">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-semibold truncate text-foreground text-sm">{book.title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author} · {book.subject}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          book.available_copies > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {book.available_copies > 0 ? `${book.available_copies} Left` : "Out"}
                        </span>
                        <span className="text-xs text-muted-foreground block mt-1.5 font-mono">{book.location}</span>
                      </div>
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-4 animate-entrance">
                    No matching books found.
                  </div>
                ) : (
                  <div className="space-y-2.5 animate-entrance">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                      Popular Books
                    </div>
                    {POPULAR_BOOKS.map(book => (
                      <div 
                        key={book.id} 
                        onClick={() => handleDirectSearch(book.title)}
                        className="p-2.5 border border-border bg-slate-900/10 hover:border-primary/25 rounded-lg flex items-center justify-between cursor-pointer transition-all hover:bg-slate-900/30"
                        title="Click to search catalog"
                      >
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold truncate text-foreground text-sm">{book.title}</h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author} · {book.subject}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            book.available_copies > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            {book.available_copies > 0 ? `${book.available_copies} Left` : "Out"}
                          </span>
                          <span className="text-xs text-muted-foreground block mt-1.5 font-mono">{book.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Borrowed Books Tab */
            <div className="flex-1 flex flex-col min-h-0 animate-entrance text-sm">
              {loadingBorrowed ? (
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : borrowedBooks.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                    Books Currently Checked Out
                  </div>
                  {borrowedBooks.map((book, idx) => (
                    <div key={idx} className="p-2.5 border border-border bg-slate-900/15 rounded-lg flex justify-between items-center hover:border-primary/25 transition-colors">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-semibold text-foreground text-sm truncate">{book.title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">Due: <span className="font-mono text-red-400">{book.due_date}</span></p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-secondary text-muted-foreground px-2 py-1 rounded font-mono text-xs">{book.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Friendly Empty State as requested! */
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                  <BookOpen size={32} className="text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-foreground/80">No items currently checked out</p>
                  <p className="text-xs mt-1.5">Visit the library circulation desk to borrow catalog resources.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

