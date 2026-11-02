import { NextResponse } from "next/server";
import { fail, isResponse, requireSession } from "@/lib/api";
import { getCompanies } from "@/lib/config";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  createPoolLead,
  listLeads,
} from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const u = new URL(req.url).searchParams;
    const result = await listLeads({
      q: u.get("q") || undefined,
      source: u.get("source") || undefined,
      status: u.get("status") || undefined,
      priority: u.get("priority") || undefined,
      page: Number(u.get("page")) || 1,
      pageSize: Number(u.get("pageSize")) || 25,
    });
    return NextResponse.json({
      ...result,
      companies: getCompanies().map(({ key, label, group, color }) => ({ key, label, group, color })),
      enums: { statuses: LEAD_STATUSES, sources: LEAD_SOURCES, priorities: LEAD_PRIORITIES },
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const b = await req.json();
    if (!b.firstName?.trim() || !b.email?.trim()) {
      return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
    }
    const lead = await createPoolLead(b);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
