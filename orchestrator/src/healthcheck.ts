import { Router, Request, Response } from "express";
import mcpManager from "./mcpClients/manager.js";

const router = Router();

// Background health check polling every 30 seconds
let healthCheckInterval: NodeJS.Timeout | null = null;

export function startHealthCheckMonitoring() {
  if (healthCheckInterval) return;
  
  console.log("Starting background health-check monitoring for MCP servers (30s interval)...");
  healthCheckInterval = setInterval(async () => {
    try {
      await mcpManager.checkHealth();
    } catch (e) {
      console.error("Error running background health check:", e);
    }
  }, 30000);
}

export function stopHealthCheckMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// GET /status - returns connection status, latency, and errors for all servers
router.get("/status", async (req: Request, res: Response) => {
  // We can trigger a quick health check on-demand when the page loads, so status is fresh
  try {
    await mcpManager.checkHealth();
  } catch (e) {}

  const states = mcpManager.getHealthStatus();
  
  // Format response for frontend consumption
  const statusSummary = states.map(s => ({
    id: s.id,
    name: s.name,
    url: s.url,
    status: s.status,
    latency: s.latency,
    error: s.error
  }));

  res.json({
    timestamp: new Date().toISOString(),
    servers: statusSummary
  });
});

export default router;
