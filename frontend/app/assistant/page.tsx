"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useApp } from "../context/AppContext";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Send, 
  Bot, 
  User, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Bookmark, 
  Sparkles,
  Book,
  Utensils,
  Calendar,
  GraduationCap,
  Bell,
  ArrowRight
} from "lucide-react";

interface ToolCall {
  toolCallId?: string;
  tool: string;
  server: string;
  serverId: string;
  arguments: any;
  result?: any;
  status: "running" | "completed" | "failed";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  sources?: Array<{ id: string; name: string }>;
}

function AssistantChat() {
  const { student, customApiKey } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const didTriggerRef = useRef(false);

  // Suggested Prompts list
  const suggestedPrompts = [
    { text: "Is 'Clean Code' available in the library?", icon: Book, color: "text-primary bg-primary/10" },
    { text: "What is for lunch today?", icon: Utensils, color: "text-orange-500 bg-orange-500/10" },
    { text: "Any AI/ML workshops scheduled this week?", icon: Calendar, color: "text-cyan-400 bg-cyan-400/10" },
    { text: "What is the policy for attendance shortage?", icon: GraduationCap, color: "text-purple-400 bg-purple-400/10" },
    { text: "What's happening today and what is for dinner?", icon: Sparkles, color: "text-yellow-400 bg-yellow-400/10" }
  ];

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeToolCalls]);

  // Handle auto-trigger of query param 'q' on mount
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && !didTriggerRef.current) {
      didTriggerRef.current = true;
      // Immediately clear the query param so refresh/back doesn't re-fire it
      router.replace("/assistant");
      sendMessage(queryParam);
    }
  }, [searchParams, router]);

  const clearChat = () => {
    setMessages([]);
    setActiveToolCalls([]);
    setExpandedTools({});
  };

  const handleSuggestedPrompt = (promptText: string) => {
    if (loading) return;
    setInput(promptText);
    sendMessage(promptText);
  };

  const toggleToolExpansion = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading) return;

    if (!overrideText) setInput("");
    setLoading(true);

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMessage]);

    // Create a placeholder assistant message that will be populated by the stream
    const assistantPlaceholder: Message = { 
      role: "assistant", 
      content: "", 
      toolCalls: [], 
      sources: [] 
    };

    setMessages(prev => [...prev, assistantPlaceholder]);
    
    // Prepare conversation history to send to orchestrator
    // Exclude the last placeholder message
    const conversationHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          studentId: student?.id,
          studentProfile: student,
          userApiKey: customApiKey
        })
      });


      if (!response.ok) throw new Error("Failed to receive stream from server.");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader not supported.");

      const decoder = new TextDecoder();
      let buffer = "";

      let currentText = "";
      let currentToolCalls: ToolCall[] = [];
      let currentSources: Array<{ id: string; name: string }> = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "tool_call_start") {
              const newToolCall: ToolCall = {
                toolCallId: event.toolCallId,
                tool: event.tool,
                server: event.server,
                serverId: event.serverId,
                arguments: event.arguments,
                status: "running"
              };
              currentToolCalls = [...currentToolCalls, newToolCall];
              setActiveToolCalls(currentToolCalls);
            } 
            else if (event.type === "tool_call_end") {
              // Check if tool execution had error
              const hasError = event.result && (event.result.error || event.result.is_error);
              const statusText = hasError ? "failed" : "completed";

              currentToolCalls = currentToolCalls.map(tc => {
                const isMatch = tc.toolCallId 
                  ? tc.toolCallId === event.toolCallId 
                  : (tc.tool === event.tool && tc.status === "running");

                if (isMatch) {
                  return { ...tc, status: statusText, result: event.result };
                }
                return tc;
              });
              setActiveToolCalls(currentToolCalls);
            } 
            else if (event.type === "text") {
              // Stream text into assistant message content
              currentText += event.text;
              
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.content = currentText;
                  last.toolCalls = currentToolCalls;
                }
                return next;
              });
            } 
            else if (event.type === "sources") {
              currentSources = event.sources || [];
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.sources = currentSources;
                }
                return next;
              });
            }
            else if (event.type === "done") {
              setActiveToolCalls([]);
            }
            else if (event.type === "error") {
              currentText += `\n\n*(Error: ${event.message})*`;
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.content = currentText;
                }
                return next;
              });
              setActiveToolCalls([]);
            }
          } catch (e) {
            console.error("Failed to parse SSE JSON block:", e, line);
          }
        }
      }
    } catch (err: any) {
      console.error("Chat streaming failed:", err);
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          last.content = `Sorry, I encountered an issue connecting to the orchestrator. Error: ${err.message || String(err)}`;
        }
        return next;
      });
      setActiveToolCalls([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map serverId to Lucide Icon
  const getServerIcon = (serverId: string) => {
    switch (serverId) {
      case "library": return Book;
      case "cafeteria": return Utensils;
      case "events": return Calendar;
      case "academics": return GraduationCap;
      case "notices": return Bell;
      default: return Terminal;
    }
  };

  // Compute label and class styling for tool badges
  const getToolCallStatusBadge = (tc: ToolCall) => {
    if (tc.status === "running") {
      return {
        label: "Running",
        className: "bg-yellow-500/10 text-yellow-500 animate-pulse"
      };
    }
    
    const hasError = tc.result && (tc.result.error || tc.result.is_error);
    if (tc.status === "failed" || hasError) {
      return {
        label: "Checked (Offline)",
        className: "bg-red-500/10 text-red-400 border border-red-500/20 font-bold"
      };
    }

    // Check if result is empty
    let isEmpty = false;
    if (tc.result) {
      if (Array.isArray(tc.result.books) && tc.result.books.length === 0) isEmpty = true;
      else if (Array.isArray(tc.result.menu) && tc.result.menu.length === 0) isEmpty = true;
      else if (Array.isArray(tc.result.events) && tc.result.events.length === 0) isEmpty = true;
      else if (Array.isArray(tc.result.results) && tc.result.results.length === 0) isEmpty = true;
      else if (Array.isArray(tc.result.notices) && tc.result.notices.length === 0) isEmpty = true;
      else if (Array.isArray(tc.result.shuttles) && tc.result.shuttles.length === 0) isEmpty = true;
    }

    if (isEmpty) {
      return {
        label: "Checked (Empty Response)",
        className: "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      };
    }

    return {
      label: "Success",
      className: "bg-green-500/10 text-green-500 border border-green-500/20 font-bold"
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto glass-panel rounded-xl overflow-hidden border border-border shadow-2xl animate-entrance">
      {/* Assistant Header */}
      <div className="p-4 border-b border-border bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bot size={20} className="animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">AI Campus Assistant "Pulse"</h3>
            <p className="text-[10px] text-muted-foreground">Connected to Groq Cloud & 5 Live MCP Datastores</p>
          </div>
        </div>

        <button 
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200"
          title="Clear Conversation"
        >
          <RotateCcw size={13} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Messages Scroll Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          /* Landing Screen when no messages exist */
          <div className="h-full flex flex-col justify-center items-center max-w-md mx-auto text-center space-y-6">
            <Bot size={48} className="text-primary/70 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Ask anything about your campus!</h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-sans">
                Pulse queries independent campus databases live. It supports complex requests (like checking book availability and menus in a single turn).
              </p>
            </div>

            {/* Suggested Prompts List */}
            <div className="w-full space-y-2.5">
              <h4 className="text-[10px] text-left font-bold text-muted-foreground uppercase tracking-wider">Suggested Queries</h4>
              <div className="space-y-2">
                {suggestedPrompts.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedPrompt(p.text)}
                      className="w-full p-3 border border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/60 rounded-xl flex items-center gap-3 text-xs text-left font-semibold text-foreground/95 transition-all duration-200"
                      suppressHydrationWarning
                    >
                      <Icon className={`${p.color} p-1.5 rounded-lg shrink-0`} size={28} />
                      <span className="truncate flex-1">{p.text}</span>
                      <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="space-y-6">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div 
                  key={idx} 
                  className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"} animate-entrance`}
                >
                  {/* Assistant Avatar */}
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 self-start">
                      <Bot size={16} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[80%] flex flex-col ${isAssistant ? "" : "items-end"}`}>
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isAssistant 
                        ? "bg-slate-900/30 border border-border text-foreground/95" 
                        : "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/10"
                    }`}>
                      {msg.content || (loading && idx === messages.length - 1 ? (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      ) : "")}
                    </div>

                    {/* Tool Calls Collapsible Section */}
                    {isAssistant && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2.5 w-full space-y-1.5">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                          Consulted MCP Nodes
                        </div>
                        {msg.toolCalls.map((tc, tcIdx) => {
                          const toolId = `${idx}-${tcIdx}`;
                          const isExpanded = !!expandedTools[toolId];
                          const SrvIcon = getServerIcon(tc.serverId);
                          const badge = getToolCallStatusBadge(tc);

                          return (
                            <div 
                              key={tcIdx}
                              className="border border-border/80 bg-black/10 rounded-lg overflow-hidden animate-entrance"
                            >
                              {/* Accordion Trigger */}
                              <button
                                onClick={() => toggleToolExpansion(toolId)}
                                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold hover:bg-secondary/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 text-foreground/80">
                                  <SrvIcon size={12} className="text-primary shrink-0" />
                                  <span>{tc.server.replace(" MCP Server", "")}</span>
                                  <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-mono text-muted-foreground font-normal">
                                    {tc.tool}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </div>
                              </button>

                              {/* Accordion Content (Collapsible raw JSON tool result) */}
                              {isExpanded && (
                                <div className="p-3 border-t border-border bg-slate-950/60 font-mono text-[10px] text-muted-foreground overflow-x-auto leading-relaxed">
                                  <div className="text-[9px] text-primary/80 mb-1 font-semibold">ARGS: {JSON.stringify(tc.arguments)}</div>
                                  <pre>{JSON.stringify(tc.result, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Citations Footer */}
                    {isAssistant && msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[9.5px] text-muted-foreground flex items-center gap-1 mr-1">
                          <Bookmark size={10} /> Sources Cited:
                        </span>
                        {msg.sources.map((src, srcIdx) => (
                          <span 
                            key={srcIdx} 
                            className="bg-secondary/80 border border-border text-[9.5px] font-semibold text-foreground/80 px-2 py-0.5 rounded-full"
                          >
                            {src.name.replace(" MCP Server", "")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground shrink-0 self-start">
                      <User size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render active tool call loading badges when streaming */}
            {activeToolCalls.filter(tc => tc.status === "running").map((tc, tcIdx) => {
              const SrvIcon = getServerIcon(tc.serverId);
              return (
                <div key={tcIdx} className="flex gap-4 items-center pl-12 animate-entrance">
                  <div className="w-5 h-5 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 animate-spin shrink-0">
                    <Sparkles size={11} />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    <SrvIcon size={12} className="text-primary animate-pulse" />
                    <span>Querying {tc.server.replace(" MCP Server", "")}...</span>
                    <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-mono font-normal">
                      {tc.tool}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <form 
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="p-4 border-t border-border bg-slate-900/40 flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Waiting for AI..." : "Ask Pulse about books, meals, schedules..."}
          className="flex-1 bg-secondary/60 text-xs px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-muted-foreground"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-primary hover:bg-primary/95 disabled:bg-muted text-primary-foreground disabled:text-muted-foreground w-11 h-11 flex items-center justify-center rounded-xl transition-all shadow-md shadow-primary/15 shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AssistantChat />
    </Suspense>
  );
}
