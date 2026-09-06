"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Check,
  AlertTriangle,
  FileText,
  HelpCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Save,
  Send,
  Info,
  Layers,
  ChevronRight,
  Target,
  Sparkles,
  Lock,
} from "lucide-react";

interface CriterionData {
  id: string;
  name: string;
  title?: string;
  description?: string;
  weight: number;
  max_score: number;
  min_score: number;
  mandatory: boolean;
  is_mandatory?: boolean;
  display_order: number;
}

interface ScoreInputState {
  score: number;
  comment: string;
  evidence_reference: string;
}

interface AssignmentDetailData {
  assignment: {
    id: string;
    assignment_status: string;
    assigned_at: string;
    accepted_at?: string;
    completed_at?: string;
    due_at?: string;
    notes?: string;
    conflict_declaration?: "NO_CONFLICT" | "CONFLICT_DECLARED" | null;
    conflict_reason?: string | null;
  };
  challenge: {
    id: string;
    title: string;
    challenge_code: string;
    problem_statement: string;
    desired_outcome: string;
    domain: string;
    criteria: CriterionData[];
  };
  startup: {
    id?: string;
    startup_name: string;
    dpiit_number?: string;
    product_stage?: string;
    headquarters?: string;
  };
  application: {
    id: string;
    application_code: string;
    proposal_title: string;
    executive_summary?: string;
    problem_understanding?: string;
    proposed_solution?: string;
    technical_approach?: string;
    expected_outcomes?: string;
    implementation_plan?: string;
    pilot_plan?: string;
    timeline_days?: number;
    requested_budget?: number;
    risks?: string;
    dependencies?: string;
    data_requirements?: string;
    security_approach?: string;
    ip_approach?: string;
    submitted_at?: string;
  };
  evaluation?: {
    id: string;
    overall_score?: number | null;
    recommendation?: string | null;
    overall_comments?: string | null;
    is_submitted: boolean;
    submitted_at?: string;
    scores: {
      criterion_id: string;
      criterion_name: string;
      score: number;
      normalized_score: number;
      weighted_score: number;
      comment?: string;
      evidence_reference?: string;
    }[];
  } | null;
}

export default function ExpertEvaluationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const { currentUser } = useAuth();

  const [data, setData] = useState<AssignmentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<"proposal" | "challenge">("proposal");

  // Conflict of Interest state
  const [coiDeclaration, setCoiDeclaration] = useState<"NO_CONFLICT" | "CONFLICT_DECLARED">("NO_CONFLICT");
  const [coiReason, setCoiReason] = useState("");
  const [submittingCoi, setSubmittingCoi] = useState(false);

  // Scoring matrix state
  const [scores, setScores] = useState<Record<string, ScoreInputState>>({});
  const [overallComments, setOverallComments] = useState("");
  const [recommendation, setRecommendation] = useState("RECOMMEND");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");

  // Submission state
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<AssignmentDetailData>(`/api/v1/expert/assignments/${assignmentId}`);
      setData(res);

      // Populate existing COI if present
      if (res.assignment.conflict_declaration) {
        setCoiDeclaration(res.assignment.conflict_declaration);
        setCoiReason(res.assignment.conflict_reason || "");
      }

      // Populate existing scores if present in evaluation
      const initialScores: Record<string, ScoreInputState> = {};
      const criteriaList = res.challenge.criteria || [];

      // Default all criteria to mid or min score
      criteriaList.forEach((crit) => {
        initialScores[crit.id] = {
          score: Math.round(crit.max_score * 0.7 * 10) / 10,
          comment: "",
          evidence_reference: "",
        };
      });

      if (res.evaluation?.scores) {
        res.evaluation.scores.forEach((s) => {
          initialScores[s.criterion_id] = {
            score: s.score,
            comment: s.comment || "",
            evidence_reference: s.evidence_reference || "",
          };
        });
      }

      setScores(initialScores);

      if (res.evaluation?.overall_comments) {
        setOverallComments(res.evaluation.overall_comments);
      }
      if (res.evaluation?.recommendation) {
        setRecommendation(res.evaluation.recommendation);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load evaluation assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [assignmentId]);

  // Live Score Calculations
  const calculatedOverallScore = useMemo(() => {
    if (!data?.challenge?.criteria) return 0;
    let total = 0;
    data.challenge.criteria.forEach((crit) => {
      const current = scores[crit.id];
      if (current) {
        const raw = Math.max(0, Math.min(current.score, crit.max_score));
        const normalized = crit.max_score > 0 ? raw / crit.max_score : 0;
        total += normalized * crit.weight;
      }
    });
    return Math.round(Math.min(100, Math.max(0, total)) * 10) / 10;
  }, [data, scores]);

  const isSubmitted = data?.evaluation?.is_submitted || data?.assignment?.assignment_status === "COMPLETED";
  const hasDeclaredConflict = data?.assignment?.conflict_declaration === "CONFLICT_DECLARED";
  const hasDeclaredNoConflict = data?.assignment?.conflict_declaration === "NO_CONFLICT";

  const handleScoreChange = (criterionId: string, value: number, maxScore: number) => {
    if (isSubmitted) return;
    const clamped = Math.max(0, Math.min(value, maxScore));
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: clamped,
      },
    }));
  };

  const handleFieldChange = (
    criterionId: string,
    field: "comment" | "evidence_reference",
    val: string
  ) => {
    if (isSubmitted) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: val,
      },
    }));
  };

  const handleDeclareCoi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCoi(true);
    try {
      await apiRequest(`/api/v1/expert/assignments/${assignmentId}/coi`, {
        method: "POST",
        body: JSON.stringify({
          declaration: coiDeclaration,
          reason: coiReason || (coiDeclaration === "NO_CONFLICT" ? "No commercial or advisory interest." : "Conflict declared."),
        }),
      });
      setSuccessNotice("Conflict of Interest declaration successfully recorded.");
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to record Conflict of Interest declaration.");
    } finally {
      setSubmittingCoi(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setSuccessNotice(null);
    try {
      const scoresPayload = Object.entries(scores).map(([critId, val]) => ({
        criterion_id: critId,
        score: val.score,
        comment: val.comment,
        evidence_reference: val.evidence_reference,
      }));

      await apiRequest(`/api/v1/expert/assignments/${assignmentId}/draft`, {
        method: "POST",
        body: JSON.stringify({
          scores: scoresPayload,
          overall_comments: overallComments,
          recommendation,
          strengths,
          weaknesses,
        }),
      });

      setSuccessNotice("Draft evaluation successfully saved.");
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to save evaluation draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitFinal = async () => {
    setSubmittingFinal(true);
    try {
      const scoresPayload = Object.entries(scores).map(([critId, val]) => ({
        criterion_id: critId,
        score: val.score,
        comment: val.comment,
        evidence_reference: val.evidence_reference,
      }));

      await apiRequest(`/api/v1/expert/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          scores: scoresPayload,
          overall_comments: overallComments,
          recommendation,
          strengths,
          weaknesses,
        }),
      });

      setShowSubmitModal(false);
      setSuccessNotice("Evaluation permanently finalized and recorded in the audit trail.");
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Failed to submit final evaluation.");
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin" />
          <p className="text-xs text-slate-600 font-medium">Opening secure evaluation workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Evaluation Dossier Unavailable</h2>
          <p className="text-xs text-slate-600">{error || "Could not retrieve assignment details."}</p>
          <Link href="/expert/dashboard">
            <Button variant="gov" size="sm" className="w-full text-xs">
              Return to Expert Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["EXPERT", "EXPERT_EVALUATOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Header */}
        <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/expert/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 p-2 h-9 w-9"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {data.application.application_code}
                  </span>
                  <Badge variant="gov" className="text-[10px] bg-purple-400/20 text-purple-200 border-purple-400/30">
                    {data.challenge.domain}
                  </Badge>
                  {isSubmitted && (
                    <Badge variant="success" className="text-[10px] gap-1 bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
                      <CheckCircle2 className="w-3 h-3" /> Evaluation Finalized
                    </Badge>
                  )}
                </div>
                <h1 className="font-bold text-base sm:text-lg tracking-tight mt-0.5 truncate max-w-xl">
                  {data.application.proposal_title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-300 block font-semibold uppercase">Applicant Startup</span>
                <span className="text-xs font-bold text-white">
                  {data.startup.startup_name}
                  {data.startup.dpiit_number && ` (${data.startup.dpiit_number})`}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Notice Banner */}
        {successNotice && (
          <div className="bg-emerald-600 text-white text-xs py-2.5 px-4 text-center font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Workspace Body */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (5 Cols): Proposal & Challenge Dossier */}
            <div className="lg:col-span-5 space-y-6">
              {/* Dossier Tabs */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    onClick={() => setActiveDossierTab("proposal")}
                    className={`flex-1 py-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-b-2 ${
                      activeDossierTab === "proposal"
                        ? "border-[#0B2545] text-[#0B2545] bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Startup Proposal</span>
                  </button>
                  <button
                    onClick={() => setActiveDossierTab("challenge")}
                    className={`flex-1 py-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-b-2 ${
                      activeDossierTab === "challenge"
                        ? "border-[#0B2545] text-[#0B2545] bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Challenge Scope</span>
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {activeDossierTab === "proposal" ? (
                    <>
                      {/* Startup Identity Card */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{data.startup.startup_name}</span>
                          {data.startup.dpiit_number && (
                            <Badge variant="gov" className="text-[10px]">
                              {data.startup.dpiit_number}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 flex-wrap text-[11px]">
                          <span>Stage: <strong>{data.startup.product_stage || "MVP"}</strong></span>
                          <span>•</span>
                          <span>HQ: <strong>{data.startup.headquarters || "India"}</strong></span>
                          <span>•</span>
                          <span>Timeline: <strong>{data.application.timeline_days || 90} Days</strong></span>
                        </div>
                        {data.application.requested_budget && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-slate-500">Requested Pilot Grant:</span>
                            <span className="text-xs font-black text-slate-900">
                              ₹{(data.application.requested_budget / 100000).toFixed(2)} Lakhs
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Executive Summary */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Executive Summary
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                          {data.application.executive_summary || "No executive summary provided."}
                        </p>
                      </div>

                      {/* Problem Understanding */}
                      {data.application.problem_understanding && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Problem Understanding
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {data.application.problem_understanding}
                          </p>
                        </div>
                      )}

                      {/* Proposed Solution */}
                      {data.application.proposed_solution && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Proposed Innovation & Solution
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {data.application.proposed_solution}
                          </p>
                        </div>
                      )}

                      {/* Technical Architecture */}
                      {data.application.technical_approach && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Technical Approach & Architecture
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                            {data.application.technical_approach}
                          </p>
                        </div>
                      )}

                      {/* Expected Outcomes */}
                      {data.application.expected_outcomes && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Measurable Target Outcomes
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {data.application.expected_outcomes}
                          </p>
                        </div>
                      )}

                      {/* Pilot Implementation Plan */}
                      {data.application.pilot_plan && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Pilot Sandbox Deployment Plan
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {data.application.pilot_plan}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Challenge Scope Tab */
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
                          {data.challenge.challenge_code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {data.challenge.title}
                        </h3>
                      </div>

                      <div className="space-y-1.5">
                        <strong className="text-slate-900 block">Problem Statement:</strong>
                        <p className="text-slate-600 leading-relaxed">{data.challenge.problem_statement}</p>
                      </div>

                      <div className="space-y-1.5">
                        <strong className="text-slate-900 block">Desired Outcome:</strong>
                        <p className="text-slate-600 leading-relaxed p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                          {data.challenge.desired_outcome}
                        </p>
                      </div>

                      {/* Criteria Breakdown */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <strong className="text-slate-900 block">Configured Evaluation Weights:</strong>
                        <div className="space-y-1.5">
                          {data.challenge.criteria.map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                              <span className="text-slate-700 truncate max-w-[200px]">{c.name || c.title}</span>
                              <span className="font-bold text-slate-900">{c.weight}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (7 Cols): Scoring Engine & Conflict Declaration */}
            <div className="lg:col-span-7 space-y-6">
              {/* Conflict of Interest (COI) Gate Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Conflict of Interest (COI) Declaration
                    </h3>
                  </div>
                  <Badge variant="gov" className="text-[10px]">
                    CVC & GFR 2017
                  </Badge>
                </div>

                {hasDeclaredNoConflict ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">No Conflict of Interest Verified</strong>
                      <p className="text-emerald-800 text-[11px]">
                        Declaration confirmed: &ldquo;{data.assignment.conflict_reason || "No personal, financial, or advisory affiliation with applicant."}&rdquo;
                      </p>
                    </div>
                  </div>
                ) : hasDeclaredConflict ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Conflict of Interest Declared</strong>
                      <p className="text-rose-800 text-[11px]">
                        Reason: {data.assignment.conflict_reason}
                      </p>
                      <p className="text-[11px] text-rose-700 font-medium mt-1">
                        In accordance with public procurement integrity rules, this scoring workspace is permanently excused.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleDeclareCoi} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                      Before accessing the scoring workspace, you must confirm that you have no commercial, advisory, employment, or familial conflict of interest with <strong>{data.startup.startup_name}</strong>.
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="coi"
                          checked={coiDeclaration === "NO_CONFLICT"}
                          onChange={() => setCoiDeclaration("NO_CONFLICT")}
                          className="mt-0.5 text-[#0B2545] focus:ring-[#0B2545]"
                        />
                        <div>
                          <strong className="text-slate-900 block">I declare NO conflict of interest</strong>
                          <span className="text-slate-500 text-[11px]">
                            I have no financial shareholding, consulting agreement, or personal affiliation with this startup.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="coi"
                          checked={coiDeclaration === "CONFLICT_DECLARED"}
                          onChange={() => setCoiDeclaration("CONFLICT_DECLARED")}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <strong className="text-slate-900 block">I DECLARE a conflict of interest</strong>
                          <span className="text-slate-500 text-[11px]">
                            I or my immediate institution have commercial, advisory, or personal associations with this applicant.
                          </span>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Declaration Comments / Justification:
                      </label>
                      <textarea
                        rows={2}
                        value={coiReason}
                        onChange={(e) => setCoiReason(e.target.value)}
                        placeholder="Optional remarks or details regarding your declaration..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="gov"
                      size="sm"
                      disabled={submittingCoi}
                      className="w-full text-xs font-bold gap-1.5"
                    >
                      {submittingCoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Submit Conflict Declaration
                    </Button>
                  </form>
                )}
              </div>

              {/* Scoring Interface (Active ONLY if NO_CONFLICT is declared) */}
              {hasDeclaredConflict ? (
                <div className="bg-slate-100 rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Scoring Workspace Disabled</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    You have declared a conflict of interest. This proposal has been removed from your active scoring queue.
                  </p>
                </div>
              ) : !hasDeclaredNoConflict ? (
                <div className="bg-slate-100 rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                  <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Scoring Form Locked</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Please complete and submit the Conflict of Interest Declaration above to unlock the scoring matrix.
                  </p>
                </div>
              ) : (
                /* Active Transparent Multi-Criteria Scoring Form */
                <div className="space-y-6">
                  {/* Live Total Score Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Server-Verified Composite Score
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-black text-[#0B2545]">
                          {calculatedOverallScore.toFixed(1)}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">/ 100.0</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Deterministic mathematical formula: &sum; (score / max_score &times; weight)
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          calculatedOverallScore >= 80
                            ? "success"
                            : calculatedOverallScore >= 60
                            ? "gov"
                            : "outline"
                        }
                        className="text-xs px-3 py-1 font-bold"
                      >
                        {calculatedOverallScore >= 85
                          ? "EXEMPLARY"
                          : calculatedOverallScore >= 70
                          ? "RECOMMENDED"
                          : calculatedOverallScore >= 50
                          ? "MODERATE"
                          : "INSUFFICIENT"}
                      </Badge>
                    </div>
                  </div>

                  {/* Criteria Scoring Cards */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-900" /> Evaluation Criteria Matrix
                    </h3>

                    {data.challenge.criteria.map((criterion, idx) => {
                      const state = scores[criterion.id] || { score: 0, comment: "", evidence_reference: "" };
                      const rawScore = state.score;
                      const maxScore = criterion.max_score || 10.0;
                      const weightContribution = ((rawScore / maxScore) * criterion.weight).toFixed(1);

                      return (
                        <div
                          key={criterion.id}
                          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-slate-900">
                                  {idx + 1}. {criterion.name || criterion.title}
                                </span>
                                <Badge variant="gov" className="text-[10px]">
                                  Weight: {criterion.weight}%
                                </Badge>
                                {(criterion.mandatory || criterion.is_mandatory) && (
                                  <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200">
                                    Mandatory
                                  </Badge>
                                )}
                              </div>
                              {criterion.description && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {criterion.description}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 block font-semibold">Contribution</span>
                              <span className="text-xs font-bold text-blue-950">
                                {weightContribution}% / {criterion.weight}%
                              </span>
                            </div>
                          </div>

                          {/* Score Slider & Number Input */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">Attained Score (0 – {maxScore}):</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  disabled={isSubmitted}
                                  min={criterion.min_score}
                                  max={maxScore}
                                  step={0.1}
                                  value={rawScore}
                                  onChange={(e) => handleScoreChange(criterion.id, parseFloat(e.target.value) || 0, maxScore)}
                                  className="w-20 px-2 py-1 text-xs font-bold text-right border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0B2545] disabled:bg-slate-100"
                                />
                                <span className="text-xs text-slate-400 font-medium">/ {maxScore}</span>
                              </div>
                            </div>

                            <input
                              type="range"
                              disabled={isSubmitted}
                              min={criterion.min_score}
                              max={maxScore}
                              step={0.1}
                              value={rawScore}
                              onChange={(e) => handleScoreChange(criterion.id, parseFloat(e.target.value) || 0, maxScore)}
                              className="w-full accent-[#0B2545] cursor-pointer disabled:opacity-50"
                            />
                          </div>

                          {/* Justification Comment & Evidence Reference */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Technical Evaluation Justification:
                              </label>
                              <textarea
                                rows={2}
                                disabled={isSubmitted}
                                value={state.comment}
                                onChange={(e) => handleFieldChange(criterion.id, "comment", e.target.value)}
                                placeholder="Explain reasoning behind this score..."
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545] disabled:bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Evidence / Document Reference:
                              </label>
                              <input
                                type="text"
                                disabled={isSubmitted}
                                value={state.evidence_reference}
                                onChange={(e) => handleFieldChange(criterion.id, "evidence_reference", e.target.value)}
                                placeholder="e.g. Page 4, Architecture Diagram"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545] disabled:bg-slate-50"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Qualitative Recommendation Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Overall Recommendation & Qualitative Commentary
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Technical Panel Recommendation:
                      </label>
                      <select
                        disabled={isSubmitted}
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545] disabled:bg-slate-50"
                      >
                        <option value="STRONGLY_RECOMMEND">STRONGLY RECOMMEND — Exceptional prototype and alignment</option>
                        <option value="RECOMMEND">RECOMMEND — Solid proposal viable for pilot phase</option>
                        <option value="NEUTRAL">NEUTRAL — Meets basic threshold; requires conditional safeguards</option>
                        <option value="DO_NOT_RECOMMEND">DO NOT RECOMMEND — Critical technical deficiencies or unfeasible scope</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Executive Evaluation Summary:
                      </label>
                      <textarea
                        rows={3}
                        disabled={isSubmitted}
                        value={overallComments}
                        onChange={(e) => setOverallComments(e.target.value)}
                        placeholder="Comprehensive evaluator remarks for the Government procurement committee..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545] disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Action Bar */}
                  {!isSubmitted ? (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingDraft || submittingFinal}
                        onClick={handleSaveDraft}
                        className="text-xs font-semibold gap-1.5"
                      >
                        {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Draft Scores
                      </Button>

                      <Button
                        variant="gov"
                        size="sm"
                        disabled={savingDraft || submittingFinal}
                        onClick={() => setShowSubmitModal(true)}
                        className="text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit Final Evaluation
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold">
                          Final Evaluation permanently submitted on {data.evaluation?.submitted_at ? new Date(data.evaluation.submitted_at).toLocaleDateString() : "date of record"}.
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-mono">Immutable Audit Logged</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Submission Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[#0B2545]">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Final Evaluation Submission
                </h3>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
                <p className="font-semibold">Important Transparency & Immutability Notice:</p>
                <p className="text-[11px] leading-relaxed">
                  Under Government of India public procurement integrity regulations, once submitted, expert scoring dossiers are permanently finalized and recorded in the audit trail. They cannot be modified or re-submitted.
                </p>
              </div>

              <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposal:</span>
                  <strong className="text-slate-800">{data.application.proposal_title}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Final Composite Score:</span>
                  <strong className="text-blue-900 text-sm">{calculatedOverallScore.toFixed(1)} / 100</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recommendation:</span>
                  <strong className="text-purple-900">{recommendation.replace("_", " ")}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmitModal(false)}
                  className="text-xs"
                >
                  Return to Edit
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={submittingFinal}
                  onClick={handleSubmitFinal}
                  className="text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                >
                  {submittingFinal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm & Finalize Submission
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
