import { NextResponse } from "next/server";
import { fail, isResponse, requireSession } from "@/lib/api";
import { deletePoolLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Only unassigned pool leads can be deleted from here. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = requireSession(req);
  if (isResponse(s)) return s;
  try {
    const { id } = await ctx.params;
    const ok = await deletePoolLead(id);
    if (!ok) return NextResponse.json({ error: "Lead not found in unassigned pool" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
