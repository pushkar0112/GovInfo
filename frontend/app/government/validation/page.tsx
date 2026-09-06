"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Building2,
  ArrowUpRight,
  Loader2,
  Scale,
} from "lucide-react";

interface ValidationDashboardData {
  total_pilots: number;
  validations_completed: number;
  under_validation: number;
  awaiting_assignment: number;
  successful_pilots: number;
  partially_successful_pilots: number;
  failed_pilots: number;
  average_achievement_percentage: number;
  pilots: any[];
}

export default function GovernmentValidationDashboardPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<ValidationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await apiRequest<ValidationDashboardData>("/api/v1/government/validation/dashboard");
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load validation dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const filteredPilots = (data?.pilots || []).filter((p: any) => {
    const matchesSearch =
      p.pilot_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.startup_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === "ALL") return true;
    if (filterStatus === "COMPLETED") return p.validation_status === "VALIDATION_COMPLETED";
    if (filterStatus === "IN_PROGRESS") return p.validation_status === "UNDER_VALIDATION" || p.validation_status === "VALIDATION_SUBMITTED";
    if (filterStatus === "PENDING") return p.validation_status === "NOT_STARTED" || p.validation_status === "VALIDATOR_ASSIGNED";
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gov" className="text-[10px] bg-blue-100 text-blue-900">
                  Step 7: Pilot Governance
                </Badge>
                <span className="text-xs text-slate-500 font-medium">Independent Quality Assurance</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Independent Outcome Validation Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Field trial outcomes, empirical third-party testing reports, and GFR 2017 success classification registry.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/government/validators">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-white shadow-xs">
                  <Users className="w-3.5 h-3.5 text-blue-900" />
                  Accredited Validator Directory
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Total Sandboxes</span>
                <FlaskConical className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {data?.total_pilots || 0}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">Active field trials</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Validated & Certified</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {data?.validations_completed || 0}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">Statutory sign-off achieved</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Under Empirical Audit</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-blue-900">
                {data?.under_validation || 0}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">Active validator scorecards</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Mean Target Achieved</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600">
                {data?.average_achievement_percentage != null
                  ? `${Math.round(data.average_achievement_percentage)}%`
                  : "0%"}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">Across all audited KPIs</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search pilot code, title, or startup..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Status:</span>
              <div className="flex items-center gap-1">
                {["ALL", "COMPLETED", "IN_PROGRESS", "PENDING"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      filterStatus === st
                        ? "bg-[#0B2545] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table of Pilots */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
              </div>
            ) : filteredPilots.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Pilots Found</h4>
                <p className="text-xs text-slate-500">No pilot records match the current filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-4">Pilot Sandbox</th>
                      <th className="p-4">Stakeholders</th>
                      <th className="p-4">Validation Stage</th>
                      <th className="p-4">Validator Audit</th>
                      <th className="p-4">Confirmed Outcome</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPilots.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-[10px] text-blue-900 font-bold block">
                            {p.pilot_code}
                          </span>
                          <span className="font-bold text-slate-900 text-xs line-clamp-1">
                            {p.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Budget: ₹{(p.pilot_budget || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-800 block">
                            {p.startup_name || "Startup Entity"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {p.department_name || "Nodal Department"}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="gov" className="text-[10px]">
                            {p.validation_status?.replace(/_/g, " ") || "NOT STARTED"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {p.validator_assessment ? (
                            <Badge
                              variant={
                                p.validator_assessment === "SUCCESSFUL"
                                  ? "success"
                                  : p.validator_assessment === "PARTIALLY_SUCCESSFUL"
                                  ? "warning"
                                  : "destructive"
                              }
                              className="text-[10px]"
                            >
                              {p.validator_assessment}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pending report</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              p.success_status === "SUCCESSFUL"
                                ? "success"
                                : p.success_status === "PARTIALLY_SUCCESSFUL"
                                ? "warning"
                                : p.success_status === "FAILED"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] font-semibold"
                          >
                            {p.success_status?.replace(/_/g, " ") || "NOT ASSESSED"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/government/pilots/${p.id}/kpis`}>
                              <Button variant="outline" size="sm" className="text-[11px] h-7 px-2 border-slate-200">
                                KPIs
                              </Button>
                            </Link>
                            <Link href={`/government/pilots/${p.id}/validation`}>
                              <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-[11px] h-7 px-2.5 gap-1">
                                Validate <ArrowUpRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
