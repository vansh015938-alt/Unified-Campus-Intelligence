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
const noticesPath = path.join(__dirname, "../data/notices.json");
const shuttlePath = path.join(__dirname, "../data/shuttle.json");

// Read mock files on startup
let notices: any[] = [];
let shuttleData: any = { shuttle_schedules: [], building_directions: {} };

try {
  notices = JSON.parse(fs.readFileSync(noticesPath, "utf-8"));
} catch (error) {
  console.error("Failed to load notices.json:", error);
}

try {
  shuttleData = JSON.parse(fs.readFileSync(shuttlePath, "utf-8"));
} catch (error) {
  console.error("Failed to load shuttle.json:", error);
}

const app = express();
app.use(cors());
app.use(express.json());

function createMcpServer() {
  const server = new McpServer({
    name: "notices-transport-server",
    version: "1.0.0"
  });

  // Tool: get_latest_notices
  server.tool(
    "get_latest_notices",
    "Retrieve official campus notices. Optionally filter by category (e.g. fees, exams, holidays)",
    {
      category: z.string().optional().describe("Optional notice category to filter by")
    },
    async ({ category }) => {
      let results = notices;
      if (category) {
        const cat = category.toLowerCase();
        results = notices.filter(n => n.category.toLowerCase() === cat);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Campus Notice Board (mock)",
            category_filter: category,
            notices: results
          }, null, 2)
        }]
      };
    }
  );

  // Tool: get_shuttle_schedule
  server.tool(
    "get_shuttle_schedule",
    "Retrieve campus shuttle lines, schedules, and stops. Optionally filter by route ID (e.g., ROUTE-A)",
    {
      route: z.string().optional().describe("Optional route ID (e.g., ROUTE-A, ROUTE-B)")
    },
    async ({ route }) => {
      let schedules = shuttleData.shuttle_schedules;
      if (route) {
        const rt = route.trim().toUpperCase();
        schedules = schedules.filter((s: any) => s.route_id === rt);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Campus Transport Office (mock)",
            route_filter: route,
            shuttles: schedules
          }, null, 2)
        }]
      };
    }
  );

  // Tool: get_building_directions
  server.tool(
    "get_building_directions",
    "Retrieve short text directions/navigation guides for specific campus buildings (e.g. CS Block, Central Library)",
    {
      building_name: z.string().describe("Name of the building to find")
    },
    async ({ building_name }) => {
      const directionsMap: Record<string, string> = shuttleData.building_directions;
      
      // Find case-insensitive match
      const bNameLower = building_name.trim().toLowerCase();
      let directions: string | undefined;
      let matchedName = building_name;

      for (const [key, value] of Object.entries(directionsMap)) {
        if (key.toLowerCase() === bNameLower || key.toLowerCase().includes(bNameLower) || bNameLower.includes(key.toLowerCase())) {
          directions = value;
          matchedName = key;
          break;
        }
      }

      if (!directions) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              source: "Campus Navigation System (mock)",
              error: `Directions for building '${building_name}' not found.`
            }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Campus Navigation System (mock)",
            building: matchedName,
            directions
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// Map to track active SSE client sessions
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

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Notices & Transport MCP Server running on port ${PORT}`);
});
