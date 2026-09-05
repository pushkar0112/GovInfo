"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Info,
  Rocket,
  Layers,
  FileCheck,
  X,
} from "lucide-react";

interface ChallengeDetail {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  status: string;
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
  published_at?: string;
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

interface ExistingApplication {
  id: string;
  application_code: string;
  status: string;
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

export default function StartupChallengeDetailPage() {
  const params = useParams();
  const challengeId = params.id as string;
  const { currentUser } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [existingApp, setExistingApp] = useState<ExistingApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Eligibility Modal State
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<ChallengeDetail>(`/api/v1/challenges/${challengeId}`);
        if (data.status !== "PUBLISHED") {
          setError("This challenge is not currently active or accepting applications.");
          setChallenge(null);
          return;
        }
        setChallenge(data);

        // Check if startup already has an application for this challenge
        try {
          const apps = await apiRequest<ExistingApplication[]>(
            `/api/v1/applications?challenge_id=${challengeId}`
          );
          if (apps && apps.length > 0) {
            setExistingApp(apps[0]);
          }
        } catch {
          // Ignored if user has no applications
        }
      } catch (err: any) {
        setError(err.message || "Failed to load challenge specifications.");
      } finally {
        setLoading(false);
      }
    }

    if (challengeId) {
      fetchDetail();
    }
  }, [challengeId]);

  const runEligibilityCheck = async () => {
    setShowEligibilityModal(true);
    setEligibilityLoading(true);
    setEligibilityResult(null);
    setEligibilityError(null);

    try {
      const res = await apiRequest<EligibilityResult>(
        `/api/v1/startups/challenges/${challengeId}/eligibility-check`,
        { method: "POST" }
      );
      setEligibilityResult(res);
    } catch (err: any) {
      setEligibilityError(err.message || "Failed to run eligibility screening engine.");
    } finally {
      setEligibilityLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs text-slate-500 mt-2">Loading challenge specifications...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !challenge) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Challenge Unavailable</h2>
            <p className="text-xs text-slate-500">{error || "Challenge not found or not published."}</p>
            <Link href="/startup/challenges">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Open Challenges
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const isClosed =
    challenge.application_deadline &&
    new Date(challenge.application_deadline).getTime() < new Date().getTime();

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Navigation & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/startup/challenges"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Challenge Catalog
            </Link>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={runEligibilityCheck}
                className="gap-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Check My Eligibility
              </Button>

              {existingApp ? (
                existingApp.status === "DRAFT" ? (
                  <Link href={`/startup/challenges/${challengeId}/apply`}>
                    <Button variant="gov" size="sm" className="gap-2 text-xs font-bold shadow-xs">
                      <FileText className="w-3.5 h-3.5" /> Continue Draft ({existingApp.application_code})
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/startup/applications/${existingApp.id}`}>
                    <Button variant="gov" size="sm" className="gap-2 text-xs font-bold shadow-xs">
                      <FileCheck className="w-3.5 h-3.5" /> View Application ({existingApp.application_code})
                    </Button>
                  </Link>
                )
              ) : (
                <Link href={`/startup/challenges/${challengeId}/apply`}>
                  <Button
                    variant="gov"
                    size="sm"
                    disabled={Boolean(isClosed)}
                    className="gap-2 text-xs font-bold shadow-xs"
                  >
                    <Rocket className="w-3.5 h-3.5" /> Apply to Challenge
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {challenge.challenge_code}
                </span>
                <Badge variant="gov" className="text-xs">
                  {challenge.domain}
                </Badge>
                <Badge variant="success" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PUBLISHED
                </Badge>
              </div>

              {challenge.published_at && (
                <div className="text-xs text-slate-400">
                  Published on {new Date(challenge.published_at).toLocaleDateString()}
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {challenge.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">
                  {challenge.department_name || "Government Department"}
                </span>
                {challenge.ministry && <span className="text-slate-400">({challenge.ministry})</span>}
              </div>
              {challenge.geographical_scope && (
                <div className="flex items-center gap-1 text-slate-500">
                  <span>• Scope:</span>
                  <span className="font-medium text-slate-700">{challenge.geographical_scope}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Problem, Outcomes, Specs, KPIs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problem Statement Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Problem Statement
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {challenge.problem_statement}
                </p>

                {challenge.current_state && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      Current Operational Baseline / Ground Realities:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {challenge.current_state}
                    </p>
                  </div>
                )}
              </div>

              {/* Desired Outcome & KPIs */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#0B2545]" /> Desired Outcome & Measurable KPIs
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {challenge.desired_outcome}
                </p>

                {challenge.kpis && challenge.kpis.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      Quantitative Acceptance Thresholds:
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="p-2.5">KPI Indicator</th>
                            <th className="p-2.5">Target Value</th>
                            <th className="p-2.5">Baseline</th>
                            <th className="p-2.5">Verification Methodology</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {challenge.kpis.map((kpi) => (
                            <tr key={kpi.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-medium text-slate-900">{kpi.name}</td>
                              <td className="p-2.5 font-bold text-[#0B2545]">
                                {kpi.target_value} {kpi.measurement_unit}
                              </td>
                              <td className="p-2.5 text-slate-500">
                                {kpi.baseline_value !== undefined && kpi.baseline_value !== null
                                  ? `${kpi.baseline_value} ${kpi.measurement_unit}`
                                  : "—"}
                              </td>
                              <td className="p-2.5 text-slate-600">
                                {kpi.measurement_method || "Empirical Sensor / Field Audit"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Data, Security & IP Requirements */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Compliance, Security & IP Framework
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-800 block">Security & Data Localization</span>
                    <p className="text-slate-600 leading-relaxed">
                      {challenge.security_requirements ||
                        "Mandatory India data residency. All IoT sensor and API telemetry must be encrypted at rest (AES-256) and in transit (TLS 1.3)."}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-800 block">Intellectual Property Policy</span>
                    <p className="text-slate-600 leading-relaxed">
                      {challenge.intellectual_property_requirements ||
                        "Foreground and background IP remains 100% owned by the startup. Government receives non-exclusive pilot trial and municipal deployment licensing."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Key Commercials, Eligibility & Direct CTA */}
            <div className="space-y-6">
              {/* Grant & Pilot Sandbox Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pilot Commercials & Timeline
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Maximum Pilot Sandbox Grant:</span>
                    <span className="text-2xl font-extrabold text-[#0B2545]">
                      ₹{challenge.budget_max ? (challenge.budget_max / 100000).toFixed(1) : "—"} Lakhs
                    </span>
                    {challenge.budget_min && challenge.budget_max && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Permissible Range: ₹{(challenge.budget_min / 100000).toFixed(1)}L – ₹
                        {(challenge.budget_max / 100000).toFixed(1)}L
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Pilot Duration:</span>
                    <strong className="text-slate-800">{challenge.pilot_duration_days} Days</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Application Deadline:</span>
                    <strong className="text-slate-800">
                      {challenge.application_deadline
                        ? new Date(challenge.application_deadline).toLocaleDateString()
                        : "Open Intake"}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {existingApp ? (
                    existingApp.status === "DRAFT" ? (
                      <Link href={`/startup/challenges/${challengeId}/apply`} className="w-full">
                        <Button variant="gov" size="md" className="w-full text-xs font-bold shadow-xs">
                          Continue Draft Application →
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/startup/applications/${existingApp.id}`} className="w-full">
                        <Button variant="outline" size="md" className="w-full text-xs font-bold shadow-xs">
                          Track Status ({existingApp.application_code}) →
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Link href={`/startup/challenges/${challengeId}/apply`} className="w-full">
                      <Button
                        variant="gov"
                        size="md"
                        disabled={Boolean(isClosed)}
                        className="w-full text-xs font-bold shadow-xs"
                      >
                        <Rocket className="w-4 h-4 mr-1" /> Apply for Pilot Grant
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runEligibilityCheck}
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Run Pre-Screening Check
                  </Button>
                </div>
              </div>

              {/* Startup Eligibility Requirements Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Mandatory Eligibility
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {challenge.eligibility_requirements ||
                    "DPIIT-recognized Indian startups with working prototype at MVP or Production readiness level."}
                </p>
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href="/startup/profile"
                    className="text-[11px] font-semibold text-[#0B2545] hover:underline inline-flex items-center gap-1"
                  >
                    View or update your startup credentials →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility Modal */}
        {showEligibilityModal && (
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
                  onClick={() => setShowEligibilityModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {eligibilityLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Comparing startup profile against challenge criteria...
                  </p>
                </div>
              ) : eligibilityError ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{eligibilityError}</span>
                </div>
              ) : eligibilityResult ? (
                <div className="space-y-4 text-xs">
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

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEligibilityModal(false)}
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
                      <Link href={`/startup/challenges/${challengeId}/apply`}>
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
