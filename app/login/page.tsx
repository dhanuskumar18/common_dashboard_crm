"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Login failed");
        return;
      }
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4 sm:p-8 font-sans select-none overflow-hidden relative">
      {/* Ambient background glow matching CRM */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Outer White Rounded Container */}
      <div className="relative w-full max-w-[880px] min-h-[520px] bg-white rounded-[32px] shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col md:flex-row items-stretch z-10">
        
        {/* Left Side: Brand Panel */}
        <div className="w-full md:w-5/12 bg-zinc-950 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300/40 flex items-center justify-center shadow-md shadow-amber-500/20 text-zinc-950 font-black">
                <ShieldCheck className="w-6 h-6 text-zinc-950" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white tracking-tight">CostTracking</span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Common Lead Hub</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-6 leading-snug">
              Unified Lead Management & Multi-Company Distribution
            </h2>
            <p className="text-xs text-zinc-400 mt-2 font-normal leading-relaxed">
              Consolidated command center to view, manage, and assign leads across Webnox Technologies, Webnox PVT Limited, and Non-GST systems.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-900 relative z-10">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All 3 company pipelines connected</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-[360px] mx-auto w-full space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Sign in to Lead Hub
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your administrative credentials to continue
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="login-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@webnox.io"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
