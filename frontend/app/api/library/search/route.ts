import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${orchestratorUrl}/api/library/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Orchestrator returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
