"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Search,
  Building2,
  Calendar,
  Clock,
  Coins,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  BarChart3,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";

interface PublicChallenge {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  status: string;
  problem_statement: string;
  desired_outcome: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  pilot_duration_days: number;
  application_deadline?: string;
  eligibility_requirements?: string;
  applications_count?: number;
  kpis?: {
    id: string;
    name: string;
    target_value: number;
    measurement_unit: string;
  }[];
}

interface EligibilityResult {
  is_eligible: boolean;
  overall_status: string;
  summary: string;
  mandatory_criteria: {
    criterion: string;
    passed: boolean;
    required_value: string;
    actual_value: string;
    notes?: string;
  }[];
  preferred_criteria: {
    criterion: string;
    passed: boolean;
    notes?: string;
  }[];
  recommendations: string[];
}

export default function StartupChallengesPage() {
  const { currentUser } = useAuth();
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recent");

  // Eligibility Modal State
  const [selectedChallengeForEligibility, setSelectedChallengeForEligibility] = useState<PublicChallenge | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const fetchChallenges = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (domainFilter !== "ALL") params.append("domain", domainFilter);
      if (sortBy) params.append("sort_by", sortBy);
      params.append("page", page.toString());
      params.append("page_size", "12");

      const data = await apiRequest<{
        total: number;
        page: number;
        page_size: number;
        challenges: PublicChallenge[];
      }>(`/api/v1/startups/challenges?${params.toString()}`);

      setChallenges(data.challenges || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load open innovation challenges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [domainFilter, sortBy, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchChallenges();
  };

  const checkEligibility = async (challenge: PublicChallenge) => {
    setSelectedChallengeForEligibility(challenge);
    setEligibilityLoading(true);
    setEligibilityResult(null);
    setEligibilityError(null);

    try {
      const res = await apiRequest<EligibilityResult>(
        `/api/v1/startups/challenges/${challenge.id}/eligibility-check`,
        { method: "POST" }
      );
      setEligibilityResult(res);
    } catch (err: any) {
      setEligibilityError(err.message || "Failed to run eligibility screening engine.");
    } finally {
      setEligibilityLoading(false);
    }
  };

  const getDaysRemaining = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-3xl space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="gov" className="text-[10px]">
                    National Public Procurement Gateway
                  </Badge>
                  <Badge variant="success" className="text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GFR 2017 Rule 149 Aligned
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Discover Government Innovation Challenges
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Discover verified civic challenges published by Indian central ministries and state municipal bodies. Every challenge offers milestone-funded sandbox grants and a direct public procurement contract upon verified KPI attainment.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href="/startup/applications">
                  <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                    <FileText className="w-4 h-4" /> My Applications
                  </Button>
                </Link>
                <Link href="/startup/profile">
                  <Button variant="gov" size="sm" className="text-xs font-semibold gap-1.5 shadow-xs">
                    <ShieldCheck className="w-4 h-4" /> Verify Credentials
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search and Domain Filters */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by keyword, problem statement, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0B2545] text-white text-[11px] font-semibold rounded-md hover:bg-[#0B2545]/90 cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Domain & Sorting Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center gap-1.5">
                  {["ALL", "WaterTech", "HealthTech", "CivicTech", "CleanTech", "AgriTech"].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDomainFilter(d);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        domainFilter === d
                          ? "bg-[#0B2545] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
                >
                  <option value="recent">Sort: Most Recent</option>
                  <option value="deadline">Sort: Deadline (Earliest)</option>
                  <option value="budget">Sort: Budget (High to Low)</option>
                  <option value="title">Sort: Alphabetical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Challenge Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Scanning live innovation challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
              <Target className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Published Challenges Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No challenges matched your search filters. Try clearing domain filters or modifying your query.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDomainFilter("ALL");
                  setPage(1);
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {challenges.map((c) => {
                const daysRemaining = getDaysRemaining(c.application_deadline);
                const isClosingSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
                const isClosed = daysRemaining !== null && daysRemaining <= 0;

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-4">
                      {/* Top Badges & Department */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-[#0B2545] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {c.challenge_code}
                          </span>
                          <Badge variant="gov" className="text-[10px]">
                            {c.domain}
                          </Badge>
                        </div>

                        {isClosingSoon && (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="w-3 h-3" /> Closing in {daysRemaining}d
                          </Badge>
                        )}
                        {isClosed && (
                          <Badge variant="destructive" className="text-[10px]">
                            Closed
                          </Badge>
                        )}
                      </div>

                      {/* Department / Ministry */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{c.department_name || "Government Department"}</span>
                      </div>

                      {/* Title */}
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-[#0B2545] transition-colors line-clamp-2">
                        {c.title}
                      </h2>

                      {/* Problem Statement Snippet */}
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {c.problem_statement}
                      </p>

                      {/* Grant and Timeline Meta */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-500" /> Pilot Grant
                          </div>
                          <div className="font-bold text-slate-900">
                            {c.budget_max ? `₹${(c.budget_max / 100000).toFixed(1)} Lakh` : "Negotiated"}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" /> Pilot Sandbox
                          </div>
                          <div className="font-bold text-slate-900">
                            {c.pilot_duration_days ? `${c.pilot_duration_days} Days` : "90 Days"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-5 mt-4 border-t border-slate-100 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => checkEligibility(c)}
                          className="w-full text-xs font-semibold gap-1 hover:bg-blue-50 hover:border-blue-200"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Check Fit
                        </Button>

                        <Link href={`/startup/challenges/${c.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1">
                            Details <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>

                      <Link href={`/startup/challenges/${c.id}/apply`} className="w-full">
                        <Button
                          variant="gov"
                          size="sm"
                          disabled={isClosed}
                          className="w-full text-xs font-bold gap-1.5 shadow-xs"
                        >
                          <Rocket className="w-3.5 h-3.5" /> Apply for Pilot Grant
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 text-xs">
              <span className="text-slate-500 font-medium">
                Showing {challenges.length} of {total} total challenges
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="text-xs"
                >
                  Previous
                </Button>
                <span className="px-2 font-bold text-slate-700">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 12 >= total}
                  onClick={() => setPage(page + 1)}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Eligibility Check Interactive Modal */}
        {selectedChallengeForEligibility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Automated Eligibility Screening
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedChallengeForEligibility(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                <div className="font-mono text-[10px] text-blue-900 font-bold">
                  {selectedChallengeForEligibility.challenge_code}
                </div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedChallengeForEligibility.title}
                </div>
              </div>

              {eligibilityLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Running rule-based screening against statutory criteria...
                  </p>
                </div>
              ) : eligibilityError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{eligibilityError}</span>
                </div>
              ) : eligibilityResult ? (
                <div className="space-y-4 text-xs">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${
                      eligibilityResult.is_eligible
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    {eligibilityResult.is_eligible ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {eligibilityResult.is_eligible
                          ? "Verified Eligible for Submission"
                          : "Eligibility Requirements Unmet"}
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">{eligibilityResult.summary}</p>
                    </div>
                  </div>

                  {/* Mandatory Criteria Breakdown */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Mandatory Criteria Breakdown</h4>
                    <div className="space-y-2">
                      {eligibilityResult.mandatory_criteria.map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60"
                        >
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900">{c.criterion}</span>
                            <div className="text-[11px] text-slate-500">
                              Required: <span className="font-medium">{c.required_value}</span> | Your Profile:{" "}
                              <span className="font-medium">{c.actual_value}</span>
                            </div>
                            {c.notes && <div className="text-[10px] text-slate-400">{c.notes}</div>}
                          </div>
                          {c.passed ? (
                            <Badge variant="success" className="text-[10px] shrink-0">
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              Action Req.
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {eligibilityResult.recommendations.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                      <span className="font-bold block mb-1">Recommended Next Steps:</span>
                      <ul className="list-disc pl-4 space-y-1">
                        {eligibilityResult.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Modal Action CTA */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChallengeForEligibility(null)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    {!eligibilityResult.is_eligible ? (
                      <Link href="/startup/profile">
                        <Button variant="gov" size="sm" className="text-xs font-bold gap-1 shadow-xs">
                          Update Profile to Qualify →
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/startup/challenges/${selectedChallengeForEligibility.id}/apply`}>
                        <Button variant="gov" size="sm" className="text-xs font-bold gap-1 shadow-xs">
                          Proceed to Application Wizard →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
