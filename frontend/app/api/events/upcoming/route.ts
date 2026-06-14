import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://localhost:4000";
  const { searchParams } = new URL(req.url);
  const days = searchParams.get("days") || "7";
  
  try {
    const res = await fetch(`${orchestratorUrl}/api/events/upcoming?days=${days}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
