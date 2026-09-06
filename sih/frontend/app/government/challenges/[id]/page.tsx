"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Coins,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Target,
  BarChart3,
  Award,
  ShieldCheck,
  ShieldAlert,
  Rocket,
  XCircle,
  ArrowLeft,
  Loader2,
  Ban,
  Trash2,
} from "lucide-react";

interface ChallengeDetail {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  created_by?: string;
  creator_name?: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED" | "ARCHIVED";
  problem_statement: string;
  current_state?: string;
  desired_outcome: string;
  challenge_description?: string;
  target_beneficiaries?: string;
  technology_preferences?: string;
  technology_restrictions?: string;
  geographical_scope?: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  pilot_duration_days: number;
  application_deadline?: string;
  pilot_start_date?: string;
  data_requirements?: string;
  security_requirements?: string;
  compliance_requirements?: string;
  intellectual_property_requirements?: string;
  eligibility_requirements?: string;
  created_at: string;
  published_at?: string;
  closed_at?: string;
  applications_count: number;
  kpis: {
    id: string;
    name: string;
    description?: string;
    measurement_unit: string;
    baseline_value?: number;
    target_value: number;
    measurement_method?: string;
    weight: number;
  }[];
}

export default function GovernmentChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const { currentUser } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ChallengeDetail>(`/api/v1/challenges/${challengeId}`);
      setChallenge(data);
    } catch (err: any) {
      setError(err.message || "Failed to load challenge details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (challengeId) {
      fetchDetail();
    }
  }, [challengeId]);

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await apiRequest(`/api/v1/challenges/${challengeId}/publish`, { method: "POST" });
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to publish challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("Are you sure you want to close this challenge for new applications?")) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/v1/challenges/${challengeId}/close`, { method: "POST" });
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to close challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel and withdraw this challenge?")) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/v1/challenges/${challengeId}/cancel`, { method: "POST" });
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to cancel challenge.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this draft? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/v1/challenges/${challengeId}`, { method: "DELETE" });
      router.push("/government/challenges");
    } catch (err: any) {
      alert(err.message || "Failed to delete draft challenge.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
          <span className="text-xs text-slate-500 mt-2">Loading challenge specifications...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !challenge) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Unable to load challenge</h2>
            <p className="text-xs text-slate-500">{error || "Challenge record not found."}</p>
            <Link href="/government/challenges">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Challenges List
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back Nav & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/government/challenges"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Challenges Portfolio
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/government/challenges/${challengeId}/evaluations`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5 text-blue-900" />
                  Evaluations & Rankings
                </Button>
              </Link>

              {challenge.status === "DRAFT" && (
                <>
                  <Button
                    variant="gov"
                    size="sm"
                    onClick={handlePublish}
                    disabled={actionLoading}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Rocket className="w-3.5 h-3.5 text-amber-400" />
                    Publish Challenge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Draft
                  </Button>
                </>
              )}

              {challenge.status === "PUBLISHED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={actionLoading}
                  className="gap-1.5 text-xs text-slate-700"
                >
                  <XCircle className="w-3.5 h-3.5 text-slate-500" /> Close Challenge
                </Button>
              )}

              {challenge.status !== "CANCELLED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Challenge
                </Button>
              )}
            </div>
          </div>

          {/* Top Dossier Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {challenge.challenge_code}
                </span>
                <Badge variant="gov" className="text-xs">
                  {challenge.domain}
                </Badge>
                {challenge.status === "PUBLISHED" ? (
                  <Badge variant="success" className="text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PUBLISHED
                  </Badge>
                ) : challenge.status === "DRAFT" ? (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                    DRAFT
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {challenge.status}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-slate-400">
                Created on {new Date(challenge.created_at).toLocaleDateString()}
                {challenge.published_at && ` • Published on ${new Date(challenge.published_at).toLocaleDateString()}`}
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {challenge.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <strong>{challenge.department_name || "Department"}</strong>
              </span>
              <span>•</span>
              <span>Ministry: {challenge.ministry || "Government of India"}</span>
              <span>•</span>
              <span>Scope: {challenge.geographical_scope || "National"}</span>
              {challenge.creator_name && (
                <>
                  <span>•</span>
                  <span>Sponsoring Officer: {challenge.creator_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Main Dossier Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Detailed Specifications */}
            <div className="md:col-span-2 space-y-6">
              {/* Problem Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-900" /> Problem Statement
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {challenge.problem_statement}
                </p>

                {challenge.current_state && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-600 block mb-1">
                      Current Baseline / As-Is Bottleneck:
                    </span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {challenge.current_state}
                    </p>
                  </div>
                )}
              </div>

              {/* Outcome Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" /> Target Desired Outcome
                </h3>
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs sm:text-sm text-blue-950 font-medium leading-relaxed">
                  {challenge.desired_outcome}
                </div>

                {challenge.target_beneficiaries && (
                  <div className="pt-2 text-xs text-slate-600">
                    <strong>Target Beneficiaries:</strong> {challenge.target_beneficiaries}
                  </div>
                )}
              </div>

              {/* KPIs Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-900" /> Measurable Outcome KPIs
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {challenge.kpis ? challenge.kpis.length : 0} Benchmarks
                  </Badge>
                </div>

                {challenge.kpis && challenge.kpis.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {challenge.kpis.map((kpi) => (
                      <div key={kpi.id} className="p-4 bg-slate-50/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{kpi.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            Weight: {kpi.weight}%
                          </Badge>
                        </div>
                        {kpi.description && (
                          <p className="text-[11px] text-slate-500">{kpi.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-700 pt-1">
                          <span>
                            Baseline:{" "}
                            <strong>
                              {kpi.baseline_value || "0"} {kpi.measurement_unit}
                            </strong>
                          </span>
                          <span>→</span>
                          <span>
                            Target:{" "}
                            <strong className="text-emerald-700 font-bold">
                              {kpi.target_value} {kpi.measurement_unit}
                            </strong>
                          </span>
                        </div>
                        {kpi.measurement_method && (
                          <div className="text-[10px] text-slate-400">
                            Protocol: {kpi.measurement_method}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No KPIs attached. Add at least one KPI before publishing.
                  </div>
                )}
              </div>

              {/* Data & Security Rules */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-900" /> Governance & Security Standards
                </h3>
                <div className="space-y-2 text-xs text-slate-700">
                  {challenge.data_requirements && (
                    <div>
                      <strong className="block text-slate-800">Data Access Requirements:</strong>
                      <p className="text-slate-600 mt-0.5">{challenge.data_requirements}</p>
                    </div>
                  )}
                  {challenge.security_requirements && (
                    <div>
                      <strong className="block text-slate-800">Cybersecurity Specifications:</strong>
                      <p className="text-slate-600 mt-0.5">{challenge.security_requirements}</p>
                    </div>
                  )}
                  {challenge.intellectual_property_requirements && (
                    <div>
                      <strong className="block text-slate-800">IP Terms:</strong>
                      <p className="text-slate-600 mt-0.5">{challenge.intellectual_property_requirements}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Parameters & Timelines */}
            <div className="space-y-6">
              {/* Budget & Timeline Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pilot Grant & Schedule
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Grant Range</span>
                    <span className="text-lg font-extrabold text-slate-900">
                      ₹{challenge.budget_max ? (challenge.budget_max / 100000).toFixed(1) : "—"} Lakhs
                    </span>
                    {challenge.budget_min && challenge.budget_max && (
                      <span className="text-[11px] text-slate-400 block">
                        ₹{(challenge.budget_min / 100000).toFixed(1)}L – ₹{(challenge.budget_max / 100000).toFixed(1)}L
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <strong className="text-slate-800">{challenge.pilot_duration_days} Days</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Submission Deadline:</span>
                    <strong className="text-slate-800">
                      {challenge.application_deadline
                        ? new Date(challenge.application_deadline).toLocaleDateString()
                        : "Open"}
                    </strong>
                  </div>

                  {challenge.pilot_start_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Pilot Start Date:</span>
                      <strong className="text-slate-800">
                        {new Date(challenge.pilot_start_date).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Eligibility Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Startup Eligibility
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {challenge.eligibility_requirements || "DPIIT-recognized startups with demonstrable technology prototype."}
                </p>
              </div>

              {/* Step 5: Expert Evaluation Hub Card */}
              <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-2xl border border-blue-200/80 p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Expert Evaluation Hub
                  </h3>
                  <Badge variant="gov" className="text-[10px]">Step 5</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Manage weighted scoring criteria (100% total weight validation), assign empanelled experts, track Conflict of Interest declarations, and view ranked leaderboards.
                </p>
                <Link href={`/government/challenges/${challengeId}/evaluations`} className="block">
                  <Button variant="gov" size="sm" className="w-full text-xs font-semibold gap-1.5 shadow-xs">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    Open Evaluation & Rankings Hub
                  </Button>
                </Link>
              </div>

              {/* Administrative Info Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2 text-xs text-slate-500">
                <span className="font-bold text-slate-700 block">Administrative Audit Info</span>
                <div>UUID: <span className="font-mono text-[10px] text-slate-600">{challenge.id}</span></div>
                <div>Code: <strong className="text-slate-800">{challenge.challenge_code}</strong></div>
                <div>Applications Received: <strong className="text-slate-800">{challenge.applications_count}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
