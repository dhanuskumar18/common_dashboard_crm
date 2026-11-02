import { NextResponse } from "next/server";
import { fail, isResponse, requireSession } from "@/lib/api";
import { getStats, recentTransfers } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const [stats, transfers] = await Promise.all([getStats(), recentTransfers().catch(() => [])]);
    return NextResponse.json({ ...stats, transfers });
  } catch (e) {
    return fail(e);
  }
}
