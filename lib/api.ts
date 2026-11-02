import { NextResponse } from "next/server";
import { sessionFromRequest } from "./auth";

export function requireSession(req: Request): { email: string } | NextResponse {
  const s = sessionFromRequest(req);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return s;
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function fail(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[api]", message);
  return NextResponse.json({ error: message }, { status });
}
