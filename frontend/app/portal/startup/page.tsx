"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Search,
  CheckCircle2,
  Clock,
  FlaskConical,
  Award,
  LogOut,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoredAuth, clearStoredAuth, apiRequest } from "@/lib/auth";

export default function StartupPortalPage() {
  const router = useRouter();
  const [auth, setAuth] = useState(getStoredAuth());
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentAuth = getStoredAuth();
    setAuth(currentAuth);

    async function loadOverview() {
      try {
        const data = await apiRequest<any>("/api/v1/portal/startup-overview");
        setOverview(data);
      } catch (err) {
        // Fallback for demo
        setOverview({
          portal: "Startup Portal",
          user_name: currentAuth.user?.full_name || "Startup Founder",
          company: currentAuth.user?.company_name || "InnovateTech AI Solutions",
          dpiit_status: "RECOGNIZED",
          role: "STARTUP",
          metrics: {
            submitted_applications: 2,
            shortlisted_for_pilot: 1,
            active_sandbox_pilots: 1,
            verified_kpis: 3,
          },
        });
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  const handleSignOut = () => {
    clearStoredAuth();
    router.push("/");
  };

  const user = auth.user;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Startup Portal Bar */}
      <header className="bg-slate-900 text-white py-4 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">
                  Startup Innovation Portal
                </h1>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  DPIIT Verified Sandbox
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {overview?.company || user?.company_name || "InnovateTech AI"} • Direct Public Procurement Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Public Gateway
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Startup Welcome Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Innovation Sandbox Dashboard
              </span>
              <Badge variant="success" className="text-[10px]">
                Prior Turnover Exempted
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {overview?.company || user?.company_name || "Startup Sandbox"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Representative: <span className="font-semibold text-slate-800">{user?.full_name || "Innovator"}</span> ({user?.email || "founder@startup.io"})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="md" className="gap-2 text-xs font-semibold">
              <Search className="w-4 h-4" />
              Explore Open Challenges
            </Button>
            <Button variant="outline" size="md" className="text-xs">
              Submit Milestone Report
            </Button>
          </div>
        </div>

        {/* 4-Stat Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Applications</span>
              <Rocket className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.submitted_applications ?? 2}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Proposals submitted to ministries
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Pilots</span>
              <FlaskConical className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.active_sandbox_pilots ?? 1}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Funded government sandbox trials
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Tranche Disbursements</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              ₹5,00,000
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Milestone 1 tranche released
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Verified KPIs</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.verified_kpis ?? 3}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Audited by 3rd party laboratories
            </p>
          </div>
        </div>

        {/* Active Sandbox Pilot */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Active Operational Sandbox Pilots
              </h3>
              <p className="text-xs text-slate-500">
                Live field deployment with milestone grant tranches
              </p>
            </div>
            <Badge variant="success" className="text-xs">
              Live Field Sandbox
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-900">PILOT-2024-001</span>
                  <Badge variant="gov" className="text-[10px]">Ministry of Health & Family Welfare</Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Rural PHC AI-Triage Sandbox Trial
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Sandbox Location: District Sub-Divisional Hospital, Alwar (Rajasthan). Controlled 12-week deployment with real clinical patient triage telemetry.
                </p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-2">
                <div>
                  <span className="text-xs text-slate-500 block">Sanctioned Pilot Grant</span>
                  <span className="text-lg font-extrabold text-slate-900">₹15,00,000</span>
                </div>
                <Link href="/pilots/PILOT-2024-001">
                  <Button variant="secondary" size="sm" className="text-xs gap-1">
                    Open Sandbox Telemetry <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Milestone Tracker */}
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Milestone Execution Progress
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-800">Milestone 1</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-900">Onboarding & Baseline Setup</p>
                  <span className="text-[11px] text-emerald-700 font-semibold block mt-1">₹5,00,000 Disbursed</span>
                </div>

                <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-900">Milestone 2</span>
                    <Clock className="w-4 h-4 text-blue-800 animate-pulse" />
                  </div>
                  <p className="text-xs font-medium text-slate-900">5,000 Patient Triage Runs</p>
                  <span className="text-[11px] text-blue-800 font-semibold block mt-1">In Progress (82%)</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-400">Milestone 3</span>
                    <FileCheck className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">3rd-Party STQC Audit</p>
                  <span className="text-[11px] text-slate-500 block mt-1">₹5,00,000 on Certification</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
