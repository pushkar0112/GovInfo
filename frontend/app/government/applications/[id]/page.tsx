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
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  Download,
  Check,
  X,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Award,
  BarChart3,
  Star,
  UserCheck,
  FlaskConical,
} from "lucide-react";
import { PilotCreationWizardModal } from "@/components/pilots/PilotCreationWizardModal";

interface GovApplicationDetail {
  id: string;
  application_code: string;
  challenge_id: string;
  challenge_title: string;
  department_name?: string;
  ministry?: string;
  startup_id: string;
  startup_name: string;
  dpiit_number?: string;
  dpiit_status?: string;
  status: string;
  proposal_title: string;
  executive_summary: string;
  problem_understanding?: string;
  proposed_solution?: string;
  technical_approach?: string;
  expected_outcomes?: string;
  implementation_plan?: string;
  pilot_plan?: string;
  timeline_days?: number;
  team_capabilities?: string;
  previous_deployments?: string;
  requested_budget?: number;
  estimated_cost?: number;
  data_requirements?: string;
  security_approach?: string;
  ip_approach?: string;
  supporting_documents?: {
    document_id: string;
    original_filename: string;
    document_type: string;
    file_size_bytes: number;
    upload_timestamp: string;
  }[];
  eligibility_snapshot?: any;
  review_notes?: string;
  submitted_at?: string;
  created_at: string;
  updated_at?: string;
}

interface EvaluationSummary {
  application_id: string;
  average_score?: number | null;
  highest_score?: number | null;
  lowest_score?: number | null;
  completed_evaluations_count: number;
  assigned_evaluations_count: number;
  recommendations_summary: Record<string, number>;
  evaluations: {
    id: string;
    expert_id: string;
    expert_name: string;
    expert_organization?: string | null;
    overall_score?: number | null;
    recommendation?: string | null;
    overall_comments?: string | null;
    is_submitted: boolean;
    submitted_at?: string | null;
    scores: {
      id: string;
      criterion_id: string;
      criterion_name: string;
      criterion_description?: string;
      weight: number;
      max_score: number;
      score: number;
      normalized_score: number;
      weighted_score: number;
      comment?: string | null;
      evidence_reference?: string | null;
    }[];
  }[];
}

interface AIFactorScore {
  factor_key: string;
  label: string;
  score: number | null;
  max_score: number;
  weight_percentage: number;
  description?: string | null;
}

interface AIAssessmentData {
  id: string;
  application_id: string;
  challenge_id: string;
  status: "PENDING" | "ANALYZING" | "COMPLETED" | "INSUFFICIENT_DATA" | "ERROR";
  overall_score: number | null;
  score_label: string;
  recommendation: "STRONG_MATCH" | "MODERATE_MATCH" | "LOW_MATCH" | "INSUFFICIENT_DATA" | null;
  recommendation_label: string | null;
  factors: AIFactorScore[];
  positive_reasons: string[];
  risk_flags: string[];
  summary?: string | null;
  model_version: string;
  execution_mode: string;
  mode_label: string;
  analyzed_at?: string | null;
}

export default function GovernmentApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  const { currentUser } = useAuth();

  const [application, setApplication] = useState<GovApplicationDetail | null>(null);
  const [evaluationsSummary, setEvaluationsSummary] = useState<EvaluationSummary | null>(null);
  const [aiAssessment, setAiAssessment] = useState<AIAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [reanalyzingAi, setReanalyzingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status Decision Modal State
  const [decisionModalTarget, setDecisionModalTarget] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [pilotWizardOpen, setPilotWizardOpen] = useState(false);

  const fetchAiAssessment = async () => {
    setLoadingAi(true);
    try {
      const aiData = await apiRequest<AIAssessmentData>(
        `/api/v1/government/applications/${applicationId}/ai-assessment`
      );
      setAiAssessment(aiData);
    } catch {
      // Non-blocking if AI assessment not yet generated
    } finally {
      setLoadingAi(false);
    }
  };

  const handleReanalyzeAi = async () => {
    setReanalyzingAi(true);
    try {
      const aiData = await apiRequest<AIAssessmentData>(
        `/api/v1/government/applications/${applicationId}/ai-assessment`,
        { method: "POST" }
      );
      setAiAssessment(aiData);
    } catch (err: any) {
      console.error("Failed to re-calculate AI score:", err);
    } finally {
      setReanalyzingAi(false);
    }
  };

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<GovApplicationDetail>(`/api/v1/government/applications/${applicationId}`);
      setApplication(data);
      if (data.review_notes) {
        setReviewNotes(data.review_notes);
      }

      // Fetch transparent multi-expert evaluations
      try {
        const evData = await apiRequest<EvaluationSummary>(`/api/v1/government/applications/${applicationId}/evaluations`);
        setEvaluationsSummary(evData);
      } catch {
        // Non-blocking if not yet evaluated or assigned
      }

      // Fetch explainable AI assessment
      await fetchAiAssessment();
    } catch (err: any) {
      setError(err.message || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  const handleStatusTransition = async (targetStatus: string) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await apiRequest<GovApplicationDetail>(
        `/api/v1/government/applications/${applicationId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: targetStatus,
            review_notes: reviewNotes.trim() || undefined,
          }),
        }
      );
      setApplication(updated);
      setDecisionModalTarget(null);
      setStatusSuccess(`Application successfully transitioned to '${targetStatus}'.`);
      setTimeout(() => setStatusSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to transition application status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs text-slate-500 mt-2">Loading proposal dossier for review...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !application) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Application Unavailable</h2>
            <p className="text-xs text-slate-500">{error || "Record not found or access denied."}</p>
            <Link href="/government/applications">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Inbox
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!application) return null;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Breadcrumb & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/government/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Application Inbox
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Current Status:</span>
              <Badge variant="gov" className="text-xs font-bold">
                {application.status}
              </Badge>
            </div>
          </div>

          {/* Alert Messages */}
          {statusSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusSuccess}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {application.application_code}
                </span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                  Applicant: {application.startup_name}
                </span>
                {application.dpiit_status === "VERIFIED" && (
                  <Badge variant="success" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> DPIIT {application.dpiit_number || "Verified"}
                  </Badge>
                )}
              </div>

              {application.submitted_at && (
                <div className="text-xs text-slate-400">
                  Submitted {new Date(application.submitted_at).toLocaleString()}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              {application.proposal_title || "Untitled Proposal"}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Challenge:</span>
                <Link
                  href={`/government/challenges/${application.challenge_id}`}
                  className="font-bold text-[#0B2545] hover:underline"
                >
                  {application.challenge_title}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-800">
                  Requested Grant: ₹{application.requested_budget ? (application.requested_budget / 100000).toFixed(2) : "—"} Lakhs
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Pilot Timeline: {application.timeline_days || 90} Days</span>
              </div>
              {evaluationsSummary?.average_score !== null && evaluationsSummary?.average_score !== undefined && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-amber-900">
                    Composite Score: {evaluationsSummary.average_score.toFixed(1)} / 100
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    ({evaluationsSummary.completed_evaluations_count} evaluations)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Two-Column Review Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: 9-Section Technical Proposal Dossier */}
            <div className="lg:col-span-2 space-y-6">
              {/* Executive Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Executive Summary & Solution Brief
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {application.executive_summary}
                </p>
              </div>

              {/* Problem Understanding */}
              {application.problem_understanding && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Problem Understanding & Civic Alignment
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.problem_understanding}
                  </p>
                </div>
              )}

              {/* Technical Architecture & Deep-Tech */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Proposed Architecture & Technical Approach
                </h2>

                <div className="space-y-3 text-xs">
                  {application.proposed_solution && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Architecture Specification:</span>
                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                        {application.proposed_solution}
                      </p>
                    </div>
                  )}

                  {application.technical_approach && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Deep-Tech & Algorithmic Innovation:</span>
                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                        {application.technical_approach}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Outcomes & 90-Day Sandbox Plan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Target Outcomes & 90-Day Sandbox Plan
                </h2>

                <div className="space-y-3 text-xs">
                  {application.expected_outcomes && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Expected Measurable Outcomes:</span>
                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                        {application.expected_outcomes}
                      </p>
                    </div>
                  )}

                  {application.pilot_plan && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Field Sandbox Plan:</span>
                      <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                        {application.pilot_plan}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Team & Past Deployments */}
              {(application.team_capabilities || application.previous_deployments) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Team Track Record & Field Experience
                  </h2>

                  <div className="space-y-3 text-xs">
                    {application.team_capabilities && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Engineering & Operations Team:</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                          {application.team_capabilities}
                        </p>
                      </div>
                    )}

                    {application.previous_deployments && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Prior Municipal / Enterprise Deployments:</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                          {application.previous_deployments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Governance, Security & IP Protocol */}
              {(application.data_requirements || application.security_approach || application.ip_approach) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Governance, Security & IP Alignment
                  </h2>

                  <div className="space-y-3 text-xs">
                    {application.data_requirements && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Data Governance & Bilateral Protocols:</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                          {application.data_requirements}
                        </p>
                      </div>
                    )}

                    {application.security_approach && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Cybersecurity & Cloud Empanelment Standards:</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                          {application.security_approach}
                        </p>
                      </div>
                    )}

                    {application.ip_approach && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Intellectual Property (IP) Alignment:</span>
                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                          {application.ip_approach}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supporting Documents */}
              {application.supporting_documents && application.supporting_documents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Uploaded Whitepapers & Documents ({application.supporting_documents.length})
                  </h2>

                  <div className="space-y-2">
                    {application.supporting_documents.map((doc) => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                      const downloadUrl = `${apiUrl}/api/v1/applications/documents/${doc.document_id}/download`;

                      return (
                        <div
                          key={doc.document_id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                            <div>
                              <div className="font-semibold text-slate-900">{doc.original_filename}</div>
                              <span className="text-[10px] text-slate-500">
                                {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>

                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STAGE 1: Pre-Screening Snapshot */}
              {application.eligibility_snapshot && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-900" />
                      <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                        Pre-Screening Snapshot
                      </h2>
                    </div>
                    <Badge
                      variant={application.eligibility_snapshot.is_eligible ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {application.eligibility_snapshot.overall_status || "SCREENED"}
                    </Badge>
                  </div>

                  <p className="text-slate-800 text-xs leading-relaxed">
                    {application.eligibility_snapshot.summary}
                  </p>

                  {application.eligibility_snapshot.mandatory_criteria && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {application.eligibility_snapshot.mandatory_criteria.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                          <span className="text-slate-800 text-xs">{c.criterion}</span>
                          <span className={c.passed ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                            {c.passed ? "✓ Passed" : "✗ Action Req"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 2: AI-Assisted Shortlisting */}
              <div className="bg-white rounded-2xl border border-blue-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-900 shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          AI-Assisted Shortlisting
                        </h2>
                        <Badge variant="outline" className="text-[10px] font-semibold text-blue-700 border-blue-200 bg-blue-50/70">
                          {aiAssessment?.mode_label || "AI-Assisted Assessment — Demo/Rule-Based Mode"}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Multi-factor quantitative match and risk evaluation for intake prioritization
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reanalyzingAi}
                    onClick={handleReanalyzeAi}
                    className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    {reanalyzingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    {reanalyzingAi ? "Analyzing..." : "Re-Calculate AI Score"}
                  </Button>
                </div>

                {/* Assistive Disclaimer */}
                <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Assistive Recommendation Only:</strong> AI shortlisting is an assistive recommendation layer designed to prioritize and triage high-volume submissions. It does not replace human expert evaluation, cannot automatically select a startup for procurement, and does not make final government decisions.
                  </p>
                </div>

                {/* AI Assessment Content */}
                {loadingAi ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                    <span>Analyzing application data against challenge criteria...</span>
                  </div>
                ) : aiAssessment?.status === "INSUFFICIENT_DATA" ? (
                  <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-xl text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-amber-950">
                        AI assessment unavailable — additional application information is required.
                      </h3>
                      <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                        {aiAssessment?.summary ||
                          "Core proposal content (executive summary, architecture, or TRL details) does not meet the minimum completeness threshold needed for reliable scoring."}
                      </p>
                    </div>
                    {aiAssessment.risk_flags && aiAssessment.risk_flags.length > 0 && (
                      <div className="text-left max-w-md mx-auto pt-2">
                        <span className="text-[11px] font-bold text-amber-900 block mb-1">
                          Missing Information:
                        </span>
                        <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                          {aiAssessment.risk_flags.map((flag, idx) => (
                            <li key={idx}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : aiAssessment && aiAssessment.overall_score !== null ? (
                  <div className="space-y-6">
                    {/* Score Card Hero */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-br from-blue-950 via-[#0B2545] to-slate-900 rounded-2xl text-white shadow-sm">
                      <div className="space-y-1">
                        <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                          {aiAssessment.score_label || "AI-Assisted Match Score"}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white tracking-tight">
                            {aiAssessment.overall_score.toFixed(1)}
                          </span>
                          <span className="text-blue-300 text-sm font-semibold">/ 100</span>
                        </div>
                        <p className="text-xs text-blue-100/80 leading-relaxed max-w-md pt-1">
                          {aiAssessment.summary ||
                            "Weighted multi-factor score evaluating problem fit, TRL, KPI alignment, and feasibility."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <Badge
                          className={`text-xs px-3 py-1 font-bold ${
                            aiAssessment.recommendation === "STRONG_MATCH"
                              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                              : aiAssessment.recommendation === "MODERATE_MATCH"
                              ? "bg-blue-400 text-slate-950 hover:bg-blue-300"
                              : "bg-amber-400 text-slate-950 hover:bg-amber-300"
                          }`}
                        >
                          {aiAssessment.recommendation_label ||
                            aiAssessment.recommendation?.replace(/_/g, " ") ||
                            "Recommended"}
                        </Badge>
                        <span className="text-[10px] text-blue-300">
                          Intake Triaging Recommendation
                        </span>
                        {aiAssessment.analyzed_at && (
                          <span className="text-[10px] text-blue-300/80">
                            Analyzed: {new Date(aiAssessment.analyzed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 6-Factor Breakdown */}
                    {aiAssessment.factors && aiAssessment.factors.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            6-Factor Weighted Evaluation Rubric
                          </h3>
                          <span className="text-[11px] text-slate-400">Total 100% Weight</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiAssessment.factors.map((f) => {
                            const pct = f.score !== null ? (f.score / f.max_score) * 100 : 0;
                            return (
                              <div
                                key={f.factor_key}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800">{f.label}</span>
                                  <span className="font-extrabold text-blue-950">
                                    {f.score !== null ? f.score.toFixed(1) : "—"} / {f.max_score.toFixed(0)}{" "}
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      ({f.weight_percentage}% wt)
                                    </span>
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 75
                                        ? "bg-emerald-600"
                                        : pct >= 50
                                        ? "bg-blue-600"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                {f.description && (
                                  <p className="text-[11px] text-slate-500 leading-snug">{f.description}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explainability: Why Scored Highly & Potential Concerns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Positive Reasons */}
                      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                            Why this application scored highly
                          </h4>
                        </div>
                        {aiAssessment.positive_reasons && aiAssessment.positive_reasons.length > 0 ? (
                          <ul className="space-y-1.5 pl-1 text-xs text-emerald-900">
                            {aiAssessment.positive_reasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No specific standout strengths highlighted.</p>
                        )}
                      </div>

                      {/* Potential Concerns */}
                      <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                            Potential Concerns & Risk Flags
                          </h4>
                        </div>
                        {aiAssessment.risk_flags && aiAssessment.risk_flags.length > 0 ? (
                          <ul className="space-y-1.5 pl-1 text-xs text-amber-900">
                            {aiAssessment.risk_flags.map((concern, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{concern}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No critical concerns flagged in proposal text.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2 text-xs text-slate-500">
                    <Sparkles className="w-7 h-7 text-blue-600 mx-auto" />
                    <p className="font-semibold text-slate-700">No AI-Assisted score generated yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Click the button above to run explainable multi-factor AI shortlisting.
                    </p>
                    <Button
                      variant="gov"
                      size="sm"
                      onClick={handleReanalyzeAi}
                      disabled={reanalyzingAi}
                      className="mt-2 text-xs gap-1.5"
                    >
                      {reanalyzingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate AI-Assisted Match Score
                    </Button>
                  </div>
                )}
              </div>

              {/* STAGE 3: Expert Evaluation & Transparent Scoring Dossier */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0B2545]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Expert Evaluation & Transparent Scoring Dossier
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/government/challenges/${application.challenge_id}/evaluations`}>
                      <Button variant="outline" size="sm" className="text-[11px] h-7 gap-1 border-slate-200 text-blue-900">
                        <BarChart3 className="w-3 h-3" />
                        Evaluation Hub & Assign Experts
                      </Button>
                    </Link>
                  </div>
                </div>

                {evaluationsSummary && evaluationsSummary.completed_evaluations_count > 0 ? (
                  <div className="space-y-4">
                    {/* Summary Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Average Composite Score</span>
                        <span className="text-base font-extrabold text-[#0B2545]">
                          {evaluationsSummary.average_score !== null ? evaluationsSummary.average_score?.toFixed(1) : "—"}
                          <span className="text-xs font-normal text-slate-400"> / 100</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Highest Score</span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {evaluationsSummary.highest_score !== null ? evaluationsSummary.highest_score?.toFixed(1) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Completed Reviews</span>
                        <span className="text-base font-extrabold text-slate-800">
                          {evaluationsSummary.completed_evaluations_count} / {evaluationsSummary.assigned_evaluations_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Recommendations</span>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {Object.entries(evaluationsSummary.recommendations_summary).map(([rec, count]) => (
                            <Badge key={rec} variant={rec.includes("RECOMMEND") ? "success" : "secondary"} className="text-[9px] py-0 px-1.5">
                              {count}x {rec.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Per-Expert Scoring Cards */}
                    <div className="space-y-3">
                      {evaluationsSummary.evaluations.map((ev, idx) => (
                        <div key={ev.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-blue-900" />
                              <span className="font-bold text-xs text-slate-900">{ev.expert_name}</span>
                              {ev.expert_organization && (
                                <span className="text-[11px] text-slate-500">({ev.expert_organization})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {ev.recommendation && (
                                <Badge
                                  variant={
                                    ev.recommendation.includes("STRONGLY")
                                      ? "success"
                                      : ev.recommendation.includes("RECOMMEND")
                                      ? "gov"
                                      : "destructive"
                                  }
                                  className="text-[10px]"
                                >
                                  {ev.recommendation.replace(/_/g, " ")}
                                </Badge>
                              )}
                              <span className="font-mono font-extrabold text-xs text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-100">
                                {ev.overall_score !== null ? ev.overall_score?.toFixed(1) : "—"} / 100
                              </span>
                            </div>
                          </div>

                          {/* Criterion breakdown */}
                          {ev.scores && ev.scores.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Weighted Criteria Contribution
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ev.scores.map((sc) => (
                                  <div key={sc.criterion_id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[150px]">
                                        {sc.criterion_name}
                                      </span>
                                      <span className="font-bold text-blue-950 text-[11px]">
                                        {sc.score}/{sc.max_score} <span className="text-[10px] text-slate-400">({sc.weight}% wt)</span>
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-blue-900 h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (sc.score / sc.max_score) * 100)}%` }}
                                      />
                                    </div>
                                    {sc.comment && (
                                      <p className="text-[10px] text-slate-500 italic truncate pt-0.5">
                                        &ldquo;{sc.comment}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Qualitative feedback */}
                          {ev.overall_comments && (
                            <div className="pt-2 border-t border-slate-100 text-xs">
                              <span className="font-semibold text-slate-700 block mb-0.5 text-[11px]">Expert Qualitative Feedback:</span>
                              <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed text-[11px]">
                                {ev.overall_comments}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2 text-xs text-slate-500">
                    <Award className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-medium text-slate-700">
                      {evaluationsSummary && evaluationsSummary.assigned_evaluations_count > 0
                        ? `${evaluationsSummary.assigned_evaluations_count} expert evaluator(s) assigned. Awaiting submission.`
                        : "No expert evaluations recorded yet for this proposal."}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Assign domain experts from the Challenge Evaluation Hub to conduct transparent multi-criteria assessment.
                    </p>
                    <Link href={`/government/challenges/${application.challenge_id}/evaluations`}>
                      <Button variant="gov" size="sm" className="mt-2 text-xs gap-1.5 shadow-xs">
                        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                        Go to Challenge Evaluation Hub
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Decision Panel & Pre-Screening Snapshot */}
            <div className="space-y-6">
              {/* Reviewer Action Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Official Review & Status Decision
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  As the sponsoring nodal officer, you can transition this application to review, shortlist for pilot sandbox sanction, or reject.
                </p>

                <div className="space-y-2 pt-2">
                  {application.status === "SUBMITTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionModalTarget("UNDER_REVIEW")}
                      className="w-full text-xs font-semibold justify-start gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
                    >
                      <Clock className="w-4 h-4 text-amber-600" /> Mark as &ldquo;Under Review&rdquo;
                    </Button>
                  )}

                  {application.status !== "SHORTLISTED" && application.status !== "SELECTED_FOR_PILOT" && (
                    <Button
                      variant="gov"
                      size="sm"
                      onClick={() => setDecisionModalTarget("SHORTLISTED")}
                      className="w-full text-xs font-bold justify-start gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Shortlist for Pilot Sandbox Grant
                    </Button>
                  )}

                  {application.status === "SHORTLISTED" && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Proposal Shortlisted for Pilot Grant
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Commission an operational sandbox trial with defined milestones, weighting, and deliverables.
                      </p>
                      <Button
                        variant="gov"
                        size="sm"
                        onClick={() => setPilotWizardOpen(true)}
                        className="w-full text-xs font-bold justify-center gap-2 bg-[#0B2545] hover:bg-[#133A6B] text-white shadow-xs"
                      >
                        <FlaskConical className="w-4 h-4 text-amber-400" />
                        Create Operational Pilot Sandbox
                      </Button>
                    </div>
                  )}

                  {application.status === "SELECTED_FOR_PILOT" && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <FlaskConical className="w-4 h-4 text-blue-600" />
                        Operational Sandbox Commissioned
                      </div>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        An operational sandbox pilot is active for this startup proposal.
                      </p>
                      <Link href="/government/pilots">
                        <Button
                          variant="gov"
                          size="sm"
                          className="w-full text-xs font-bold justify-center gap-2 mt-1"
                        >
                          <FlaskConical className="w-4 h-4 text-amber-400" /> View in Pilot Portfolio
                        </Button>
                      </Link>
                    </div>
                  )}

                  {application.status !== "REJECTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionModalTarget("REJECTED")}
                      className="w-full text-xs font-semibold justify-start gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <X className="w-4 h-4 text-rose-600" /> Reject Application
                    </Button>
                  )}
                </div>

                {/* Review Notes Area */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Official Review Remarks / Notes:
                  </label>
                  <textarea
                    rows={4}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter technical comments, pilot feasibility remarks, or justification for shortlist/rejection..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingStatus}
                    onClick={() => handleStatusTransition(application.status)}
                    className="w-full text-xs font-semibold"
                  >
                    Save Review Notes
                  </Button>
                </div>
              </div>

              {/* Workflow Stepper Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Intake & Evaluation Journey
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">1. Pre-Screening</span>
                    </div>
                    <Badge variant="success" className="text-[9px]">
                      {application.eligibility_snapshot?.overall_status || "Screened"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="font-semibold text-slate-800">2. AI-Assisted Match</span>
                    </div>
                    <span className="font-extrabold text-blue-900 text-xs">
                      {aiAssessment?.overall_score !== null && aiAssessment?.overall_score !== undefined
                        ? `${aiAssessment.overall_score.toFixed(1)}/100`
                        : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-[#0B2545] shrink-0" />
                      <span className="font-semibold text-slate-800">3. Expert Evaluation</span>
                    </div>
                    <span className="font-bold text-slate-700 text-xs">
                      {evaluationsSummary?.average_score !== null && evaluationsSummary?.average_score !== undefined
                        ? `${evaluationsSummary.average_score.toFixed(1)}/100`
                        : `${evaluationsSummary?.completed_evaluations_count || 0} reviews`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                      <span className="font-semibold text-slate-800">4. Official Decision</span>
                    </div>
                    <Badge variant="gov" className="text-[9px]">
                      {application.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {decisionModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Decision: {decisionModalTarget}
                  </h3>
                </div>
                <button
                  onClick={() => setDecisionModalTarget(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to change the status of proposal <strong>{application.application_code}</strong> ({application.startup_name}) to <strong>{decisionModalTarget}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Decision Remarks:
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide decision rationale..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDecisionModalTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition(decisionModalTarget)}
                  className="text-xs font-bold gap-1.5"
                >
                  {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Update
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pilot Sandbox Creation Wizard Modal */}
        {application && (
          <PilotCreationWizardModal
            isOpen={pilotWizardOpen}
            onClose={() => setPilotWizardOpen(false)}
            application={application}
            onPilotCreated={() => {
              fetchApplication();
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
