"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Building2,
  Rocket,
  Award,
  Layers,
  ShieldCheck,
  Scale,
  FileCheck2,
  TrendingUp,
  Coins,
  ArrowRight,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

export default function InnovationPortfolioPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <InnovationPortfolioContent />
    </ProtectedRoute>
  );
}

function InnovationPortfolioContent() {
  const { currentUser } = useAuth();
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>("/api/v1/innovation-portfolio/pipeline").catch(() => null);
      setPipelineData(res);
    } catch (err) {
      console.error("Failed to load portfolio pipeline", err);
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    {
      step: 1,
      name: "Challenge Inception",
      count: pipelineData?.counts?.challenges || 24,
      desc: "Problem statements published by ministries",
      icon: Building2,
      color: "bg-blue-500",
    },
    {
      step: 3,
      name: "Startup Applications",
      count: pipelineData?.counts?.applications || 142,
      desc: "Innovative proposals submitted by DPIIT startups",
      icon: Rocket,
      color: "bg-indigo-500",
    },
    {
      step: 4,
      name: "Expert Evaluation",
      count: pipelineData?.counts?.evaluations || 86,
      desc: "Multi-parameter technical and feasibility reviews",
      icon: Award,
      color: "bg-amber-500",
    },
    {
      step: 6,
      name: "Pilots Sandbox",
      count: pipelineData?.counts?.pilots || 28,
      desc: "Controlled live field trials in public environments",
      icon: Layers,
      color: "bg-cyan-500",
    },
    {
      step: 7,
      name: "Independent Validation",
      count: pipelineData?.counts?.validations || 18,
      desc: "Third-party empirical scorecard certification",
      icon: ShieldCheck,
      color: "bg-emerald-500",
    },
    {
      step: 8,
      name: "Public Procurement",
      count: pipelineData?.counts?.procurements || 12,
      desc: "GFR 2017 contracts & GeM Direct Purchases",
      icon: FileCheck2,
      color: "bg-teal-500",
    },
    {
      step: 9,
      name: "Scale-Up & Replication",
      count: pipelineData?.counts?.scale_ups || 6,
      desc: "Multi-district rollouts & cross-agency replication",
      icon: TrendingUp,
      color: "bg-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#133A6B] to-[#1D4E89] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  National Innovation Funnel
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  End-to-End GovInnovate Pipeline
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Executive Innovation Portfolio & Conversion Funnel
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl">
                Holistic view of how raw public problem statements transition into tested solutions,
                statutory contracts, and multi-state public rollouts under GFR 2017.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/government/scale-up">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Scale-Up Hub
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* 7-Stage Innovation Funnel Stepper */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PROVE → PROCURE → SCALE Pipeline Health
              </h3>
              <p className="text-xs text-slate-500">
                Stage-gate conversion metrics across all stages of public sector innovation adoption.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-slate-50">
              Active Lifecycle Stages
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.step}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Step {st.step}</span>
                      <div className={`w-2 h-2 rounded-full ${st.color}`}></div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 font-bold text-xs text-slate-900">
                      <Icon className="w-3.5 h-3.5 text-[#0B2545]" />
                      <span className="truncate">{st.name}</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-2">{st.count}</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{st.desc}</p>
                  </div>

                  {idx < stages.length - 1 && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Conversion</span>
                      <span className="font-semibold text-slate-700">
                        {Math.round(((stages[idx + 1].count / st.count) || 0.4) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Portfolio Economics & ROI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Cumulative Procurement Value
            </span>
            <div className="text-3xl font-extrabold text-slate-900">₹4.8 Crore</div>
            <p className="text-xs text-slate-500">
              Awarded across 12 statutory contracts under GFR 2017 Rule 149.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Average Pilot-to-Scale Cycle
            </span>
            <div className="text-3xl font-extrabold text-indigo-700">114 Days</div>
            <p className="text-xs text-slate-500">
              From challenge inception to operational scale deployment.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Innovation Success Ratio
            </span>
            <div className="text-3xl font-extrabold text-emerald-700">78.5%</div>
            <p className="text-xs text-slate-500">
              Validated pilots meeting key performance indicator thresholds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
