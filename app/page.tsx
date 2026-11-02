"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  Building2,
  TrendingUp,
  Clock,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  CheckCircle2,
  IndianRupee,
  LogOut,
  Menu,
  X,
  Layers,
  ArrowRight,
  Code,
  Check,
  Trash2,
  Sparkles,
  Inbox,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { CRMTablePagination } from "@/components/ui/crm-table-pagination";
import { TableDataLoader } from "@/components/ui/BouncingDots";
import type { Lead, ListResp, StatsResp, SourceKey, CompanyMeta, CompanyStats } from "@/lib/types";
import { pretty, money, when, shortDate, COMPANY_STYLE, STATUS_STYLE, PRIORITY_STYLE } from "@/lib/ui";

interface Toast {
  id: number;
  kind: "ok" | "err";
  text: string;
}

const keyOf = (l: Lead) => `${l.sourceKey}:${l.id}`;

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [list, setList] = useState<ListResp | null>(null);
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Map<string, Lead>>(new Map());
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null); // "bulk" | `${sourceKey}:${id}`
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

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

  // Session check
  useEffect(() => {
    api("/api/auth/session")
      .then((s) => setMe(s.email))
      .catch(() => {});
  }, [api]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        source,
        status,
        priority,
      });
      if (qDebounced) p.set("q", qDebounced);
      const res: ListResp = await api(`/api/leads?${p}`);
      setList(res);
    } catch (e) {
      toast("err", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, source, status, priority, qDebounced, toast]);

  const loadStats = useCallback(async () => {
    try {
      const res: StatsResp = await api("/api/stats");
      setStats(res);
    } catch {
      // errors shown via list
    }
  }, [api]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const companies = useMemo<CompanyMeta[]>(() => {
    return list?.companies ?? stats?.companies ?? [];
  }, [list, stats]);

  const rows = list?.data ?? [];
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(keyOf(r)));

  function toggleSelectLead(l: Lead) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = keyOf(l);
      if (next.has(k)) next.delete(k);
      else next.set(k, l);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(keyOf(r)));
      } else {
        rows.forEach((r) => next.set(keyOf(r), r));
      }
      return next;
    });
  }

  async function handleAssign(leadsToMove: Lead[], targetKey: string) {
    const targetCompany = companies.find((c) => c.key === targetKey);
    const targetLabel = targetCompany?.label || targetKey;
    const movable = leadsToMove.filter((i) => i.sourceKey !== targetKey);

    if (movable.length === 0) {
      toast("err", `Selected lead(s) already belong to ${targetLabel}`);
      return;
    }

    const confirmMsg =
      movable.length === 1
        ? `Assign "${movable[0].firstName} ${movable[0].lastName}" to ${targetLabel}?\n\nThis will record the lead in ${targetLabel}'s CRM and archive the previous reference.`
        : `Assign ${movable.length} leads to ${targetLabel}?\n\nAll selected leads will be transferred to ${targetLabel}.`;

    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setActiveMenuKey(null);
    try {
      const r = await api("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: targetKey,
          items: movable.map((i) => ({ source: i.sourceKey, id: i.id })),
        }),
      });

      if (r.moved) {
        toast("ok", `Successfully assigned ${r.moved} lead${r.moved > 1 ? "s" : ""} to ${targetLabel}`);
      }
      if (r.failed) {
        const firstErr = r.results?.find((x: { ok: boolean; error?: string }) => !x.ok);
        toast("err", `${r.failed} assignment(s) failed: ${firstErr?.error || "Unknown error"}`);
      }

      setSelected(new Map());
      setDetailLead(null);
      await Promise.all([loadList(), loadStats()]);
    } catch (e) {
      toast("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePoolLead(l: Lead) {
    if (!window.confirm(`Permanently delete unassigned lead "${l.firstName} ${l.lastName}"?`)) return;
    try {
      await api(`/api/leads/${l.id}`, { method: "DELETE" });
      toast("ok", "Lead deleted from unassigned pool");
      setDetailLead(null);
      await Promise.all([loadList(), loadStats()]);
    } catch (e) {
      toast("err", (e as Error).message);
    }
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  // Aggregate stats
  const totalLeadsCount = stats
    ? stats.unassigned + stats.companies.reduce((acc, c) => acc + c.total, 0)
    : 0;

  const gstCompaniesTotal = stats
    ? stats.companies.filter((c) => c.group === "GST").reduce((acc, c) => acc + c.total, 0)
    : 0;

  const nonGstTotal = stats
    ? stats.companies.filter((c) => c.group === "Non-GST").reduce((acc, c) => acc + c.total, 0)
    : 0;

  const unassignedTotal = stats?.unassigned ?? 0;

  return (
    <div className="h-screen w-screen bg-zinc-50 text-zinc-900 flex overflow-hidden font-sans antialiased">
      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer - Deep Obsidian */}
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
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2">Company Channels</div>
          <button
            onClick={() => { setSource("all"); setPage(1); setMobileDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              source === "all" ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold" : "text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4" /> All Leads Directory
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900/60 text-zinc-400 font-bold">{totalLeadsCount}</span>
          </button>

          <button
            onClick={() => { setSource("unassigned"); setPage(1); setMobileDrawerOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              source === "unassigned" ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold" : "text-zinc-300 hover:bg-zinc-900"
            }`}
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
                onClick={() => { setSource(c.key); setPage(1); setMobileDrawerOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition mb-1 ${
                  source === c.key ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Building2 className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="truncate">{c.label}</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-zinc-500">{c.group}</span>
              </button>
            ))}
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

      {/* Desktop Sidebar Panel - Deep Obsidian (zinc-950) */}
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

          {/* All Leads */}
          <button
            onClick={() => { setSource("all"); setPage(1); }}
            title="All Leads Directory"
            className={`w-full flex items-center ${sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"} py-2.5 rounded-xl text-xs font-semibold transition ${
              source === "all"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold"
                : "text-zinc-200 hover:text-white hover:bg-zinc-900/80"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4 shrink-0" />
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
            onClick={() => { setSource("unassigned"); setPage(1); }}
            title="Unassigned Pool (Awaiting Distribution)"
            className={`w-full flex items-center ${sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"} py-2.5 rounded-xl text-xs font-semibold transition ${
              source === "unassigned"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold"
                : "text-zinc-200 hover:text-white hover:bg-zinc-900/80"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Inbox className={`w-4 h-4 shrink-0 ${source === "unassigned" ? "text-zinc-950" : "text-violet-400"}`} />
              {sidebarOpen && <span>Unassigned Pool</span>}
            </span>
            {sidebarOpen && unassignedTotal > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500 text-white font-bold animate-pulse">
                {unassignedTotal} new
              </span>
            )}
          </button>

          {/* Connected Companies Section */}
          <div className="pt-4 border-t border-zinc-900/90 mt-4">
            {sidebarOpen && (
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Connected CRMs</div>
            )}
            {companies.map((c) => {
              const isActive = source === c.key;
              const compCount = stats?.companies?.find((x) => x.key === c.key)?.total ?? 0;
              return (
                <button
                  key={c.key}
                  onClick={() => { setSource(c.key); setPage(1); }}
                  title={c.label}
                  className={`w-full flex items-center ${sidebarOpen ? "justify-between px-3" : "justify-center p-2.5"} py-2 rounded-xl text-xs font-medium transition mb-1 ${
                    isActive
                      ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-900/80"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Building2 className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-950" : "text-amber-400"}`} />
                    {sidebarOpen && <span className="truncate">{c.label}</span>}
                  </span>
                  {sidebarOpen && (
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">{compCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick link to transfer history */}
          <div className="pt-4 border-t border-zinc-900/90 mt-4">
            <button
              onClick={() => setShowHistoryModal(true)}
              title="Recent Assignments Log"
              className={`w-full flex items-center ${sidebarOpen ? "px-3" : "justify-center p-2.5"} py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/80 transition`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                {sidebarOpen && <span>Assignment Activity</span>}
              </span>
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
        {/* Navigation Top Header - Clean Crisp White matching CRM-Frontend */}
        <header className="h-16 bg-white text-zinc-800 border-b border-zinc-200 flex items-center justify-between px-6 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="flex md:hidden p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-48 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search leads by name, email, code..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 text-zinc-800 placeholder-zinc-400 rounded-xl py-1.5 pl-10 pr-3 text-xs outline-none transition font-medium shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* API Ingestion Guide Button */}
            <button
              onClick={() => setShowApiModal(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-700 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-amber-600" />
              <span>Web Form / API Ingestion</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => { loadList(); loadStats(); }}
              className="p-2 text-zinc-600 hover:text-amber-600 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition cursor-pointer"
              title="Refresh leads and statistics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="h-5 w-[1px] bg-zinc-200" />

            {/* Capture New Lead Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Capture Lead</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-50/70">
          <div className="w-full space-y-6 max-w-[1480px] mx-auto">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-amber-600" />
                  Multi-Company Lead Management & Distribution
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  View, filter, and assign incoming prospects across Webnox Technologies, Webnox PVT Limited, and Non-GST systems.
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  All databases connected
                </span>
              </div>
            </div>

            {/* Metrics Banner (4 Cards matching CRM-Frontend) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Leads */}
              <div
                onClick={() => { setSource("all"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-amber-300 ${
                  source === "all" ? "ring-2 ring-amber-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Leads</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{totalLeadsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Unassigned Pool */}
              <div
                onClick={() => { setSource("unassigned"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-violet-300 ${
                  source === "unassigned" ? "ring-2 ring-violet-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Unassigned Pool</p>
                  <p className="text-2xl font-bold text-violet-700 mt-1">{unassignedTotal}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              {/* GST Leads (Both companies combined) */}
              <div
                onClick={() => { setSource("gst"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-blue-300 ${
                  source === "gst" ? "ring-2 ring-blue-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">GST Leads (2 Companies)</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{gstCompaniesTotal}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              {/* Non-GST Leads */}
              <div
                onClick={() => { setSource("nongst"); setPage(1); }}
                className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer transition hover:border-emerald-300 ${
                  source === "nongst" ? "ring-2 ring-emerald-400 border-transparent" : ""
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Non-GST Leads</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{nonGstTotal}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search prospect name, phone, email, company, or lead code..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition font-normal"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Company / Source Filter */}
                  <select
                    value={source}
                    onChange={(e) => { setSource(e.target.value); setPage(1); }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="all">All Companies & Pool</option>
                    <option value="unassigned">Unassigned Pool Only</option>
                    <option value="gst">GST Leads (Both Companies)</option>
                    {companies.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.group})
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {(list?.enums.statuses ?? []).map((st) => (
                      <option key={st} value={st}>
                        {pretty(st)}
                      </option>
                    ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={priority}
                    onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    {(list?.enums.priorities ?? []).map((pr) => (
                      <option key={pr} value={pr}>
                        {pretty(pr)}
                      </option>
                    ))}
                  </select>

                  {/* Clear button if active */}
                  {(q || source !== "all" || status !== "all" || priority !== "all") && (
                    <button
                      onClick={() => { setQ(""); setSource("all"); setStatus("all"); setPriority("all"); }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bulk Action Sticky Bar when items are checked */}
            {selected.size > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center">
                    {selected.size}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {selected.size} lead{selected.size > 1 ? "s" : ""} selected for assignment
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuKey((prev) => (prev === "bulk" ? null : "bulk"));
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <span>Assign to Company</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuKey === "bulk" && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuKey(null);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Select Destination Company
                          </div>
                          {companies.map((c) => (
                            <button
                              key={c.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuKey(null);
                                handleAssign(Array.from(selected.values()), c.key);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                                <span>{c.label}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{c.group}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setSelected(new Map())}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Leads Table Container */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto min-h-[340px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-700">
                      {/* Checkbox */}
                      <th className="py-3 px-3.5 w-10 text-center border-r border-slate-100 select-none">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[200px]">Lead / Prospect</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[150px]">Account / Company</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[170px]">Contact Info</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[160px]">Belongs To (Company)</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[130px]">Status</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[100px]">Priority</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[120px]">Est. Value</th>
                      <th className="py-3 px-3.5 text-slate-700 border-r border-slate-100 min-w-[110px]">Created</th>
                      <th className="py-3 px-3.5 text-slate-700 text-right min-w-[120px]">Assign / Move</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {loading ? (
                      <TableDataLoader colSpan={10} message="Loading consolidated prospects..." />
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-slate-300" />
                            <span className="text-sm font-semibold text-slate-700">No leads found</span>
                            <span className="text-xs text-slate-400">Try adjusting your search or filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((lead, idx) => {
                        const k = keyOf(lead);
                        const isChecked = selected.has(k);
                        const compStyle = COMPANY_STYLE[lead.sourceKey] || COMPANY_STYLE.unassigned;
                        const openUpwards = idx > rows.length - 4 && rows.length > 3;

                        return (
                          <tr
                            key={k}
                            className={`hover:bg-slate-50/70 transition group ${
                              isChecked ? "bg-amber-50/25" : ""
                            }`}
                          >
                            {/* Checkbox Column */}
                            <td className="py-3 px-3.5 text-center border-r border-slate-50">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectLead(lead)}
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>

                            {/* Lead / Name */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-zinc-950 font-black flex items-center justify-center text-[11px] shrink-0 shadow-2xs">
                                  {lead.firstName?.[0] || "L"}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    onClick={() => setDetailLead(lead)}
                                    className="font-semibold text-xs text-[#2563eb] hover:underline truncate block text-left cursor-pointer"
                                    title={`${lead.firstName} ${lead.lastName}`}
                                  >
                                    {lead.firstName} {lead.lastName}
                                  </button>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    {lead.leadCode || "UNASSIGNED POOL"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Account / Company */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50 text-xs text-slate-700 truncate max-w-[160px]">
                              <span className="truncate block font-medium">
                                {lead.companyName || "Individual Prospect"}
                              </span>
                            </td>

                            {/* Email / Phone */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50 text-xs">
                              <div className="truncate text-[#2563eb] hover:underline">
                                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {lead.phone || "—"}
                              </div>
                            </td>

                            {/* Belongs To Company */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${compStyle.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${compStyle.dot}`} />
                                <span className="truncate">{lead.sourceLabel}</span>
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  STATUS_STYLE[lead.status] || STATUS_STYLE.NEW
                                }`}
                              >
                                {pretty(lead.status)}
                              </span>
                            </td>

                            {/* Priority */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  PRIORITY_STYLE[lead.priority] || PRIORITY_STYLE.MEDIUM
                                }`}
                              >
                                {pretty(lead.priority)}
                              </span>
                            </td>

                            {/* Est Value */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50 font-mono text-xs">
                              {money(lead.estimatedValue, lead.currency)}
                            </td>

                            {/* Created */}
                            <td className="py-2.5 px-3.5 border-r border-slate-50 text-slate-500 whitespace-nowrap text-[11px]">
                              {shortDate(lead.createdAt)}
                            </td>

                            {/* Action Menu (Assign / Move) */}
                            <td className="py-2.5 px-3.5 text-right">
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuKey((prev) => (prev === k ? null : k));
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                    lead.sourceKey === "unassigned"
                                      ? "bg-amber-500 text-zinc-950 border-amber-600 hover:bg-amber-600 font-bold"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{lead.sourceKey === "unassigned" ? "Assign" : "Move"}</span>
                                  <ChevronDown className="w-3 h-3" />
                                </button>

                                {activeMenuKey === k && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuKey(null);
                                      }}
                                    />
                                    <div
                                      className={`absolute right-0 ${
                                        openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
                                      } w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150 text-left`}
                                    >
                                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {lead.sourceKey === "unassigned" ? "Assign Lead To" : "Move Lead To"}
                                      </div>
                                      {companies.map((c) => {
                                        const isCurrent = c.key === lead.sourceKey;
                                        return (
                                          <button
                                            key={c.key}
                                            type="button"
                                            disabled={isCurrent}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuKey(null);
                                              handleAssign([lead], c.key);
                                            }}
                                            className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs font-medium cursor-pointer ${
                                              isCurrent ? "opacity-40 bg-slate-50 cursor-not-allowed" : "hover:bg-slate-50 text-slate-700"
                                            }`}
                                          >
                                            <span className="flex items-center gap-2">
                                              <Building2 className="w-3.5 h-3.5 text-amber-600" />
                                              <span>{c.label}</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                              {isCurrent ? "Current" : c.group}
                                            </span>
                                          </button>
                                        );
                                      })}

                                      <div className="border-t border-slate-100 mt-1 pt-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuKey(null);
                                            setDetailLead(lead);
                                          }}
                                          className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                                          <span>View Full Details</span>
                                        </button>
                                        {lead.sourceKey === "unassigned" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuKey(null);
                                              handleDeletePoolLead(lead);
                                            }}
                                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                            <span>Delete from Pool</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
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
                totalPages={list?.meta.totalPages ?? 1}
                totalItems={list?.meta.total ?? 0}
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

      {/* ========================================================================= */}
      {/* LEAD DETAILS & ASSIGNMENT SLIDE-OVER DRAWER */}
      {/* ========================================================================= */}
      {detailLead && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setDetailLead(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-mono">
                  {detailLead.leadCode || "UNASSIGNED PROSPECT"}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-0.5">
                  {detailLead.firstName} {detailLead.lastName}
                </h2>
              </div>
              <button
                onClick={() => setDetailLead(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Current Assignment Status Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Location</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm text-slate-800">{detailLead.sourceLabel}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      COMPANY_STYLE[detailLead.sourceKey]?.badge || COMPANY_STYLE.unassigned.badge
                    }`}
                  >
                    {detailLead.sourceKey === "unassigned" ? "Needs Company" : "Active In CRM"}
                  </span>
                </div>
              </div>

              {/* Transfer Destination Cards */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {detailLead.sourceKey === "unassigned" ? "Assign to Company CRM" : "Move to Different Company"}
                </div>
                <div className="grid gap-2">
                  {companies.map((c) => {
                    const isCurrent = c.key === detailLead.sourceKey;
                    return (
                      <button
                        key={c.key}
                        disabled={busy || isCurrent}
                        onClick={() => handleAssign([detailLead], c.key)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isCurrent
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-xs active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800">{c.label}</div>
                            <div className="text-[10px] text-slate-400">{c.group} Accounting System</div>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                            isCurrent
                              ? "text-slate-400 bg-slate-100"
                              : "bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-2xs"
                          }`}
                        >
                          {isCurrent ? "Current" : "Assign →"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prospect Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prospect Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
                    <span className="font-semibold text-slate-800 break-all">{detailLead.email}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Phone</span>
                    <span className="font-semibold text-slate-800">{detailLead.phone || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Company</span>
                    <span className="font-semibold text-slate-800">{detailLead.companyName || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Source</span>
                    <span className="font-semibold text-slate-800">{pretty(detailLead.leadSource)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Est. Value</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {money(detailLead.estimatedValue, detailLead.currency)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Captured Date</span>
                    <span className="font-semibold text-slate-800">{when(detailLead.createdAt)}</span>
                  </div>
                </div>

                {detailLead.interest && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Interest / Requirement</span>
                    <p className="mt-1 text-slate-700 leading-relaxed">{detailLead.interest}</p>
                  </div>
                )}

                {detailLead.notes && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                    <span className="text-[10px] text-amber-800 block font-semibold">Audit & Transfer Trail</span>
                    <p className="mt-1 text-amber-950 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {detailLead.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            {detailLead.sourceKey === "unassigned" && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">Unassigned lead not yet in any CRM</span>
                <button
                  onClick={() => handleDeletePoolLead(detailLead)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  Delete Lead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAPTURE NEW LEAD MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <CaptureLeadModal
          sources={list?.enums.sources ?? []}
          priorities={list?.enums.priorities ?? []}
          companies={companies}
          onClose={() => setShowAddModal(false)}
          onCreated={async () => {
            setShowAddModal(false);
            toast("ok", "New lead captured successfully");
            await Promise.all([loadList(), loadStats()]);
          }}
          api={api}
          onError={(m) => toast("err", m)}
        />
      )}

      {/* ========================================================================= */}
      {/* API INGESTION GUIDE MODAL */}
      {/* ========================================================================= */}
      {showApiModal && (
        <ApiIngestionModal onClose={() => setShowApiModal(false)} />
      )}

      {/* ========================================================================= */}
      {/* ASSIGNMENT LOGS MODAL */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <AssignmentHistoryModal
          transfers={stats?.transfers ?? []}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200 ${
              t.kind === "ok"
                ? "bg-zinc-950 text-white border-zinc-800"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {t.kind === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* CAPTURE LEAD MODAL */
/* ========================================================================= */
function CaptureLeadModal({
  sources,
  priorities,
  companies,
  onClose,
  onCreated,
  api,
  onError,
}: {
  sources: string[];
  priorities: string[];
  companies: CompanyMeta[];
  onClose: () => void;
  onCreated: () => void;
  api: (url: string, init?: RequestInit) => Promise<any>;
  onError: (m: string) => void;
}) {
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    source: "WEBSITE",
    priority: "MEDIUM",
    estimatedValue: "",
    interest: "",
    description: "",
    directCompany: "unassigned",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Create in pool
      const created = await api("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : null,
        }),
      });

      // 2. If user picked a direct company, assign immediately
      if (f.directCompany && f.directCompany !== "unassigned") {
        await api("/api/leads/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: f.directCompany,
            items: [{ source: "unassigned", id: created.data.id }],
          }),
        });
      }

      onCreated();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-zinc-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 font-black flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Capture New Lead</h2>
              <p className="text-[11px] text-zinc-400">Save prospect and optionally route directly to a company CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">First Name *</label>
              <input
                required
                value={f.firstName}
                onChange={(e) => setF({ ...f, firstName: e.target.value })}
                placeholder="John"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Last Name</label>
              <input
                value={f.lastName}
                onChange={(e) => setF({ ...f, lastName: e.target.value })}
                placeholder="Doe"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Company / Organization</label>
              <input
                value={f.companyName}
                onChange={(e) => setF({ ...f, companyName: e.target.value })}
                placeholder="Acme Corp"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Estimated Value (₹)</label>
              <input
                type="number"
                min="0"
                value={f.estimatedValue}
                onChange={(e) => setF({ ...f, estimatedValue: e.target.value })}
                placeholder="50000"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl py-2 px-3 text-xs outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Lead Source</label>
              <select
                value={f.source}
                onChange={(e) => setF({ ...f, source: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-amber-500 cursor-pointer"
              >
                {sources.map((s) => (
                  <option key={s} value={s}>{pretty(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Priority</label>
              <select
                value={f.priority}
                onChange={(e) => setF({ ...f, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-amber-500 cursor-pointer"
              >
                {priorities.map((pr) => (
                  <option key={pr} value={pr}>{pretty(pr)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assign Destination Option */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <label className="text-[11px] font-bold text-amber-900 block mb-1.5">
              Assign to Company Immediately
            </label>
            <select
              value={f.directCompany}
              onChange={(e) => setF({ ...f, directCompany: e.target.value })}
              className="w-full bg-white border border-amber-300 text-slate-800 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="unassigned">Keep in Unassigned Pool (Decide Later)</option>
              {companies.map((c) => (
                <option key={c.key} value={c.key}>
                  Directly to {c.label} ({c.group})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Lead..." : "Save Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* API INGESTION GUIDE MODAL */
/* ========================================================================= */
function ApiIngestionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-zinc-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 font-black flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Web Form & API Ingestion</h2>
              <p className="text-[11px] text-zinc-400">Receive leads automatically from landing pages or ads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            External marketing sites, contact forms, or webhooks can POST directly to this endpoint. Leads arrive in the <strong>Unassigned Pool</strong>, ready for instant one-click distribution.
          </p>

          <div className="space-y-1.5">
            <span className="font-bold text-slate-700 block">HTTP Request Format:</span>
            <pre className="p-3 rounded-xl bg-zinc-950 text-amber-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`POST /api/leads/intake
Headers:
  Content-Type: application/json
  x-api-key: change-this-intake-key

Body:
{
  "firstName": "Alex",
  "lastName": "Smith",
  "email": "alex@example.com",
  "phone": "+91 9876543210",
  "companyName": "Tech Ventures",
  "interest": "Cloud Hosting & ERP",
  "source": "WEBSITE"
}`}
            </pre>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
            <strong>Security Note:</strong> You can configure the API Key inside <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">.env.local</code> as <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">INTAKE_API_KEY</code>.
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* ASSIGNMENT HISTORY MODAL */
/* ========================================================================= */
function AssignmentHistoryModal({
  transfers,
  onClose,
}: {
  transfers: { id: string; leadName: string; from: string; to: string; movedBy: string; movedAt: string }[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-zinc-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 font-black flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Recent Lead Distribution Logs</h2>
              <p className="text-[11px] text-zinc-400">Audit trail of cross-company moves and assignments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {transfers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No assignments recorded yet. Leads moved from the dashboard will appear here.
            </div>
          ) : (
            transfers.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-800 block truncate">{t.leadName}</span>
                    <span className="text-[11px] text-slate-400">
                      {t.from} → <strong className="text-slate-700">{t.to}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block font-medium">{t.movedBy}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{when(t.movedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
