import { NextResponse } from "next/server";

export async function GET() {
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${orchestratorUrl}/api/library/hours`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
