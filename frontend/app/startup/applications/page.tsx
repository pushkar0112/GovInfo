"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Building2,
  Calendar,
  Clock,
  Coins,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Rocket,
  ShieldCheck,
  Eye,
  Edit,
  Layers,
  Inbox,
  Sparkles,
} from "lucide-react";

interface ApplicationItem {
  id: string;
  application_code: string;
  challenge_id: string;
  challenge_title: string;
  department_name?: string;
  ministry?: string;
  proposal_title?: string;
  status: string;
  requested_budget?: number;
  timeline_days?: number;
  submitted_at?: string;
  created_at: string;
  updated_at?: string;
}

export default function StartupApplicationsPage() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>("/api/v1/applications");
      const list = Array.isArray(data) ? data : (data?.items || []);
      setApplications(list);
    } catch (err: any) {
      setError(err.message || "Failed to load submitted applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filtered = applications.filter((app) => {
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    const matchesSearch =
      (app.application_code && app.application_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.challenge_title && app.challenge_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.proposal_title && app.proposal_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.department_name && app.department_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" /> Draft Autosaved
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Submitted to Department
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Under Technical Review
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Shortlisted for Pilot Sandbox
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Not Shortlisted
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Status Metrics
  const submittedCount = applications.filter((a) => a.status === "SUBMITTED").length;
  const reviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;
  const draftCount = applications.filter((a) => a.status === "DRAFT").length;

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="gov" className="text-[10px]">
                    Startup Grant Intake & Tracking
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium">Real-Time Application Pipeline</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  My Challenge Applications & Proposals
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Monitor the official review lifecycle of your submitted solutions across central ministries and municipal corporations. View evaluation comments and sandbox sanction notifications.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href="/startup/challenges">
                  <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs">
                    <Rocket className="w-3.5 h-3.5" /> Browse Open Challenges
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Total Applications</span>
                <span className="text-xl font-extrabold text-[#0B2545] mt-0.5 block">{applications.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-[11px] text-blue-700 font-medium block">Submitted to Govt</span>
                <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">{submittedCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium block">Under Review</span>
                <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">{reviewCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium block">Shortlisted for Pilot</span>
                <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">{shortlistedCount}</span>
              </div>
            </div>

            {/* Search and Status Tabs */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by code, challenge, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                {[
                  { id: "ALL", label: "All" },
                  { id: "SUBMITTED", label: `Submitted (${submittedCount})` },
                  { id: "UNDER_REVIEW", label: `In Review (${reviewCount})` },
                  { id: "SHORTLISTED", label: `Shortlisted (${shortlistedCount})` },
                  { id: "DRAFT", label: `Drafts (${draftCount})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStatusFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === t.id
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Application List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading your applications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Applications Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {statusFilter !== "ALL"
                    ? `You do not have any applications matching the '${statusFilter}' filter.`
                    : "You haven't submitted any challenge proposals yet. Browse published government challenges to apply."}
                </p>
              </div>
              <Link href="/startup/challenges">
                <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs">
                  <Rocket className="w-3.5 h-3.5" /> Explore Challenges Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                        {app.application_code || "DRAFT"}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900 hover:text-[#0B2545] transition-colors">
                        {app.proposal_title || "Untitled Solution Proposal"}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Challenge:</span>
                        <span>{app.challenge_title}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      {app.department_name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{app.department_name}</span>
                        </div>
                      )}
                      {app.requested_budget && (
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold text-slate-800">
                            ₹{(app.requested_budget / 100000).toFixed(2)} Lakhs
                          </span>
                        </div>
                      )}
                      {app.submitted_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Submitted on {new Date(app.submitted_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {app.status === "DRAFT" ? (
                      <Link href={`/startup/challenges/${app.challenge_id}/apply`}>
                        <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs">
                          <Edit className="w-3.5 h-3.5" /> Continue Draft Wizard
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/startup/applications/${app.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 hover:bg-blue-50 hover:border-blue-200">
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Track & View Dossier
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
