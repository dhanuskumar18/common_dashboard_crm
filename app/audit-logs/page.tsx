"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Users,
  Inbox,
  LogOut,
  Menu,
  X,
  Search,
  RefreshCw,
  ArrowRight,
  ClipboardList,
  UserPlus,
  UserMinus,
  Activity,
  ArrowLeft,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { CRMTablePagination } from "@/components/ui/crm-table-pagination";
import { TableDataLoader } from "@/components/ui/BouncingDots";
import type { AuditLog, AuditLogsResp, StatsResp, CompanyMeta } from "@/lib/types";
import { when, shortDate } from "@/lib/ui";

type AuditAction = "all" | "assign" | "create" | "delete";

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; badge: string; dot: string; icon: React.ReactNode; description: string }
> = {
  all: {
    label: "All Actions",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    icon: <Activity className="w-4 h-4" />,
    description: "Every action recorded across the lead distribution ecosystem",
  },
  assign: {
    label: "Assignments & Moves",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    icon: <ArrowRight className="w-4 h-4 text-amber-600" />,
    description: "Leads transferred between companies or allocated from pool",
  },
  create: {
    label: "Lead Ingestions",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    icon: <UserPlus className="w-4 h-4 text-emerald-600" />,
    description: "New prospects captured via manual entry, form, or webhook API",
  },
  delete: {
    label: "Removals & Purges",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    icon: <UserMinus className="w-4 h-4 text-rose-600" />,
    description: "Unassigned leads deleted from the common hub pool",
  },
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResp | null>(null);

  // Logs data
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, assign: 0, create: 0, delete: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [action, setAction] = useState<AuditAction>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Navigation & Drawer
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const api = useCallback(
    async (url: string, init?: RequestInit) => {
      const res = await fetch(url, init);
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Session expired. Please sign in again.");
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
      return j;
    },
    [router]
  );

  // Check auth session
  useEffect(() => {
    api("/api/auth/session")
      .then((s) => setMe(s.email))
      .catch(() => {});
  }, [api]);

  // Load stats for sidebar counts
  const loadStats = useCallback(async () => {
    try {
      const res: StatsResp = await api("/api/stats");
      setStats(res);
    } catch {
      // ignore
    }
  }, [api]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Load audit logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        action,
      });
      if (qDebounced) p.set("q", qDebounced);
      if (from) p.set("from", from);
      if (to) p.set("to", to);

      const res: AuditLogsResp = await api(`/api/audit-logs?${p}`);
      setLogs(res.data);
      setMeta(res.meta);
      if (res.counts) setCounts(res.counts);
    } catch {
      // ignore error
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, action, qDebounced, from, to]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const companies = useMemo<CompanyMeta[]>(() => {
    return stats?.companies ?? [];
  }, [stats]);

  const totalLeadsCount = stats
    ? stats.unassigned + stats.companies.reduce((acc, c) => acc + c.total, 0)
    : 0;
  const unassignedTotal = stats?.unassigned ?? 0;

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  const actionKeys: AuditAction[] = ["all", "assign", "create", "delete"];
  const hasActiveFilters = Boolean(q || from || to || action !== "all");

  return (
    <div className="h-screen w-screen bg-zinc-50 text-zinc-900 flex overflow-hidden font-sans antialiased">
      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-zinc-950 text-zinc-100 border-r border-zinc-900 z-50 flex flex-col transition-transform duration-300 ease-out md:hidden ${
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300/40 flex items-center justify-center shadow-md shadow-amber-500/20 text-zinc-950 font-black">
              <ShieldCheck className="w-5 h-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-tight">CostTracking</span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Common Lead Hub</span>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2">Lead Channels</div>
          <button
            onClick={() => { setMobileDrawerOpen(false); router.push("/"); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition"
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4" /> All Leads Directory
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900/60 text-zinc-400 font-bold">{totalLeadsCount}</span>
          </button>

          <button
            onClick={() => { setMobileDrawerOpen(false); router.push("/?source=unassigned"); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition"
          >
            <span className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-violet-400" /> Unassigned Pool
            </span>
            {unassignedTotal > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold">
                {unassignedTotal}
              </span>
            )}
          </button>

          <div className="pt-3 border-t border-zinc-900 mt-3">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Connected CRMs</div>
            {companies.map((c) => (
              <button
                key={c.key}
                onClick={() => { setMobileDrawerOpen(false); router.push(`/?source=${c.key}`); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition mb-1"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Building2 className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="truncate">{c.label}</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-zinc-500">{c.group}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-900 mt-3">
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 transition"
            >
              <ClipboardList className="w-4 h-4 shrink-0 text-zinc-950" />
              Audit Logs
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-amber-500 border border-amber-400/40 flex items-center justify-center text-zinc-950 font-black text-xs shrink-0 shadow-xs">
              A
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{me || "Super Admin"}</p>
              <p className="text-[10px] text-zinc-400 truncate">Central Controller</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar Panel */}
      <aside
        className={`${
          sidebarOpen ? "w-[260px]" : "w-18"
        } hidden md:flex flex-col bg-zinc-950 text-zinc-100 border-r border-zinc-900 transition-all duration-300 shrink-0 relative z-30 shadow-2xl`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-zinc-900 flex items-center px-5 bg-zinc-950">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 text-zinc-950 font-black">
              <ShieldCheck className="w-5 h-5 text-zinc-950" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base text-white tracking-tight truncate">CostTracking</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold truncate">
                  Common Lead Hub
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {sidebarOpen && (
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2">Lead Channels</div>
          )}

          {/* All Leads (link back to home) */}
          <button
            onClick={() => router.push("/")}
            title="All Leads Directory"
            className={`w-full flex items-center ${
              sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"
            } py-2.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-900/80 transition`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0 text-zinc-400" />
              {sidebarOpen && <span>All Leads Directory</span>}
            </span>
            {sidebarOpen && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
                {totalLeadsCount}
              </span>
            )}
          </button>

          {/* Unassigned Pool */}
          <button
            onClick={() => router.push("/?source=unassigned")}
            title="Unassigned Pool"
            className={`w-full flex items-center ${
              sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"
            } py-2.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-900/80 transition`}
          >
            <span className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 shrink-0 text-violet-400" />
              {sidebarOpen && <span>Unassigned Pool</span>}
            </span>
            {sidebarOpen && unassignedTotal > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500 text-white font-bold">
                {unassignedTotal}
              </span>
            )}
          </button>

          {/* Connected Companies Section */}
          <div className="pt-4 border-t border-zinc-900/90 mt-4">
            {sidebarOpen && (
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Connected CRMs</div>
            )}
            {companies.map((c) => {
              const compCount = stats?.companies?.find((x) => x.key === c.key)?.total ?? 0;
              return (
                <button
                  key={c.key}
                  onClick={() => router.push(`/?source=${c.key}`)}
                  title={c.label}
                  className={`w-full flex items-center ${
                    sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"
                  } py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/80 transition mb-1`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Building2 className="w-4 h-4 shrink-0 text-amber-400" />
                    {sidebarOpen && <span className="truncate">{c.label}</span>}
                  </span>
                  {sidebarOpen && (
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">{compCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dedicated Audit Logs Active Item */}
          <div className="pt-4 border-t border-zinc-900/90 mt-4">
            <button
              title="Audit Logs"
              className={`w-full flex items-center ${
                sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"
              } py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 transition`}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 shrink-0 text-zinc-950" />
                {sidebarOpen && <span>Audit Logs</span>}
              </span>
              {sidebarOpen && counts.all > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-950 text-white font-bold font-mono">
                  {counts.all}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Bottom Profile info */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-500 border border-amber-400/40 flex items-center justify-center text-zinc-950 font-black text-xs shrink-0 shadow-xs">
                A
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <p className="text-xs font-bold text-zinc-200 truncate">{me || "Administrator"}</p>
                  <p className="text-[10px] text-zinc-400 truncate">Central Distribution</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50">
        {/* Navigation Top Header */}
        <header className="h-16 bg-white text-zinc-800 border-b border-zinc-200 flex items-center justify-between px-6 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="flex md:hidden p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Leads</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Refresh */}
            <button
              onClick={() => { loadLogs(); loadStats(); }}
              className="p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
              title="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50/70">
          <div className="w-full space-y-6 max-w-[1480px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <span onClick={() => router.push("/")} className="hover:text-amber-600 cursor-pointer transition">
                    Lead Hub
                  </span>
                  <span>/</span>
                  <span className="text-slate-800">Audit Logs</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                  System Audit Logs & Distribution History
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Immutable record of lead assignments, multi-company routing, new prospect captures, and pool purges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Live Hub Audit Stream
                </span>
              </div>
            </div>

            {/* Metrics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Events */}
              <div
                onClick={() => { setAction("all"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-blue-300 ${
                  action === "all" ? "ring-2 ring-blue-500 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Audit Logs</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{counts.all}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              {/* Assignment Moves */}
              <div
                onClick={() => { setAction("assign"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-amber-300 ${
                  action === "assign" ? "ring-2 ring-amber-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Assignments & Moves</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{counts.assign}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              {/* Lead Creations */}
              <div
                onClick={() => { setAction("create"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-emerald-300 ${
                  action === "create" ? "ring-2 ring-emerald-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">New Ingestions</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.create}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>

              {/* Pool Deletions */}
              <div
                onClick={() => { setAction("delete"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-rose-300 ${
                  action === "delete" ? "ring-2 ring-rose-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Pool Removals</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{counts.delete}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <UserMinus className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by prospect name, email, or administrator..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition font-normal"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Action filter pills */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {actionKeys.map((a) => {
                      const isActive = action === a;
                      return (
                        <button
                          key={a}
                          onClick={() => { setAction(a); setPage(1); }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? "bg-zinc-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          }`}
                        >
                          {a !== "all" && (
                            <span className={`w-1.5 h-1.5 rounded-full ${ACTION_CONFIG[a].dot}`} />
                          )}
                          <span>{ACTION_CONFIG[a].label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Date range inputs */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                      className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
                      title="From Date"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => { setTo(e.target.value); setPage(1); }}
                      className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
                      title="To Date"
                    />
                  </div>

                  {/* Clear button */}
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setQ("");
                        setFrom("");
                        setTo("");
                        setAction("all");
                        setPage(1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto min-h-[380px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      <th className="py-3 px-4 border-r border-slate-100 min-w-[140px]">Action Type</th>
                      <th className="py-3 px-4 border-r border-slate-100 min-w-[220px]">Lead / Prospect</th>
                      <th className="py-3 px-4 border-r border-slate-100 min-w-[220px]">Routing / Movement</th>
                      <th className="py-3 px-4 border-r border-slate-100 min-w-[180px]">Initiated By</th>
                      <th className="py-3 px-4 border-r border-slate-100 min-w-[150px]">Reference / Meta</th>
                      <th className="py-3 px-4 min-w-[160px] text-right">Timestamp</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {loading ? (
                      <TableDataLoader colSpan={6} message="Retrieving audit records from the Lead Hub..." />
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ClipboardList className="w-10 h-10 text-slate-300" />
                            <span className="text-sm font-semibold text-slate-700">No audit logs found</span>
                            <span className="text-xs text-slate-400 max-w-sm">
                              {hasActiveFilters
                                ? "No actions matched your active filters or search terms. Try clearing them."
                                : "Actions like lead assignments and unassigned pool creations will automatically appear here."}
                            </span>
                            {hasActiveFilters && (
                              <button
                                onClick={() => {
                                  setQ("");
                                  setFrom("");
                                  setTo("");
                                  setAction("all");
                                  setPage(1);
                                }}
                                className="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.assign;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition">
                            {/* Action badge */}
                            <td className="py-3 px-4 border-r border-slate-50">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                <span>{cfg.label}</span>
                              </span>
                            </td>

                            {/* Lead Name */}
                            <td className="py-3 px-4 border-r border-slate-50">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                                  {log.leadName?.[0] || "L"}
                                </div>
                                <div className="min-w-0 truncate">
                                  <span className="font-semibold text-xs text-slate-800 block truncate">
                                    {log.leadName || "Unnamed Lead"}
                                  </span>
                                  {log.meta && (
                                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                                      {log.meta}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Movement / Routing */}
                            <td className="py-3 px-4 border-r border-slate-50">
                              {log.action === "assign" ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                    {log.fromCompany || "Unassigned Pool"}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="font-bold text-slate-800 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                                    {log.toCompany || "Target CRM"}
                                  </span>
                                </div>
                              ) : log.action === "create" ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Ingested into Unassigned Pool
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                                  <UserMinus className="w-3.5 h-3.5" />
                                  Permanently Removed from Pool
                                </span>
                              )}
                            </td>

                            {/* Initiated By */}
                            <td className="py-3 px-4 border-r border-slate-50">
                              <div className="truncate">
                                <span className="font-medium text-xs text-slate-700 block truncate">
                                  {log.actor}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {log.actor.includes("@") ? "Admin User" : "Automated System"}
                                </span>
                              </div>
                            </td>

                            {/* Reference / Meta */}
                            <td className="py-3 px-4 border-r border-slate-50 font-mono text-[11px] text-slate-500">
                              <span className="truncate block max-w-[150px]" title={log.id}>
                                {log.id.slice(0, 16)}...
                              </span>
                            </td>

                            {/* Timestamp */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span className="font-semibold text-xs text-slate-800 block">
                                {when(log.timestamp)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {shortDate(log.timestamp)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* CRM Pagination Bar */}
              <CRMTablePagination
                currentPage={page}
                totalPages={meta.totalPages || 1}
                totalItems={meta.total}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

