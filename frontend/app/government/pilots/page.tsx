"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Building2,
  Rocket,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Coins,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  ShieldCheck,
  Loader2,
  Layers,
  FileCheck,
  Scale,
  Sparkles,
} from "lucide-react";

interface PilotStats {
  total_pilots: number;
  active_pilots: number;
  planning_pilots: number;
  completed_pilots: number;
  paused_pilots: number;
  cancelled_pilots: number;
  total_budget_committed: number;
  average_progress: number;
  overdue_milestones_count: number;
}

interface PilotItem {
  id: string;
  pilot_code?: string;
  application_id: string;
  challenge_id?: string;
  challenge_title?: string;
  startup_id?: string;
  startup_name?: string;
  department_name?: string;
  pilot_title?: string;
  title?: string;
  objective?: string;
  scope?: string;
  pilot_location?: string;
  sandbox_location?: string;
  operating_regions?: string;
  start_date?: string;
  planned_end_date?: string;
  duration_days?: number;
  pilot_budget?: number;
  approved_budget?: number;
  status: string;
  approval_status: string;
  success_status: string;
  pilot_progress: number;
  total_milestones_count: number;
  completed_milestones_count: number;
  overdue_milestones_count: number;
  created_at: string;
}

export default function GovernmentPilotsPage() {
  const { currentUser } = useAuth();
  const [pilots, setPilots] = useState<PilotItem[]>([]);
  const [stats, setStats] = useState<PilotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, pilotsData] = await Promise.all([
        apiRequest<PilotStats>("/api/v1/government/pilots/stats"),
        apiRequest<PilotItem[]>(
          `/api/v1/government/pilots${statusFilter !== "ALL" ? `?status=${statusFilter}` : ""}${
            searchTerm ? `${statusFilter !== "ALL" ? "&" : "?"}search=${encodeURIComponent(searchTerm)}` : ""
          }`
        ),
      ]);
      setStats(statsData);
      setPilots(pilotsData);
    } catch (err) {
      console.error("Error fetching government pilots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active Deployment</Badge>;
      case "PLANNING":
        return <Badge variant="gov">In Planning</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">Draft Sandbox</Badge>;
      case "PAUSED":
        return <Badge variant="warning">Temporarily Paused</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800">Completed Sandbox</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="gov">
                    <FlaskConical className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                    Operational Sandbox Sandbox Hub
                  </Badge>
                  <span className="text-xs text-slate-400">GFR 2017 Innovation Procurement</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Government Pilot Portfolio Management
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                  Supervise controlled field trials, validate milestone progress, review technical deliverables, and disburse tranche grants in alignment with public procurement norms.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href="/government/applications">
                  <Button
                    variant="gov"
                    size="sm"
                    className="gap-2 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Shortlisted Applications
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Metric Cards Strip */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Total Sandboxes
                </span>
                <div className="text-xl font-extrabold text-slate-900">
                  {stats.total_pilots}
                </div>
                <span className="text-[10px] text-slate-500">Under department remit</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                  Active Pilots
                </span>
                <div className="text-xl font-extrabold text-emerald-700">
                  {stats.active_pilots}
                </div>
                <span className="text-[10px] text-emerald-800">Live in the field</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900">
                  In Planning
                </span>
                <div className="text-xl font-extrabold text-blue-900">
                  {stats.planning_pilots}
                </div>
                <span className="text-[10px] text-slate-500">Roadmap calibration</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Completed
                </span>
                <div className="text-xl font-extrabold text-slate-800">
                  {stats.completed_pilots}
                </div>
                <span className="text-[10px] text-slate-500">Milestones verified</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  Committed Budget
                </span>
                <div className="text-xl font-extrabold text-slate-900 truncate">
                  ₹{(stats.total_budget_committed / 100000).toFixed(1)}L
                </div>
                <span className="text-[10px] text-slate-500">Milestone-bound grants</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700">
                  Overdue Milestones
                </span>
                <div className="text-xl font-extrabold text-rose-700">
                  {stats.overdue_milestones_count}
                </div>
                <span className="text-[10px] text-rose-800">Requires attention</span>
              </div>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "ACTIVE", "PLANNING", "PAUSED", "COMPLETED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#0B2545] text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {st === "ALL" ? "All Pilots" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search pilot code, title, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545] w-64"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" className="text-xs">
                  Search
                </Button>
              </form>
            </div>
          </div>

          {/* Pilots Portfolio List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading department operational sandbox pilots...</p>
            </div>
          ) : pilots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 shadow-2xs">
              <FlaskConical className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  No Sandbox Pilots Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {statusFilter !== "ALL" || searchTerm
                    ? "No pilots match the selected status filter or search keyword."
                    : "No operational sandbox pilots have been provisioned yet. Shortlist eligible startup proposals from the application inbox to commission a pilot."}
                </p>
              </div>
              <Link href="/government/applications">
                <Button variant="gov" size="sm" className="text-xs gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Explore Application Inbox to Shortlist
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pilots.map((pilot) => {
                const title = pilot.pilot_title || pilot.title || "Operational Sandbox Trial";
                const location = pilot.pilot_location || pilot.sandbox_location || "Field Sandbox Site";
                const budget = pilot.pilot_budget || pilot.approved_budget || 0;
                const progress = Math.round(pilot.pilot_progress || 0);

                return (
                  <div
                    key={pilot.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                          {pilot.pilot_code || "PILOT-SANDBOX"}
                        </span>
                        {getStatusBadge(pilot.status)}
                        {pilot.approval_status === "APPROVED" && (
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Plan Approved
                          </Badge>
                        )}
                        {pilot.approval_status === "PENDING" && (
                          <Badge variant="warning" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Approval Pending
                          </Badge>
                        )}
                        {pilot.overdue_milestones_count > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {pilot.overdue_milestones_count} Overdue Milestone(s)
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Created {new Date(pilot.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600">
                          Success: <span className="font-bold">{pilot.success_status}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-2">
                        <h2 className="text-base font-bold text-slate-900">
                          <Link
                            href={`/government/pilots/${pilot.id}`}
                            className="hover:text-blue-900 hover:underline"
                          >
                            {title}
                          </Link>
                        </h2>

                        {pilot.objective && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {pilot.objective}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          {pilot.startup_name && (
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Rocket className="w-3.5 h-3.5 text-amber-600" />
                              Startup: {pilot.startup_name}
                            </span>
                          )}
                          {pilot.challenge_title && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {pilot.challenge_title}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {location}
                          </span>
                        </div>
                      </div>

                      {/* Progress & Quick Stats Card */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-700">Milestone Progress</span>
                            <span className="font-extrabold text-blue-900 text-sm">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-900 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(3, progress)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span>
                              {pilot.completed_milestones_count} of {pilot.total_milestones_count} milestones accepted
                            </span>
                            <span>{pilot.duration_days || 90} Days Sandbox</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Sanctioned Grant</span>
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{(budget / 100000).toFixed(2)} Lakhs
                            </span>
                          </div>

                          <Link href={`/government/pilots/${pilot.id}`}>
                            <Button variant="gov" size="sm" className="text-xs gap-1 shadow-2xs cursor-pointer">
                              View Dossier <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
