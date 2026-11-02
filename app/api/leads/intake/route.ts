import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { createPoolLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Public intake for website forms / ad platforms. Lands in the Unassigned pool.
 * POST /api/leads/intake   header: x-api-key: <INTAKE_API_KEY>
 * body: { firstName, lastName?, email, phone?, companyName?, interest?, description?, source? }
 */
export async function POST(req: Request) {
  const key = process.env.INTAKE_API_KEY;
  if (!key || req.headers.get("x-api-key") !== key) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  try {
    const b = await req.json();
    if (!b.firstName?.trim() || !b.email?.trim()) {
      return NextResponse.json({ error: "firstName and email are required" }, { status: 400 });
    }
    const lead = await createPoolLead({ ...b, source: b.source || "WEBSITE" });
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
