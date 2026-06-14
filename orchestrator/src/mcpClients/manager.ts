// @ts-ignore
import EventSource from "eventsource";
// Apply global EventSource polyfill for Node environment
// @ts-ignore
global.EventSource = EventSource;

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import dotenv from "dotenv";

dotenv.config();

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string; // Base URL, e.g. http://localhost:5001
}

export interface MCPServerState {
  id: string;
  name: string;
  url: string;
  client: Client | null;
  status: "online" | "offline";
  latency: number;
  error: string | null;
}

const SERVER_CONFIGS: MCPServerConfig[] = [
  {
    id: "library",
    name: "Library MCP Server",
    url: process.env.LIBRARY_SERVER_URL || "http://localhost:5001"
  },
  {
    id: "cafeteria",
    name: "Cafeteria MCP Server",
    url: process.env.CAFETERIA_SERVER_URL || "http://localhost:5002"
  },
  {
    id: "events",
    name: "Events MCP Server",
    url: process.env.EVENTS_SERVER_URL || "http://localhost:5003"
  },
  {
    id: "academics",
    name: "Academics MCP Server",
    url: process.env.ACADEMICS_SERVER_URL || "http://localhost:5004"
  },
  {
    id: "notices",
    name: "Notices & Transport MCP Server",
    url: process.env.NOTICES_TRANSPORT_SERVER_URL || "http://localhost:5005"
  }
];

class MCPClientManager {
  private states: Map<string, MCPServerState> = new Map();
  private toolOwnerMap: Map<string, string> = new Map(); // toolName -> serverId

  constructor() {
    for (const conf of SERVER_CONFIGS) {
      this.states.set(conf.id, {
        id: conf.id,
        name: conf.name,
        url: conf.url,
        client: null,
        status: "offline",
        latency: -1,
        error: null
      });
    }
  }

  /**
   * Initializes connections to all servers.
   * Does not fail the startup if individual servers are offline.
   */
  async initializeAll(): Promise<void> {
    console.log("Initializing connections to MCP servers...");
    const connectPromises = Array.from(this.states.keys()).map(id => this.connectServer(id));
    await Promise.all(connectPromises);
    this.rebuildToolMap();
  }

  /**
   * Connects/Reconnects a specific server by ID
   */
  async connectServer(id: string): Promise<boolean> {
    const state = this.states.get(id);
    if (!state) return false;

    const sseUrl = `${state.url}/sse`;
    const startTime = Date.now();

    try {
      // Clean up previous client if it exists
      if (state.client) {
        try {
          await state.client.close();
        } catch (e) {}
      }

      console.log(`Connecting to ${state.name} at ${sseUrl}...`);
      const transport = new SSEClientTransport(new URL(sseUrl));
      
      const client = new Client(
        {
          name: `campuspulse-orchestrator-${id}`,
          version: "1.0.0"
        },
        {
          capabilities: {}
        }
      );

      await client.connect(transport);
      
      state.client = client;
      state.status = "online";
      state.latency = Date.now() - startTime;
      state.error = null;
      console.log(`Successfully connected to ${state.name}. Latency: ${state.latency}ms`);
      return true;
    } catch (err: any) {
      state.client = null;
      state.status = "offline";
      state.latency = -1;
      state.error = err?.message || String(err);
      console.warn(`Failed to connect to ${state.name}: ${state.error}`);
      return false;
    }
  }

  /**
   * Periodically check latency and connection state
   */
  async checkHealth(): Promise<void> {
    for (const id of this.states.keys()) {
      const state = this.states.get(id);
      if (!state) continue;

      const startTime = Date.now();
      try {
        if (state.status === "online" && state.client) {
          // Simply fetch tools list to test connection and measure latency
          await state.client.listTools();
          state.latency = Date.now() - startTime;
        } else {
          // Attempt reconnection
          await this.connectServer(id);
        }
      } catch (err: any) {
        state.status = "offline";
        state.client = null;
        state.latency = -1;
        state.error = err?.message || String(err);
      }
    }
    this.rebuildToolMap();
  }

  /**
   * Rebuilds the mapping of tool names to server IDs
   */
  private async rebuildToolMap(): Promise<void> {
    this.toolOwnerMap.clear();
    for (const [id, state] of this.states.entries()) {
      if (state.status === "online" && state.client) {
        try {
          const response = await state.client.listTools();
          for (const tool of response.tools) {
            this.toolOwnerMap.set(tool.name, id);
          }
        } catch (err) {
          console.error(`Failed to fetch tools from ${state.name}:`, err);
        }
      }
    }
  }

  /**
   * Aggregates and formats all tools across all online servers into OpenAI format
   */
  async getOpenAITools(): Promise<any[]> {
    const openaiTools: any[] = [];
    for (const [id, state] of this.states.entries()) {
      if (state.status === "online" && state.client) {
        try {
          const response = await state.client.listTools();
          for (const tool of response.tools) {
            this.toolOwnerMap.set(tool.name, id); // Ensure map is up-to-date
            openaiTools.push({
              type: "function",
              function: {
                name: tool.name,
                description: `${tool.description} (Source: ${state.name})`,
                parameters: tool.inputSchema || { type: "object", properties: {} }
              }
            });
          }
        } catch (err) {
          console.error(`Error loading tools for OpenAI format from ${id}:`, err);
        }
      }
    }
    return openaiTools;
  }

  /**
   * Calls a tool by name, executing it on the corresponding MCP server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    const ownerId = this.toolOwnerMap.get(toolName);
    if (!ownerId) {
      throw new Error(`Tool '${toolName}' not found or its owner server is currently offline.`);
    }

    const state = this.states.get(ownerId);
    if (!state || state.status === "offline" || !state.client) {
      throw new Error(`Server '${ownerId}' for tool '${toolName}' is offline.`);
    }

    try {
      const response = await state.client.callTool({
        name: toolName,
        arguments: args
      });
      return response;
    } catch (err: any) {
      console.error(`Error executing tool '${toolName}' on '${ownerId}':`, err);
      throw err;
    }
  }

  /**
   * Returns current health statuses of all servers
   */
  getHealthStatus(): MCPServerState[] {
    return Array.from(this.states.values());
  }

  /**
   * Returns true if a server is online
   */
  isServerOnline(id: string): boolean {
    return this.states.get(id)?.status === "online";
  }
}

export const mcpManager = new MCPClientManager();
export default mcpManager;
