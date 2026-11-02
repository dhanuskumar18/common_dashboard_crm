import crypto from "crypto";
import type { PoolClient } from "pg";
import { getPool } from "./db";
import {
  Company,
  CompanyKey,
  POOL_KEY,
  getCompanies,
  getCompany,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "./config";

export type SourceKey = CompanyKey | typeof POOL_KEY;

export interface HubLead {
  id: string;
  sourceKey: SourceKey;
  sourceLabel: string;
  leadCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  leadSource: string;
  industry: string | null;
  interest: string | null;
  description: string | null;
  estimatedValue: number | null;
  currency: string;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
}

export interface LeadInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  source?: string;
  sourceDetails?: string | null;
  industry?: string | null;
  interest?: string | null;
  description?: string | null;
  estimatedValue?: number | null;
  currency?: string;
  priority?: string;
  notes?: string | null;
}

const POOL_LABEL = "Unassigned";

// ---------------------------------------------------------------------------
// Hub schema (unassigned pool + transfer audit). Created on first use.
// ---------------------------------------------------------------------------
let hubReady: Promise<void> | null = null;

export function ensureHub(): Promise<void> {
  hubReady ??= (async () => {
    const db = getPool("hub");
    await db.query(`CREATE SCHEMA IF NOT EXISTS hub`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS hub.leads (
        id               text PRIMARY KEY,
        "firstName"      text NOT NULL,
        "lastName"       text NOT NULL DEFAULT '',
        email            text NOT NULL,
        phone            text,
        "companyName"    text,
        source           text NOT NULL DEFAULT 'WEBSITE',
        "sourceDetails"  text,
        industry         text,
        interest         text,
        description      text,
        "estimatedValue" numeric(18,2),
        currency         text NOT NULL DEFAULT 'INR',
        priority         text NOT NULL DEFAULT 'MEDIUM',
        notes            text,
        status           text NOT NULL DEFAULT 'UNASSIGNED',
        "assignedCompany" text,
        "assignedLeadId"  text,
        "assignedAt"      timestamptz,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "deletedAt"      timestamptz
      )`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS hub.lead_transfers (
        id            text PRIMARY KEY,
        "fromCompany" text NOT NULL,
        "fromLeadId"  text NOT NULL,
        "toCompany"   text NOT NULL,
        "toLeadId"    text NOT NULL,
        "leadName"    text,
        "movedBy"     text,
        "movedAt"     timestamptz NOT NULL DEFAULT now()
      )`);
    await db.query(
      `CREATE INDEX IF NOT EXISTS hub_leads_status_idx ON hub.leads (status, "deletedAt")`,
    );
  })().catch((e) => {
    hubReady = null;
    throw e;
  });
  return hubReady;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

function pick<T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? v : fallback;
}

function mapCompanyRow(c: Company, r: Record<string, unknown>): HubLead {
  return {
    id: r.id as string,
    sourceKey: c.key,
    sourceLabel: c.label,
    leadCode: r.leadCode as string,
    firstName: r.firstName as string,
    lastName: r.lastName as string,
    email: r.email as string,
    phone: (r.phone as string) ?? null,
    companyName: (r.companyName as string) ?? null,
    leadSource: r.source as string,
    industry: (r.industry as string) ?? null,
    interest: (r.interest as string) ?? null,
    description: (r.description as string) ?? null,
    estimatedValue: num(r.estimatedValue),
    currency: r.currency as string,
    status: r.status as string,
    priority: r.priority as string,
    notes: (r.notes as string) ?? null,
    createdAt: iso(r.createdAt),
  };
}

function mapPoolRow(r: Record<string, unknown>): HubLead {
  return {
    id: r.id as string,
    sourceKey: POOL_KEY,
    sourceLabel: POOL_LABEL,
    leadCode: null,
    firstName: r.firstName as string,
    lastName: r.lastName as string,
    email: r.email as string,
    phone: (r.phone as string) ?? null,
    companyName: (r.companyName as string) ?? null,
    leadSource: r.source as string,
    industry: (r.industry as string) ?? null,
    interest: (r.interest as string) ?? null,
    description: (r.description as string) ?? null,
    estimatedValue: num(r.estimatedValue),
    currency: r.currency as string,
    status: "UNASSIGNED",
    priority: r.priority as string,
    notes: (r.notes as string) ?? null,
    createdAt: iso(r.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------
export interface ListParams {
  q?: string;
  source?: string; // company key | "unassigned" | "all"
  status?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

const PER_SOURCE_CAP = 3000;

async function listCompany(c: Company, p: ListParams): Promise<HubLead[]> {
  const where = [`"tenantId" = $1`, `"deletedAt" IS NULL`];
  const args: unknown[] = [c.tenantId];
  if (p.status && p.status !== "all") {
    args.push(p.status);
    where.push(`status = $${args.length}::"LeadStatus"`);
  }
  if (p.priority && p.priority !== "all") {
    args.push(p.priority);
    where.push(`priority = $${args.length}::"LeadPriority"`);
  }
  if (p.q) {
    args.push(`%${p.q}%`);
    const n = args.length;
    where.push(
      `("firstName" ILIKE $${n} OR "lastName" ILIKE $${n} OR email ILIKE $${n} OR phone ILIKE $${n}
        OR "companyName" ILIKE $${n} OR "leadCode" ILIKE $${n})`,
    );
  }
  const res = await getPool(c.db).query(
    `SELECT id, "leadCode", "firstName", "lastName", email, phone, "companyName", source::text AS source,
            industry, interest, description, "estimatedValue", currency, status::text AS status,
            priority::text AS priority, notes, "createdAt"
       FROM leads WHERE ${where.join(" AND ")}
      ORDER BY "createdAt" DESC LIMIT ${PER_SOURCE_CAP}`,
    args,
  );
  return res.rows.map((r) => mapCompanyRow(c, r));
}

async function listPool(p: ListParams): Promise<HubLead[]> {
  await ensureHub();
  if (p.status && p.status !== "all" && p.status !== "UNASSIGNED") return [];
  const where = [`status = 'UNASSIGNED'`, `"deletedAt" IS NULL`];
  const args: unknown[] = [];
  if (p.priority && p.priority !== "all") {
    args.push(p.priority);
    where.push(`priority = $${args.length}`);
  }
  if (p.q) {
    args.push(`%${p.q}%`);
    const n = args.length;
    where.push(
      `("firstName" ILIKE $${n} OR "lastName" ILIKE $${n} OR email ILIKE $${n} OR phone ILIKE $${n} OR "companyName" ILIKE $${n})`,
    );
  }
  const res = await getPool("hub").query(
    `SELECT * FROM hub.leads WHERE ${where.join(" AND ")} ORDER BY "createdAt" DESC LIMIT ${PER_SOURCE_CAP}`,
    args,
  );
  return res.rows.map(mapPoolRow);
}

export async function listLeads(p: ListParams) {
  const page = Math.max(1, p.page || 1);
  const pageSize = Math.min(100, Math.max(5, p.pageSize || 25));
  const source = p.source && p.source !== "all" ? p.source : null;

  const jobs: Promise<HubLead[]>[] = [];
  const errors: string[] = [];
  const safe = (label: string, fn: () => Promise<HubLead[]>) =>
    fn().catch((e: Error) => {
      errors.push(`${label}: ${e.message}`);
      return [] as HubLead[];
    });

  for (const c of getCompanies()) {
    if (!source || source === c.key || (source.toLowerCase() === "gst" && c.group === "GST")) {
      jobs.push(safe(c.label, () => listCompany(c, p)));
    }
  }
  if (!source || source === POOL_KEY) jobs.push(safe(POOL_LABEL, () => listPool(p)));

  const all = (await Promise.all(jobs)).flat();
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = all.length;
  return {
    data: all.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
export async function getStats() {
  const errors: string[] = [];
  const companies = await Promise.all(
    getCompanies().map(async (c) => {
      try {
        const res = await getPool(c.db).query(
          `SELECT status::text AS status, COUNT(*)::int AS n, COALESCE(SUM("estimatedValue"),0)::float AS value
             FROM leads WHERE "tenantId" = $1 AND "deletedAt" IS NULL GROUP BY status`,
          [c.tenantId],
        );
        const byStatus: Record<string, number> = {};
        let total = 0;
        let value = 0;
        for (const r of res.rows) {
          byStatus[r.status] = r.n;
          total += r.n;
          value += r.value;
        }
        return { key: c.key as SourceKey, label: c.label, group: c.group, color: c.color, total, value, byStatus };
      } catch (e) {
        errors.push(`${c.label}: ${(e as Error).message}`);
        return { key: c.key as SourceKey, label: c.label, group: c.group, color: c.color, total: 0, value: 0, byStatus: {} };
      }
    }),
  );

  let pool = 0;
  try {
    await ensureHub();
    const r = await getPool("hub").query(
      `SELECT COUNT(*)::int AS n FROM hub.leads WHERE status='UNASSIGNED' AND "deletedAt" IS NULL`,
    );
    pool = r.rows[0].n;
  } catch (e) {
    errors.push(`Unassigned pool: ${(e as Error).message}`);
  }
  return { companies, unassigned: pool, errors };
}

// ---------------------------------------------------------------------------
// Create in pool
// ---------------------------------------------------------------------------
export async function createPoolLead(input: LeadInput): Promise<HubLead> {
  await ensureHub();
  const id = crypto.randomUUID();
  const res = await getPool("hub").query(
    `INSERT INTO hub.leads (id,"firstName","lastName",email,phone,"companyName",source,"sourceDetails",
        industry,interest,description,"estimatedValue",currency,priority,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      id,
      input.firstName.trim(),
      (input.lastName || "").trim(),
      input.email.trim().toLowerCase(),
      input.phone || null,
      input.companyName || null,
      pick(LEAD_SOURCES, input.source, "WEBSITE"),
      input.sourceDetails || null,
      input.industry || null,
      input.interest || null,
      input.description || null,
      input.estimatedValue ?? null,
      input.currency || "INR",
      pick(LEAD_PRIORITIES, input.priority, "MEDIUM"),
      input.notes || null,
    ],
  );
  return mapPoolRow(res.rows[0]);
}

export async function deletePoolLead(id: string): Promise<boolean> {
  await ensureHub();
  const r = await getPool("hub").query(
    `UPDATE hub.leads SET "deletedAt" = now() WHERE id = $1 AND status = 'UNASSIGNED' AND "deletedAt" IS NULL`,
    [id],
  );
  return (r.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Assign / move
// ---------------------------------------------------------------------------
interface SourceLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  source: string;
  sourceDetails: string | null;
  industry: string | null;
  interest: string | null;
  description: string | null;
  estimatedValue: number | null;
  currency: string;
  status: string;
  priority: string;
  expectedCloseDate: Date | null;
  lastContactedAt: Date | null;
  notes: string | null;
  createdDate: Date | null;
  customFields: unknown;
  score: number;
  probability: number;
  weightedValue: number | null;
  createdAt: Date;
}

async function loadSource(sourceKey: string, id: string): Promise<{ lead: SourceLead; label: string }> {
  if (sourceKey === POOL_KEY) {
    await ensureHub();
    const r = await getPool("hub").query(
      `SELECT * FROM hub.leads WHERE id=$1 AND status='UNASSIGNED' AND "deletedAt" IS NULL`,
      [id],
    );
    if (!r.rows[0]) throw new Error("Lead not found in the unassigned pool (already assigned?)");
    const x = r.rows[0];
    return {
      label: POOL_LABEL,
      lead: {
        ...x,
        status: "NEW",
        expectedCloseDate: null,
        lastContactedAt: null,
        createdDate: null,
        customFields: null,
        score: 0,
        probability: 0,
        weightedValue: null,
        estimatedValue: num(x.estimatedValue),
      },
    };
  }
  const c = getCompany(sourceKey);
  if (!c) throw new Error(`Unknown source "${sourceKey}"`);
  const r = await getPool(c.db).query(
    `SELECT *, source::text AS source, status::text AS status, priority::text AS priority
       FROM leads WHERE id=$1 AND "tenantId"=$2 AND "deletedAt" IS NULL`,
    [id, c.tenantId],
  );
  if (!r.rows[0]) throw new Error("Lead not found in " + c.label);
  const x = r.rows[0];
  if (x.status === "CONVERTED") {
    throw new Error("This lead is already CONVERTED to a customer and cannot be moved");
  }
  return {
    label: c.label,
    lead: { ...x, estimatedValue: num(x.estimatedValue), weightedValue: num(x.weightedValue) },
  };
}

async function newLeadCode(client: PoolClient): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const code = `LEAD-${Math.floor(10000 + Math.random() * 90000)}`;
    const e = await client.query(`SELECT 1 FROM leads WHERE "leadCode" = $1`, [code]);
    if (!e.rowCount) return code;
  }
  return `LEAD-${Date.now()}`;
}

export interface AssignResult {
  id: string;
  from: string;
  to: string;
  ok: boolean;
  newLeadId?: string;
  newLeadCode?: string;
  error?: string;
}

export async function assignLead(
  sourceKey: string,
  id: string,
  targetKey: string,
  actor: string,
): Promise<AssignResult> {
  const base = { id, from: sourceKey, to: targetKey };
  try {
    if (sourceKey === targetKey) throw new Error("Lead already belongs to that company");
    const target = getCompany(targetKey);
    if (!target) throw new Error(`Unknown target company "${targetKey}"`);
    await ensureHub();

    const { lead, label: fromLabel } = await loadSource(sourceKey, id);
    const stamp = new Date().toISOString().slice(0, 10);
    const trail = `[Moved from ${fromLabel} via Common Dashboard on ${stamp}]`;
    const notes = [lead.notes, trail].filter(Boolean).join("\n");
    const newId = crypto.randomUUID();

    // 1) Insert into the target company (own transaction on the target DB)
    const client = await getPool(target.db).connect();
    let newCode: string;
    try {
      await client.query("BEGIN");
      newCode = await newLeadCode(client);
      await client.query(
        `INSERT INTO leads (id,"tenantId","leadCode","firstName","lastName",email,phone,"companyName",
            source,"sourceDetails",industry,interest,description,"estimatedValue",currency,status,priority,
            "expectedCloseDate","lastContactedAt",notes,"createdDate","customFields",score,probability,
            "weightedValue","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::"LeadSource",$10,$11,$12,$13,$14,$15,$16::"LeadStatus",
            $17::"LeadPriority",$18,$19,$20,$21,$22,$23,$24,$25,$26,now())`,
        [
          newId,
          target.tenantId,
          newCode,
          lead.firstName,
          lead.lastName || "-",
          lead.email,
          lead.phone,
          lead.companyName,
          lead.source,
          lead.sourceDetails,
          lead.industry,
          lead.interest,
          lead.description,
          lead.estimatedValue,
          lead.currency,
          lead.status,
          lead.priority,
          lead.expectedCloseDate,
          lead.lastContactedAt,
          notes,
          lead.createdDate,
          lead.customFields === null || lead.customFields === undefined
            ? null
            : JSON.stringify(lead.customFields),
          lead.score ?? 0,
          lead.probability ?? 0,
          lead.weightedValue,
          lead.createdAt,
        ],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }

    // 2) Retire the original. If this fails, undo the insert so nothing is duplicated.
    try {
      const movedNote = `[Moved to ${target.label} via Common Dashboard on ${stamp}]`;
      if (sourceKey === POOL_KEY) {
        await getPool("hub").query(
          `UPDATE hub.leads SET status='ASSIGNED', "assignedCompany"=$2, "assignedLeadId"=$3, "assignedAt"=now() WHERE id=$1`,
          [id, targetKey, newId],
        );
      } else {
        const src = getCompany(sourceKey)!;
        await getPool(src.db).query(
          `UPDATE leads SET "deletedAt"=now(), "deletedBy"=$3, "updatedAt"=now(),
                 notes = CASE WHEN notes IS NULL OR notes='' THEN $4 ELSE notes || E'\\n' || $4 END
            WHERE id=$1 AND "tenantId"=$2`,
          [id, src.tenantId, `common-dashboard:${actor}`, movedNote],
        );
      }
    } catch (e) {
      await getPool(target.db)
        .query(`DELETE FROM leads WHERE id=$1 AND "tenantId"=$2`, [newId, target.tenantId])
        .catch(() => {});
      throw e;
    }

    // 3) Audit trail
    await getPool("hub")
      .query(
        `INSERT INTO hub.lead_transfers (id,"fromCompany","fromLeadId","toCompany","toLeadId","leadName","movedBy")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), sourceKey, id, targetKey, newId, `${lead.firstName} ${lead.lastName}`.trim(), actor],
      )
      .catch((e) => console.error("[hub] transfer log failed", e.message));

    return { ...base, ok: true, newLeadId: newId, newLeadCode: newCode };
  } catch (e) {
    return { ...base, ok: false, error: (e as Error).message };
  }
}

export async function recentTransfers(limit = 15) {
  await ensureHub();
  const r = await getPool("hub").query(
    `SELECT * FROM hub.lead_transfers ORDER BY "movedAt" DESC LIMIT $1`,
    [limit],
  );
  const label = (k: string) => (k === POOL_KEY ? POOL_LABEL : getCompany(k)?.label || k);
  return r.rows.map((x) => ({
    id: x.id as string,
    leadName: x.leadName as string,
    from: label(x.fromCompany),
    to: label(x.toCompany),
    movedBy: x.movedBy as string,
    movedAt: iso(x.movedAt),
  }));
}

// ---------------------------------------------------------------------------
// Audit Logs (hub.lead_transfers + hub.leads pool events)
// ---------------------------------------------------------------------------
export interface AuditLog {
  id: string;
  action: "assign" | "create" | "delete";
  leadName: string;
  fromCompany: string | null;
  toCompany: string | null;
  actor: string;
  timestamp: string;
  meta: string | null; // extra context string (e.g., new lead code)
}

export interface AuditLogsParams {
  page: number;
  pageSize: number;
  q: string;
  action: string; // "assign" | "create" | "delete" | "all"
  from: string;   // ISO date string or ""
  to: string;     // ISO date string or ""
}

export async function getAuditLogs(p: AuditLogsParams) {
  await ensureHub();

  const label = (k: string | null) =>
    !k ? null : k === POOL_KEY ? POOL_LABEL : getCompany(k)?.label || k;

  const events: AuditLog[] = [];

  // 1) Lead transfer events (assign / move)
  if (p.action === "all" || p.action === "assign") {
    const where: string[] = [];
    const args: unknown[] = [];

    if (p.q) {
      args.push(`%${p.q}%`);
      where.push(`("leadName" ILIKE $${args.length} OR "movedBy" ILIKE $${args.length})`);
    }
    if (p.from) {
      args.push(p.from);
      where.push(`"movedAt" >= $${args.length}`);
    }
    if (p.to) {
      args.push(p.to);
      where.push(`"movedAt" <= $${args.length}::date + interval '1 day'`);
    }

    const sql = `SELECT * FROM hub.lead_transfers${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY "movedAt" DESC LIMIT 2000`;
    const r = await getPool("hub").query(sql, args);
    for (const x of r.rows) {
      events.push({
        id: x.id as string,
        action: "assign",
        leadName: x.leadName as string,
        fromCompany: label(x.fromCompany as string),
        toCompany: label(x.toCompany as string),
        actor: x.movedBy as string,
        timestamp: iso(x.movedAt),
        meta: null,
      });
    }
  }

  // 2) Pool create events
  if (p.action === "all" || p.action === "create") {
    const where: string[] = [`"deletedAt" IS NULL OR "deletedAt" IS NOT NULL`]; // all pool leads ever created
    const args: unknown[] = [];

    if (p.q) {
      args.push(`%${p.q}%`);
      where.push(`("firstName" ILIKE $${args.length} OR "lastName" ILIKE $${args.length} OR email ILIKE $${args.length})`);
    }
    if (p.from) {
      args.push(p.from);
      where.push(`"createdAt" >= $${args.length}`);
    }
    if (p.to) {
      args.push(p.to);
      where.push(`"createdAt" <= $${args.length}::date + interval '1 day'`);
    }

    const sql = `SELECT id, "firstName", "lastName", email, "createdAt" FROM hub.leads WHERE ${where.join(" AND ")} ORDER BY "createdAt" DESC LIMIT 2000`;
    const r = await getPool("hub").query(sql, args);
    for (const x of r.rows) {
      events.push({
        id: `create-${x.id as string}`,
        action: "create",
        leadName: `${x.firstName as string} ${x.lastName as string}`.trim(),
        fromCompany: null,
        toCompany: "Unassigned Pool",
        actor: "System / API",
        timestamp: iso(x.createdAt),
        meta: x.email as string,
      });
    }
  }

  // 3) Pool delete events
  if (p.action === "all" || p.action === "delete") {
    const where: string[] = [`"deletedAt" IS NOT NULL`];
    const args: unknown[] = [];

    if (p.q) {
      args.push(`%${p.q}%`);
      where.push(`("firstName" ILIKE $${args.length} OR "lastName" ILIKE $${args.length} OR email ILIKE $${args.length})`);
    }
    if (p.from) {
      args.push(p.from);
      where.push(`"deletedAt" >= $${args.length}`);
    }
    if (p.to) {
      args.push(p.to);
      where.push(`"deletedAt" <= $${args.length}::date + interval '1 day'`);
    }

    const sql = `SELECT id, "firstName", "lastName", email, "deletedAt" FROM hub.leads WHERE ${where.join(" AND ")} ORDER BY "deletedAt" DESC LIMIT 2000`;
    const r = await getPool("hub").query(sql, args);
    for (const x of r.rows) {
      events.push({
        id: `delete-${x.id as string}`,
        action: "delete",
        leadName: `${x.firstName as string} ${x.lastName as string}`.trim(),
        fromCompany: "Unassigned Pool",
        toCompany: null,
        actor: "Admin",
        timestamp: iso(x.deletedAt),
        meta: x.email as string,
      });
    }
  }

  // Sort all events by timestamp desc and paginate
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const total = events.length;
  const { page, pageSize } = p;

  // Retrieve global metric counts for audit categories
  let assignCount = 0;
  let createCount = 0;
  let deleteCount = 0;
  try {
    const [rTransfers, rCreates, rDeletes] = await Promise.all([
      getPool("hub").query(`SELECT COUNT(*)::int AS c FROM hub.lead_transfers`),
      getPool("hub").query(`SELECT COUNT(*)::int AS c FROM hub.leads`),
      getPool("hub").query(`SELECT COUNT(*)::int AS c FROM hub.leads WHERE "deletedAt" IS NOT NULL`),
    ]);
    assignCount = rTransfers.rows[0]?.c ?? 0;
    createCount = rCreates.rows[0]?.c ?? 0;
    deleteCount = rDeletes.rows[0]?.c ?? 0;
  } catch {
    assignCount = events.filter((e) => e.action === "assign").length;
    createCount = events.filter((e) => e.action === "create").length;
    deleteCount = events.filter((e) => e.action === "delete").length;
  }

  return {
    data: events.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    counts: {
      all: assignCount + createCount + deleteCount,
      assign: assignCount,
      create: createCount,
      delete: deleteCount,
    },
  };
}

export { LEAD_STATUSES, LEAD_SOURCES, LEAD_PRIORITIES };
