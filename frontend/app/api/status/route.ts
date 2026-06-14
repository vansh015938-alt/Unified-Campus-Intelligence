import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${orchestratorUrl}/api/status`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reach health endpoint." }, { status: 502 });
  }
}
