import type { SourceKey } from "./types";

export const pretty = (s: string) =>
  s.replace(/_/g, " ").toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase());

export const money = (v: number | null, cur = "INR") =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: cur || "INR", maximumFractionDigits: 0 }).format(v);

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Static class strings so Tailwind can see them. */
export const COMPANY_STYLE: Record<SourceKey, { badge: string; dot: string; iconBox: string; ring: string; solid: string }> = {
  gst_webnox: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    iconBox: "bg-amber-50 border-amber-100 text-amber-600",
    ring: "hover:border-amber-300 data-[active=true]:border-amber-400 data-[active=true]:ring-2 data-[active=true]:ring-amber-200",
    solid: "bg-amber-500",
  },
  gst_pvt: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    iconBox: "bg-blue-50 border-blue-100 text-blue-600",
    ring: "hover:border-blue-300 data-[active=true]:border-blue-400 data-[active=true]:ring-2 data-[active=true]:ring-blue-200",
    solid: "bg-blue-500",
  },
  nongst: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    iconBox: "bg-emerald-50 border-emerald-100 text-emerald-600",
    ring: "hover:border-emerald-300 data-[active=true]:border-emerald-400 data-[active=true]:ring-2 data-[active=true]:ring-emerald-200",
    solid: "bg-emerald-500",
  },
  unassigned: {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    iconBox: "bg-violet-50 border-violet-100 text-violet-600",
    ring: "hover:border-violet-300 data-[active=true]:border-violet-400 data-[active=true]:ring-2 data-[active=true]:ring-violet-200",
    solid: "bg-violet-500",
  },
};

export const STATUS_STYLE: Record<string, string> = {
  UNASSIGNED: "bg-violet-50 text-violet-700 border-violet-200",
  NEW: "bg-sky-50 text-sky-700 border-sky-200",
  CONTACTED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROPOSAL_SENT: "bg-amber-50 text-amber-700 border-amber-200",
  NEGOTIATION: "bg-orange-50 text-orange-700 border-orange-200",
  WON: "bg-green-50 text-green-700 border-green-200",
  UNQUALIFIED: "bg-slate-100 text-slate-600 border-slate-200",
  CONVERTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  LOST: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200",
};
