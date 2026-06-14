import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://localhost:4000";
  
  try {
    const body = await req.json();

    const res = await fetch(`${orchestratorUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!res.body) {
      return new Response(JSON.stringify({ error: "No response body from orchestrator" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Forward the stream
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (err: any) {
    console.error("Proxy error in api/chat:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to reach orchestrator." }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
