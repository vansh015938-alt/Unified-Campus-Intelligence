import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsPath = path.join(__dirname, "../data/events.json");

// Read raw events mock template
let rawEvents: any[] = [];
try {
  rawEvents = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));
} catch (error) {
  console.error("Failed to load events.json:", error);
}

// Function to dynamically compute dates on demand relative to the query time
function getLiveEvents() {
  const today = new Date();
  return rawEvents.map(evt => {
    const evtDate = new Date();
    evtDate.setDate(today.getDate() + evt.dayOffset);
    const dateString = evtDate.toISOString().split("T")[0]; // YYYY-MM-DD
    return {
      id: evt.id,
      title: evt.title,
      description: evt.description,
      club: evt.club,
      venue: evt.venue,
      time: evt.time,
      capacity: evt.capacity,
      registered: evt.registered,
      registrationLink: evt.registrationLink,
      date: dateString
    };
  });
}

const app = express();
app.use(cors());
app.use(express.json());

function createMcpServer() {
  const server = new McpServer({
    name: "events-server",
    version: "1.0.0"
  });

  // Tool: get_upcoming_events
  server.tool(
    "get_upcoming_events",
    "List campus events scheduled within a coming timeframe",
    {
      days_ahead: z.number().optional().describe("Number of days ahead to search (default is 7)")
    },
    async ({ days_ahead }) => {
      const limitDays = days_ahead !== undefined ? days_ahead : 7;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + limitDays);
      maxDate.setHours(23, 59, 59, 999);

      const liveEvents = getLiveEvents();
      const results = liveEvents.filter(evt => {
        const evtDate = new Date(evt.date);
        return evtDate >= today && evtDate <= maxDate;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Student Activity Board (mock)",
            days_range: limitDays,
            events: results
          }, null, 2)
        }]
      };
    }
  );

  // Tool: search_events
  server.tool(
    "search_events",
    "Search upcoming events by title, description, or hosting club",
    {
      query: z.string().describe("Search term keyword")
    },
    async ({ query }) => {
      const q = query.toLowerCase();
      const liveEvents = getLiveEvents();
      const results = liveEvents.filter(evt => 
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.club.toLowerCase().includes(q)
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Student Activity Board (mock)",
            query,
            events: results
          }, null, 2)
        }]
      };
    }
  );

  // Tool: get_event_details
  server.tool(
    "get_event_details",
    "Retrieve comprehensive details for a specific event by ID",
    {
      event_id: z.string().describe("Event ID (e.g. EVT-001)")
    },
    async ({ event_id }) => {
      const liveEvents = getLiveEvents();
      const event = liveEvents.find(evt => evt.id.toLowerCase() === event_id.toLowerCase());

      if (!event) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              source: "Student Activity Board (mock)",
              error: `Event with ID ${event_id} not found.`
            }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Student Activity Board (mock)",
            event
          }, null, 2)
        }]
      };
    }
  );

  // Tool: get_events_by_club
  server.tool(
    "get_events_by_club",
    "Retrieve all upcoming events hosted by a specific college club",
    {
      club_name: z.string().describe("Name of the club (e.g. CS Club, Robotics Club)")
    },
    async ({ club_name }) => {
      const cName = club_name.toLowerCase();
      const liveEvents = getLiveEvents();
      const results = liveEvents.filter(evt => evt.club.toLowerCase() === cName);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Student Activity Board (mock)",
            club: club_name,
            events: results
          }, null, 2)
        }]
      };
    }
  );

  // Tool: get_events_by_date
  server.tool(
    "get_events_by_date",
    "Retrieve all campus events scheduled on a specific date",
    {
      date: z.string().describe("Date in YYYY-MM-DD format")
    },
    async ({ date }) => {
      const liveEvents = getLiveEvents();
      const results = liveEvents.filter(evt => evt.date === date);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Student Activity Board (mock)",
            date,
            events: results
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// SSE sessions management
const sessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  const server = createMcpServer();
  sessions.set(sessionId, { transport, server });

  req.on("close", () => {
    sessions.delete(sessionId);
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(400).send("Session not found");
    return;
  }
  await session.transport.handlePostMessage(req, res, req.body);
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Events MCP Server running on port ${PORT}`);
});
