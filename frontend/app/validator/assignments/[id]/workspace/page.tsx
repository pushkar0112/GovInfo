"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/auth";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
  Save,
  Send,
  Activity,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  Scale,
} from "lucide-react";

interface KPIWorkspaceItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  measurement_type: string;
  unit: string;
  baseline_value?: number;
  target_value: number;
  target_operator: string;
  direction: string;
  weight: number;
  measurements: any[];
  evidence_files: any[];
  existing_validation?: {
    validator_measured_value?: number;
    result: string;
    achievement_percentage?: number;
    evidence_sufficiency?: string;
    confidence_score?: number;
    methodology_notes?: string;
    validator_commentary?: string;
    divergence_analysis?: string;
  };
}

interface WorkspaceData {
  assignment: {
    id: string;
    pilot_id: string;
    scope?: string;
    terms_of_reference?: string;
    status: string;
    coi_status: string;
  };
  pilot: {
    id: string;
    pilot_code: string;
    title: string;
    scope_of_work?: string;
    start_date?: string;
    end_date?: string;
    pilot_budget: number;
    department_name?: string;
    startup_name?: string;
  };
  kpis: KPIWorkspaceItem[];
  existing_report?: any;
}

export default function ValidatorWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.id as string;
  const { currentUser } = useAuth();

  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overall Report Form State
  const [execSummary, setExecSummary] = useState("");
  const [methodology, setMethodology] = useState("");
  const [overallAssessment, setOverallAssessment] = useState("SUCCESSFUL");
  const [overallAchievementPct, setOverallAchievementPct] = useState<string>("");
  const [confidenceLevel, setConfidenceLevel] = useState("HIGH");
  const [findings, setFindings] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [readiness, setReadiness] = useState("");
  const [risks, setRisks] = useState("");

  // Line item scorecard evaluations keyed by kpi_id
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<WorkspaceData>(`/api/v1/validator/assignments/${assignmentId}/workspace`);
      setData(res);

      // Populate existing report data if present
      if (res.existing_report) {
        setExecSummary(res.existing_report.executive_summary || "");
        setMethodology(res.existing_report.methodology || "");
        setOverallAssessment(res.existing_report.overall_assessment || "SUCCESSFUL");
        setOverallAchievementPct(
          res.existing_report.overall_achievement_percentage != null
            ? String(res.existing_report.overall_achievement_percentage)
            : ""
        );
        setConfidenceLevel(res.existing_report.confidence_level || "HIGH");
        setFindings(res.existing_report.findings || "");
        setRecommendations(res.existing_report.recommendations || "");
        setReadiness(res.existing_report.readiness_assessment || "");
        setRisks(res.existing_report.risks_and_limitations || "");
      }

      // Initialize evaluations for each KPI
      const evalMap: Record<string, any> = {};
      res.kpis.forEach((k) => {
        const ev = k.existing_validation;
        const latestM = k.measurements && k.measurements.length > 0 ? k.measurements[0].measured_value : undefined;
        evalMap[k.id] = {
          kpi_id: k.id,
          validator_measured_value: ev?.validator_measured_value != null ? ev.validator_measured_value : latestM,
          result: ev?.result || "ACHIEVED",
          evidence_sufficiency: ev?.evidence_sufficiency || "SUFFICIENT",
          confidence_score: ev?.confidence_score != null ? ev.confidence_score : 1.0,
          methodology_notes: ev?.methodology_notes || "",
          validator_commentary: ev?.validator_commentary || "",
          divergence_analysis: ev?.divergence_analysis || "",
        };
      });
      setEvaluations(evalMap);
    } catch (err: any) {
      setError(err?.message || "Failed to load validation workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) {
      loadWorkspace();
    }
  }, [assignmentId]);

  const updateEvaluation = (kpiId: string, field: string, val: any) => {
    setEvaluations((prev) => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        [field]: val,
      },
    }));
  };

  const buildPayload = () => {
    const kpiValidations = Object.values(evaluations).map((ev: any) => ({
      kpi_id: ev.kpi_id,
      validator_measured_value: ev.validator_measured_value !== "" && ev.validator_measured_value != null ? parseFloat(ev.validator_measured_value) : null,
      result: ev.result,
      evidence_sufficiency: ev.evidence_sufficiency,
      confidence_score: parseFloat(ev.confidence_score) || 1.0,
      methodology_notes: ev.methodology_notes || null,
      validator_commentary: ev.validator_commentary || null,
      divergence_analysis: ev.divergence_analysis || null,
    }));

    return {
      executive_summary: execSummary,
      methodology,
      overall_assessment: overallAssessment,
      overall_achievement_percentage: overallAchievementPct !== "" ? parseFloat(overallAchievementPct) : null,
      confidence_level: confidenceLevel,
      findings,
      recommendations,
      readiness_assessment: readiness || null,
      risks_and_limitations: risks || null,
      kpi_validations: kpiValidations,
    };
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await apiRequest(`/api/v1/validator/assignments/${assignmentId}/report/draft`, {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });
      setSuccessMsg("Draft scorecard saved successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (execSummary.trim().length < 20) {
      setError("Executive summary must be at least 20 characters.");
      return;
    }
    if (methodology.trim().length < 10) {
      setError("Methodology description must be at least 10 characters.");
      return;
    }
    if (findings.trim().length < 20) {
      setError("Key findings must be at least 20 characters.");
      return;
    }
    if (recommendations.trim().length < 20) {
      setError("Recommendations must be at least 20 characters.");
      return;
    }

    if (!confirm("Are you ready to officially submit this statutory Validation Report? Once submitted, it will be sealed and forwarded to the government for pilot success classification.")) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await apiRequest(`/api/v1/validator/assignments/${assignmentId}/report/submit`, {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });
      setSuccessMsg("Validation Report officially submitted and sealed.");
      setTimeout(() => {
        router.push("/validator/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to submit validation report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadFile = (downloadUrl: string, fileName: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("govinnovate_token");
    fetch(`${apiUrl}${downloadUrl}`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  const isCompleted = data?.assignment?.status === "COMPLETED";

  return (
    <ProtectedRoute allowedRoles={["VALIDATOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumbs & Top Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/validator/dashboard"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Validator Dashboard
            </Link>

            <div className="flex items-center gap-2">
              {!isCompleted && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleSaveDraft}
                    className="text-xs gap-1.5 border-slate-300"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? "Saving..." : "Save Draft Scorecard"}
                  </Button>
                </>
              )}
              {isCompleted && (
                <Badge variant="success" className="text-xs px-3 py-1">
                  Report Submitted & Sealed
                </Badge>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
            </div>
          )}

          {/* Pilot Sandbox Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="gov" className="text-[10px] bg-blue-100 text-blue-900">
                    Step 7: Validation Workspace
                  </Badge>
                  <span className="text-xs font-mono text-slate-500 font-bold">{data?.pilot?.pilot_code}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {data?.pilot?.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                  {data?.pilot?.scope_of_work}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nodal Department</span>
                <span className="font-semibold text-slate-800">{data?.pilot?.department_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Deploying Startup</span>
                <span className="font-semibold text-slate-800">{data?.pilot?.startup_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Sanctioned Budget</span>
                <span className="font-bold text-slate-900">₹{(data?.pilot?.pilot_budget || 0).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">COI Integrity Clearance</span>
                <span className="font-bold text-emerald-700">Clean Certified</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-6">
            {/* KPI By KPI Validation Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-900" />
                  Target KPI Evaluations & Telemetry Audit
                </h2>
                <span className="text-xs text-slate-500">
                  {data?.kpis?.length || 0} Criteria Defined
                </span>
              </div>

              {data?.kpis?.map((kpi, idx) => {
                const ev = evaluations[kpi.id] || {};
                const targetDisplay = `${kpi.target_operator} ${kpi.target_value} ${kpi.unit}`;
                const baselineDisplay = kpi.baseline_value != null ? `${kpi.baseline_value} ${kpi.unit}` : "N/A";

                return (
                  <div
                    key={kpi.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-900">Criterion #{idx + 1}</span>
                          <Badge variant="gov" className="text-[10px]">{kpi.category}</Badge>
                          <span className="text-[11px] text-slate-400">Weight: {kpi.weight}x</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{kpi.name}</h3>
                        {kpi.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{kpi.description}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Target Requirement</span>
                        <span className="font-bold text-slate-900">{targetDisplay}</span>
                        <span className="text-[10px] text-slate-500 block">Baseline: {baselineDisplay}</span>
                      </div>
                    </div>

                    {/* Startup Telemetry & Evidence Tabs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Startup Readings */}
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <Activity className="w-3.5 h-3.5 text-blue-700" />
                          Startup Logged Readings ({kpi.measurements?.length || 0})
                        </span>

                        {kpi.measurements && kpi.measurements.length > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {kpi.measurements.map((m: any) => (
                              <div key={m.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-blue-900">{m.measured_value} {kpi.unit}</span>
                                  <span className="text-[10px] text-slate-400 block">{m.measurement_date} • {m.measurement_method || "Edge logs"}</span>
                                </div>
                                {m.sample_size && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    N={m.sample_size}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No telemetry readings logged yet.</p>
                        )}
                      </div>

                      {/* Evidence Files */}
                      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <FileText className="w-3.5 h-3.5 text-indigo-700" />
                          Verifiable Evidence Files ({kpi.evidence_files?.length || 0})
                        </span>

                        {kpi.evidence_files && kpi.evidence_files.length > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {kpi.evidence_files.map((e: any) => (
                              <div key={e.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                                <div className="max-w-[200px] truncate">
                                  <span className="font-semibold text-slate-800 text-[11px] truncate block">
                                    {e.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    v{e.version} • {e.evidence_type} • {e.file_name}
                                  </span>
                                </div>
                                {e.download_url && (
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(e.download_url, e.file_name)}
                                    className="text-blue-900 hover:text-blue-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Get
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No evidence attachments uploaded.</p>
                        )}
                      </div>
                    </div>

                    {/* Validator Evaluation Inputs */}
                    <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-4 text-xs">
                      <span className="font-bold text-blue-950 block text-xs">
                        Independent Auditor Scorecard Inputs
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Validator Measured Value *</label>
                          <input
                            type="number"
                            step="any"
                            disabled={isCompleted}
                            placeholder="e.g. 13.8"
                            value={ev.validator_measured_value ?? ""}
                            onChange={(e) => updateEvaluation(kpi.id, "validator_measured_value", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Validation Finding *</label>
                          <select
                            disabled={isCompleted}
                            value={ev.result || "ACHIEVED"}
                            onChange={(e) => updateEvaluation(kpi.id, "result", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-900"
                          >
                            <option value="ACHIEVED">ACHIEVED (Target Satisfied)</option>
                            <option value="PARTIALLY_ACHIEVED">PARTIALLY_ACHIEVED</option>
                            <option value="FAILED">FAILED</option>
                            <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Evidence Sufficiency</label>
                          <select
                            disabled={isCompleted}
                            value={ev.evidence_sufficiency || "SUFFICIENT"}
                            onChange={(e) => updateEvaluation(kpi.id, "evidence_sufficiency", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-900"
                          >
                            <option value="SUFFICIENT">SUFFICIENT (Fully Grounded)</option>
                            <option value="PARTIALLY_SUFFICIENT">PARTIALLY_SUFFICIENT</option>
                            <option value="INSUFFICIENT">INSUFFICIENT (Unverifiable)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Auditor Evaluation Commentary</label>
                          <textarea
                            rows={2}
                            disabled={isCompleted}
                            placeholder="Detail your empirical findings, variance observations, or verification tests conducted..."
                            value={ev.validator_commentary || ""}
                            onChange={(e) => updateEvaluation(kpi.id, "validator_commentary", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Divergence Analysis (If startup claims differ)</label>
                          <textarea
                            rows={2}
                            disabled={isCompleted}
                            placeholder="Explain reason for variance between startup self-reported values and auditor re-test findings..."
                            value={ev.divergence_analysis || ""}
                            onChange={(e) => updateEvaluation(kpi.id, "divergence_analysis", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Statutory Report Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-900" />
                  Statutory Pilot Validation Report Synthesis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Produce the definitive independent outcome synthesis for public sector procurement decision-makers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Overall Assessment Recommendation *</label>
                  <select
                    disabled={isCompleted}
                    value={overallAssessment}
                    onChange={(e) => setOverallAssessment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="SUCCESSFUL">SUCCESSFUL (Recommended for Procurement)</option>
                    <option value="PARTIALLY_SUCCESSFUL">PARTIALLY_SUCCESSFUL (Conditional Approval)</option>
                    <option value="FAILED">FAILED (Not Recommended)</option>
                    <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Overall Target Achievement (%)</label>
                  <input
                    type="number"
                    step="any"
                    disabled={isCompleted}
                    placeholder="Auto-calculated if blank (e.g. 108.5)"
                    value={overallAchievementPct}
                    onChange={(e) => setOverallAchievementPct(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Audit Confidence Level</label>
                  <select
                    disabled={isCompleted}
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="HIGH">HIGH (Extensive empirical data)</option>
                    <option value="MEDIUM">MEDIUM (Adequate representative sample)</option>
                    <option value="LOW">LOW (Constrained sample / high variance)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Executive Summary * (min 20 chars)</label>
                  <textarea
                    rows={3}
                    disabled={isCompleted}
                    required
                    placeholder="Provide a comprehensive high-level summary of the pilot trial, primary outcomes, and overarching conclusions."
                    value={execSummary}
                    onChange={(e) => setExecSummary(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Empirical Testing Methodology * (min 10 chars)</label>
                  <textarea
                    rows={3}
                    disabled={isCompleted}
                    required
                    placeholder="Describe laboratory protocols, edge telemetry sampling frequency, field testing sites, and statistical validation tools."
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Key Empirical Findings & Statistical Analysis * (min 20 chars)</label>
                  <textarea
                    rows={3}
                    disabled={isCompleted}
                    required
                    placeholder="Document verified performance metrics, error rates, failure modes, latency reductions, or clinical concordance figures."
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">Policy & Procurement Scale Recommendations * (min 20 chars)</label>
                  <textarea
                    rows={3}
                    disabled={isCompleted}
                    required
                    placeholder="Provide actionable guidance for subsequent GeM public procurement, GFR Section 149 alignment, and rollout precautions."
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Commercial & Technological Readiness</label>
                    <textarea
                      rows={2}
                      disabled={isCompleted}
                      placeholder="Assess TRL level, manufacturing maturity, and operational support feasibility..."
                      value={readiness}
                      onChange={(e) => setReadiness(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Identified Risks & Operational Constraints</label>
                    <textarea
                      rows={2}
                      disabled={isCompleted}
                      placeholder="Detail cybersecurity considerations, hardware supply chain dependencies, or extreme weather constraints..."
                      value={risks}
                      onChange={(e) => setRisks(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>
              </div>

              {!isCompleted && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={handleSaveDraft}
                    className="text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Draft
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5 shadow-md px-6"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-emerald-400" />
                    )}
                    Submit Official Validation Report
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
