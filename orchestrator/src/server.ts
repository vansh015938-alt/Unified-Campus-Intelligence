import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mcpManager from "./mcpClients/manager.js";
import healthRouter, { startHealthCheckMonitoring, stopHealthCheckMonitoring } from "./healthcheck.js";
import { runAgentLoop, writeSSE } from "./router/agent.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Expose health status routing
app.use("/api", healthRouter);

// SSE endpoint for AI Assistant chat
app.post("/api/chat", async (req, res) => {
  const { messages, studentId, studentProfile, userApiKey } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
    return;
  }

  // Set headers for SSE streaming
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  console.log(`Starting AI chat session. StudentID: ${studentId || "anonymous"}`);

  try {
    await runAgentLoop(messages, studentId, res, studentProfile, userApiKey);
    res.end();
  } catch (error: any) {
    console.error("Error in chat handler:", error);
    writeSSE(res, {
      type: "error",
      message: error.message || String(error)
    });
    writeSSE(res, { type: "done" });
    res.end();
  }
});


// Fast bypass REST endpoints for Frontend Widgets (Bypasses LLM for speed)

// 1. Library Hours
app.get("/api/library/hours", async (req, res) => {
  try {
    const result = await mcpManager.callTool("get_library_hours", {});
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Library service is currently unavailable.", status: "down" });
  }
});

// Library Search Bypass
app.get("/api/library/search", async (req, res) => {
  const query = req.query.query as string || "";
  try {
    const result = await mcpManager.callTool("search_books", { query });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Library service is currently unavailable.", status: "down" });
  }
});

// Library Borrowed Books Bypass
app.get("/api/library/borrowed", async (req, res) => {
  const studentId = req.query.studentId as string || "";
  try {
    const result = await mcpManager.callTool("get_borrowed_books", { student_id: studentId });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Library service is currently unavailable.", status: "down" });
  }
});

// 2. Cafeteria Today Menu
app.get("/api/cafeteria/today", async (req, res) => {
  try {
    const result = await mcpManager.callTool("get_today_menu", {});
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Cafeteria service is currently unavailable.", status: "down" });
  }
});

// Cafeteria Specials Bypass
app.get("/api/cafeteria/specials", async (req, res) => {
  try {
    const result = await mcpManager.callTool("get_special_offers", {});
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Cafeteria service is currently unavailable.", status: "down" });
  }
});

// 3. Events Upcoming (limit days_ahead)
app.get("/api/events/upcoming", async (req, res) => {
  const daysAhead = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  try {
    const result = await mcpManager.callTool("get_upcoming_events", { days_ahead: daysAhead });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Events service is currently unavailable.", status: "down" });
  }
});

// 4. Academic Calendar
app.get("/api/academics/calendar", async (req, res) => {
  try {
    const result = await mcpManager.callTool("get_academic_calendar", {});
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Academics service is currently unavailable.", status: "down" });
  }
});

// Academics Handbook Search Bypass
app.get("/api/academics/handbook", async (req, res) => {
  const query = req.query.query as string || "";
  try {
    const result = await mcpManager.callTool("search_handbook", { query });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Academics service is currently unavailable.", status: "down" });
  }
});

// 5. Notices Latest (filter category)
app.get("/api/notices/latest", async (req, res) => {
  const category = req.query.category as string | undefined;
  try {
    const result = await mcpManager.callTool("get_latest_notices", { category });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Notices & Transport service is currently unavailable.", status: "down" });
  }
});

// 6. Shuttle Schedule
app.get("/api/shuttle/schedule", async (req, res) => {
  const route = req.query.route as string | undefined;
  try {
    const result = await mcpManager.callTool("get_shuttle_schedule", { route });
    res.json(JSON.parse(result.content[0].text));
  } catch (err: any) {
    res.status(503).json({ error: err.message || "Notices & Transport service is currently unavailable.", status: "down" });
  }
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  // 1. Establish initial connections to all online MCP servers
  await mcpManager.initializeAll();
  
  // 2. Start background monitoring of connection states
  startHealthCheckMonitoring();

  const serverInstance = app.listen(PORT, () => {
    console.log(`Orchestrator Service listening on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("Shutting down Orchestrator...");
    stopHealthCheckMonitoring();
    serverInstance.close(() => {
      console.log("Orchestrator stopped.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch(err => {
  console.error("Critical server startup failure:", err);
  process.exit(1);
});
