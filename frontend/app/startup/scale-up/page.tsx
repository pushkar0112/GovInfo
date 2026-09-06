"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Building2,
  MapPin,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Send,
  Layers,
} from "lucide-react";

export default function StartupScaleUpDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <StartupScaleUpContent />
    </ProtectedRoute>
  );
}

function StartupScaleUpContent() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any[]>("/api/v1/startup/scale-up/plans").catch(() => []);
      setPlans(res || []);
    } catch (err) {
      console.error("Failed to load startup scale plans", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#133A6B] to-[#1D4E89] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Step 9: Scale-Up Operations
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  Startup Field Deployment Desk
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Scale-Up Deployments & Impact Reporting
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl">
                Execute your multi-site public sector rollout. Submit site installation updates, log
                operational blockers, and report verifiable impact measurements with SHA-256 evidence.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadPlans}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start md:self-auto h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Plans Listing */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading Scale-Up Plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Scale-Up Plans Active</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Once your pilot completes independent validation and is awarded a procurement contract,
              the government department initiates a Scale-Up Rollout Plan with you.
            </p>
            <Link href="/startup/pilots" className="inline-block mt-4">
              <Button size="sm" className="bg-[#0B2545] text-white text-xs">
                View My Pilots
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {p.scale_plan_code}
                    </span>
                    <Badge
                      variant={p.status === "ACTIVE_ROLLOUT" ? "success" : "default"}
                      className="text-[10px]"
                    >
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{p.plan_title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {p.executive_summary || "Multi-site rollout under government framework."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Lead Department:
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {p.lead_department}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-slate-400" />
                        Approved Scale Budget:
                      </span>
                      <span className="font-semibold text-slate-900">
                        ₹{((p.approved_scale_budget || 0) / 100000).toFixed(2)} Lakh
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Target Sites:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {p.target_sites_count || 4} Locations
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {p.target_scale_type?.replace(/_/g, " ")}
                  </span>
                  <Link href={`/startup/scale-up/${p.id}`}>
                    <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1">
                      Rollout Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
