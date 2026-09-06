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
  Rocket,
  Scale,
  MapPin,
  FileCheck2,
  Activity,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Compass,
  Coins,
  ChevronRight,
  ShieldCheck,
  Award,
} from "lucide-react";

export default function GovernmentScaleUpDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ScaleUpDashboardContent />
    </ProtectedRoute>
  );
}

function ScaleUpDashboardContent() {
  const { currentUser } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "decisions">("plans");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, plansData, decisionsData] = await Promise.all([
        apiRequest<any>("/api/v1/government/scale-up/dashboard").catch(() => null),
        apiRequest<any[]>("/api/v1/government/scale-up/plans").catch(() => []),
        apiRequest<any[]>("/api/v1/government/scale-up/decisions").catch(() => []),
      ]);
      setDashboardStats(statsData);
      setPlans(plansData || []);
      setDecisions(decisionsData || []);
    } catch (err) {
      console.error("Failed to load scale-up data", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      p.plan_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scale_plan_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lead_department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredDecisions = decisions.filter((d) => {
    return (
      !searchQuery ||
      d.decision_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.justification?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.decision?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE_ROLLOUT":
      case "APPROVED":
        return <Badge variant="success">{status.replace(/_/g, " ")}</Badge>;
      case "IN_PREPARATION":
      case "SUBMITTED":
      case "UNDER_COMMITTEE_REVIEW":
        return <Badge variant="default" className="bg-blue-600">{status.replace(/_/g, " ")}</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">COMPLETED</Badge>;
      case "BLOCKED":
      case "REJECTED":
        return <Badge variant="destructive">{status.replace(/_/g, " ")}</Badge>;
      default:
        return <Badge variant="secondary">{status?.replace(/_/g, " ") || "UNKNOWN"}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#133A6B] to-[#1D4E89] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Step 9 of 9
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  Scale-Up, Replication & Impact Management
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Scale-Up Operations & Replication Control
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl">
                Bridge successful pilot validations and procurement contracts into multi-state,
                cross-department rollouts with rigorous algorithmic impact measurement.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/government/scale-up/decisions">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 text-xs">
                  <Scale className="w-4 h-4" />
                  Scale Decisions Inbox
                </Button>
              </Link>
              <Link href="/government/impact">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2 text-xs">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Impact Analytics
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 w-8 p-0"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Scale Plans
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {dashboardStats?.summary?.total_scale_plans ?? plans.length}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span className="text-emerald-600 font-semibold">
                  {dashboardStats?.summary?.active_rollout_plans ?? plans.filter(p => p.status === "ACTIVE_ROLLOUT").length} Active
                </span>
                <span>•</span>
                <span>{dashboardStats?.summary?.completed_plans ?? plans.filter(p => p.status === "COMPLETED").length} Completed</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Scale Investment
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                ₹{((dashboardStats?.summary?.total_approved_scale_budget ?? 0) / 100000).toFixed(1)} Lakh
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Spent: ₹{((dashboardStats?.summary?.total_disbursed_or_spent ?? 0) / 100000).toFixed(1)} Lakh
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Deployment Targets
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {dashboardStats?.summary?.total_deployment_targets ?? 0}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span className="text-emerald-600 font-semibold">
                  {dashboardStats?.summary?.operational_sites ?? 0} Operational
                </span>
                <span>• Across India</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Replication Projects
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Compass className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {dashboardStats?.summary?.cross_dept_replications ?? 0}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Multi-agency adoption pipelines
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("plans")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "plans"
                  ? "bg-[#0B2545] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Scale-Up Rollout Plans ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab("decisions")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "decisions"
                  ? "bg-[#0B2545] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Committee Scale Decisions ({decisions.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search plan code, title, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {activeTab === "plans" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_PREPARATION">In Preparation</option>
                <option value="ACTIVE_ROLLOUT">Active Rollout</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading Scale-Up & Replication Data...</p>
          </div>
        ) : activeTab === "plans" ? (
          filteredPlans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Scale-Up Plans Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once a pilot achieves successful validation and enters procurement, the department can
                issue an approved Scale Decision and formulate a multi-phase Scale Plan.
              </p>
              <Link href="/government/scale-up/decisions" className="inline-block mt-4">
                <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> View Scale Decisions
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {plan.scale_plan_code}
                      </span>
                      {getStatusBadge(plan.status)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {plan.plan_title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {plan.executive_summary || "Multi-phase national rollout under Step 9 framework."}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Lead Department:
                        </span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {plan.lead_department}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-slate-400" />
                          Scale Budget:
                        </span>
                        <span className="font-semibold text-slate-900">
                          ₹{((plan.approved_scale_budget || 0) / 100000).toFixed(2)} Lakh
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Target Sites:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {plan.target_sites_count || 4} Locations
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {plan.target_scale_type?.replace(/_/g, " ")}
                    </span>
                    <Link href={`/government/scale-up/${plan.id}`}>
                      <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1">
                        Manage Plan
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Decisions Registry Tab */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scale-Up Committee Decisions</h3>
                <p className="text-xs text-slate-500">
                  Statutory decisions approving validated pilots for public sector scale-up
                </p>
              </div>
              <Link href="/government/scale-up/decisions">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Record Decision
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Decision Code</th>
                    <th className="px-4 py-3">Pilot</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3">Scale Type</th>
                    <th className="px-4 py-3">Budget Ceiling</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDecisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No scale-up decisions found.
                      </td>
                    </tr>
                  ) : (
                    filteredDecisions.map((dec) => (
                      <tr key={dec.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                          {dec.decision_code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {dec.pilot_title || dec.pilot_code || "Pilot #" + dec.pilot_id}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900">
                            {dec.decision?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {dec.recommended_scale_type?.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          ₹{((dec.estimated_budget_ceiling || 0) / 100000).toFixed(2)} Lakh
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(dec.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href="/government/scale-up/decisions">
                            <Button variant="outline" size="sm" className="text-xs h-7">
                              Review
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
