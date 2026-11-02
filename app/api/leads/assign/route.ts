import { NextResponse } from "next/server";
import { fail, isResponse, requireSession } from "@/lib/api";
import { assignLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Body: { items: [{ source, id }], target }  — moves each lead into the target company. */
export async function POST(req: Request) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const b = await req.json();
    const items: { source: string; id: string }[] = Array.isArray(b.items) ? b.items : [];
    if (!items.length || !b.target) {
      return NextResponse.json({ error: "items and target are required" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: "Too many leads in one request (max 200)" }, { status: 400 });
    }
    const results = [];
    // Sequential on purpose: keeps lead-code generation race-free per target.
    for (const it of items) {
      results.push(await assignLead(it.source, it.id, b.target, s.email));
    }
    return NextResponse.json({
      results,
      moved: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (e) {
    return fail(e);
  }
}
