"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Search,
  Filter,
  Building2,
  Calendar,
  Clock,
  Coins,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Eye,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface GovApplicationItem {
  id: string;
  application_code: string;
  challenge_id: string;
  challenge_title: string;
  startup_id: string;
  startup_name: string;
  dpiit_number?: string;
  dpiit_status?: string;
  status: string;
  proposal_title: string;
  executive_summary?: string;
  requested_budget?: number;
  timeline_days?: number;
  submitted_at?: string;
  created_at: string;
}

interface ChallengeOption {
  id: string;
  challenge_code: string;
  title: string;
}

export default function GovernmentApplicationsInboxPage() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<GovApplicationItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedChallenge, setSelectedChallenge] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Department Challenges for the dropdown
      const chData = await apiRequest<any[]>("/api/v1/challenges");
      setChallenges(chData || []);

      // 2. Fetch Government Applications Inbox
      const params = new URLSearchParams();
      if (selectedChallenge !== "ALL") params.append("challenge_id", selectedChallenge);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const apps = await apiRequest<any>(
        `/api/v1/government/applications?${params.toString()}`
      );
      const list = Array.isArray(apps) ? apps : (apps?.items || []);
      setApplications(list);
    } catch (err: any) {
      setError(err.message || "Failed to load department applications inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedChallenge, statusFilter]);

  const filtered = applications.filter((app) => {
    const matchesSearch =
      (app.application_code && app.application_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.startup_name && app.startup_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.proposal_title && app.proposal_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.challenge_title && app.challenge_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> New Submission
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Under Review
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Shortlisted for Pilot
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const submittedCount = applications.filter((a) => a.status === "SUBMITTED").length;
  const reviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="gov" className="text-[10px]">
                    Departmental Procurement & Pilot Desk
                  </Badge>
                  <Badge variant="success" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> DPIIT Pre-Screened
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Startup Proposals & Application Inbox
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Review and evaluate technical solutions submitted by qualified startups for your department&apos;s open innovation challenges. Shortlist top candidates for 90-day sandbox pilots.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href="/government/challenges/create">
                  <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs">
                    Publish New Challenge
                  </Button>
                </Link>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Total Submissions</span>
                <span className="text-xl font-extrabold text-[#0B2545] mt-0.5 block">{applications.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-[11px] text-blue-700 font-medium block">Awaiting First Review</span>
                <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">{submittedCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium block">In Detailed Review</span>
                <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">{reviewCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium block">Shortlisted for Grant</span>
                <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">{shortlistedCount}</span>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by code, startup, or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>

                <select
                  value={selectedChallenge}
                  onChange={(e) => setSelectedChallenge(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
                >
                  <option value="ALL">All Department Challenges</option>
                  {challenges.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.challenge_code}: {ch.title.length > 35 ? ch.title.slice(0, 35) + "..." : ch.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                {[
                  { id: "ALL", label: "All Submissions" },
                  { id: "SUBMITTED", label: `Submitted (${submittedCount})` },
                  { id: "UNDER_REVIEW", label: `Under Review (${reviewCount})` },
                  { id: "SHORTLISTED", label: `Shortlisted (${shortlistedCount})` },
                  { id: "REJECTED", label: "Rejected" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
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

          {/* Applications Inbox Table/List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading incoming proposals...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Proposals in this View</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {statusFilter !== "ALL"
                    ? `No applications currently have '${statusFilter}' status.`
                    : "No startup applications have been submitted to your department's challenges yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                        {app.application_code}
                      </span>
                      {getStatusBadge(app.status)}
                      {app.dpiit_status === "VERIFIED" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> DPIIT {app.dpiit_number || "Verified"}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900 hover:text-[#0B2545]">
                        {app.proposal_title || "Untitled Technical Proposal"}
                      </h2>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{app.startup_name}</span>
                        <span>•</span>
                        <span className="text-slate-600 truncate">{app.challenge_title}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      {app.requested_budget && (
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-bold text-slate-800">
                            ₹{(app.requested_budget / 100000).toFixed(2)} Lakhs requested
                          </span>
                        </div>
                      )}
                      {app.timeline_days && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>{app.timeline_days} Days proposed</span>
                        </div>
                      )}
                      {app.submitted_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Received {new Date(app.submitted_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link href={`/government/applications/${app.id}`}>
                      <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs px-4">
                        <Eye className="w-3.5 h-3.5" /> Review Dossier & Decide
                      </Button>
                    </Link>
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
