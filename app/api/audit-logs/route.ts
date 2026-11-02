import { NextResponse } from "next/server";
import { fail, isResponse, requireSession } from "@/lib/api";
import { getAuditLogs } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * GET /api/audit-logs
 * Query params:
 *   page      – page number (default 1)
 *   pageSize  – items per page (default 25, max 100)
 *   q         – search by lead name or actor email
 *   action    – filter by action type: "assign" | "create" | "delete" | "all"
 *   from      – ISO date start filter
 *   to        – ISO date end filter
 */
export async function GET(req: Request) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") || 25)));
    const q = url.searchParams.get("q") || "";
    const action = url.searchParams.get("action") || "all";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    const result = await getAuditLogs({ page, pageSize, q, action, from, to });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}

