"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Info,
  Scale,
  X,
  Loader2,
  Check,
} from "lucide-react";

interface ValidationSummary {
  pilot_id: string;
  pilot_code: string;
  pilot_title: string;
  pilot_status: string;
  validation_status: string;
  validator_assessment?: string;
  success_status: string;
  classification_confirmed_by?: string;
  classification_confirmed_at?: string;
  classification_notes?: string;
  classification_divergence_reason?: string;
  assigned_validator?: {
    id: string;
    validator_profile_id: string;
    validator_name: string;
    validator_email: string;
    organization: string;
    status: string;
    coi_status: string;
    coi_declared: boolean;
    assigned_at: string;
  };
  submitted_report?: {
    id: string;
    assignment_id: string;
    executive_summary: string;
    methodology: string;
    overall_assessment: string;
    overall_achievement_percentage?: number;
    kpis_achieved_count: number;
    kpis_total_count: number;
    confidence_level: string;
    findings: string;
    unintended_effects?: string;
    recommendations: string;
    readiness_assessment?: string;
    risks_and_limitations?: string;
    status: string;
    submitted_at: string;
    kpi_validations?: any[];
  };
  kpi_count: number;
  evidence_count: number;
}

interface ValidatorProfileItem {
  id: string;
  user_name?: string;
  user_email?: string;
  organization: string;
  domain_expertise?: string;
  accreditations?: string;
  years_of_experience: number;
  availability: string;
  validation_count: number;
  rating?: number;
}

export default function GovernmentValidationPage() {
  const params = useParams();
  const pilotId = params?.id as string;
  const { currentUser } = useAuth();

  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [validators, setValidators] = useState<ValidatorProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Assign Validator
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedValidatorId, setSelectedValidatorId] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [termsText, setTermsText] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Modal: Reopen Report
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  // Modal: Confirm Pilot Success
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [targetSuccessStatus, setTargetSuccessStatus] = useState("SUCCESSFUL");
  const [classificationNotes, setClassificationNotes] = useState("");
  const [divergenceReason, setDivergenceReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, valRes] = await Promise.all([
        apiRequest<ValidationSummary>(`/api/v1/government/pilots/${pilotId}/validation-summary`),
        apiRequest<ValidatorProfileItem[]>(`/api/v1/government/validators`),
      ]);
      setSummary(sumRes);
      setValidators(valRes);
      if (valRes.length > 0 && !selectedValidatorId) {
        setSelectedValidatorId(valRes[0].id);
      }
      if (sumRes.submitted_report) {
        setTargetSuccessStatus(sumRes.submitted_report.overall_assessment);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load validation dossier.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pilotId) {
      loadSummary();
    }
  }, [pilotId]);

  const handleAssignValidator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidatorId) {
      setError("Please select an accredited validator.");
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      await apiRequest(`/api/v1/government/pilots/${pilotId}/assign-validator`, {
        method: "POST",
        body: JSON.stringify({
          pilot_id: pilotId,
          validator_id: selectedValidatorId,
          scope: scopeText || "Independent verification of technical KPIs, reliability telemetry, and statutory GFR compliance.",
          terms_of_reference: termsText || "Review edge logs, inspect field datasets, and produce structured empirical scorecard.",
        }),
      });
      setSuccessMsg("Independent validator successfully assigned.");
      setIsAssignModalOpen(false);
      await loadSummary();
    } catch (err: any) {
      setError(err?.message || "Failed to assign validator.");
    } finally {
      setAssigning(false);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.submitted_report?.id || reopenReason.trim().length < 10) {
      setError("Please provide a comprehensive explanation (minimum 10 characters).");
      return;
    }

    try {
      setReopening(true);
      setError(null);
      await apiRequest(`/api/v1/government/reports/${summary.submitted_report.id}/reopen`, {
        method: "POST",
        body: JSON.stringify({ reopen_reason: reopenReason }),
      });
      setSuccessMsg("Validation report reopened for clarification.");
      setIsReopenModalOpen(false);
      await loadSummary();
    } catch (err: any) {
      setError(err?.message || "Failed to reopen report.");
    } finally {
      setReopening(false);
    }
  };

  const handleConfirmClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    const reportAssessment = summary?.submitted_report?.overall_assessment;
    const isDivergent = reportAssessment && targetSuccessStatus !== reportAssessment;

    if (isDivergent && (!divergenceReason || divergenceReason.trim().length < 10)) {
      setError("Statutory requirement: When diverging from the independent validator assessment, a comprehensive justification (min 10 characters) is legally required.");
      return;
    }

    try {
      setConfirming(true);
      setError(null);
      await apiRequest(`/api/v1/government/pilots/${pilotId}/confirm-success`, {
        method: "POST",
        body: JSON.stringify({
          success_status: targetSuccessStatus,
          classification_notes: classificationNotes || null,
          classification_divergence_reason: isDivergent ? divergenceReason : null,
        }),
      });
      setSuccessMsg("Pilot success classification officially confirmed and recorded.");
      setIsConfirmModalOpen(false);
      await loadSummary();
    } catch (err: any) {
      setError(err?.message || "Failed to confirm classification.");
    } finally {
      setConfirming(false);
    }
  };

  const downloadPDF = async () => {
    if (!summary?.submitted_report?.id) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("govinnovate_token");
      const res = await fetch(`${apiUrl}/api/v1/government/reports/${summary.submitted_report.id}/pdf`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) throw new Error("Failed to download PDF report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Validation_Report_${summary.pilot_code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Error downloading PDF.");
    }
  };

  const report = summary?.submitted_report;
  const isDivergenceDetected = report && targetSuccessStatus !== report.overall_assessment;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Breadcrumb & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/government/pilots" className="hover:text-slate-800">
                Pilots
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/government/pilots/${pilotId}`} className="hover:text-slate-800">
                {summary?.pilot_code || "Pilot Dossier"}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">Independent Validation</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/government/pilots/${pilotId}/kpis`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-blue-200 text-blue-900 bg-blue-50/50">
                  <FileText className="w-4 h-4 text-blue-800" />
                  View KPI Framework
                </Button>
              </Link>
              {report && (
                <Button
                  onClick={downloadPDF}
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs"
                >
                  <Download className="w-4 h-4 text-rose-600" />
                  Download Official Report (PDF)
                </Button>
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

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="gov" className="text-[10px] bg-emerald-100 text-emerald-900">
                    Step 7: Independent Validation
                  </Badge>
                  <span className="text-xs font-mono text-slate-500">{summary?.pilot_code}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {summary?.pilot_title || "Pilot Sandbox"} — Validation Dossier
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Independent expert outcome certification, empirical audits, and statutory GFR compliance sign-off.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {report && summary?.success_status === "NOT_ASSESSED" && (
                  <Button
                    onClick={() => setIsConfirmModalOpen(true)}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    Confirm Pilot Success Classification
                  </Button>
                )}
                {summary?.success_status !== "NOT_ASSESSED" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed Outcome</span>
                      <Badge
                        variant={
                          summary?.success_status === "SUCCESSFUL"
                            ? "success"
                            : summary?.success_status === "PARTIALLY_SUCCESSFUL"
                            ? "warning"
                            : "destructive"
                        }
                        className="text-xs font-bold"
                      >
                        {summary?.success_status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <Link href={`/government/pilots/${pilotId}/procurement`}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm">
                        <Scale className="w-4 h-4 text-white" />
                        Procurement Decision Gate
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Lifecycle Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-xs">
              {[
                { label: "1. Defined KPIs", active: summary?.kpi_count ? summary.kpi_count > 0 : false, done: true },
                { label: "2. Validator Assigned", active: !!summary?.assigned_validator, done: !!summary?.assigned_validator },
                { label: "3. COI Integrity Gate", active: summary?.assigned_validator?.coi_declared, done: summary?.assigned_validator?.coi_status === "NO_CONFLICT" },
                { label: "4. Report Submitted", active: !!summary?.submitted_report, done: !!summary?.submitted_report },
                { label: "5. Success Classified", active: summary?.success_status !== "NOT_ASSESSED", done: summary?.success_status !== "NOT_ASSESSED" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    step.done
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : step.active
                      ? "bg-blue-50/70 border-blue-200 text-blue-900"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step.done
                        ? "bg-emerald-600 text-white"
                        : step.active
                        ? "bg-blue-900 text-white"
                        : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {step.done ? "✓" : idx + 1}
                  </div>
                  <span className="font-semibold truncate">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Validator Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-900" />
                <h2 className="text-base font-bold text-slate-900">
                  Accredited Independent Validator
                </h2>
              </div>

              {summary?.validation_status !== "VALIDATION_COMPLETED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-xs gap-1.5 border-slate-200 text-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                  {summary?.assigned_validator ? "Reassign Validator" : "Assign Independent Validator"}
                </Button>
              )}
            </div>

            {summary?.assigned_validator ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Validator Lead</span>
                  <span className="font-bold text-slate-900">{summary.assigned_validator.validator_name}</span>
                  <span className="text-[11px] text-slate-500 block">{summary.assigned_validator.validator_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Accredited Agency / Org</span>
                  <span className="font-semibold text-slate-800">{summary.assigned_validator.organization}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assignment Status</span>
                  <Badge variant="gov" className="text-[10px] mt-0.5">
                    {summary.assigned_validator.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Conflict of Interest (COI)</span>
                  {summary.assigned_validator.coi_status === "NO_CONFLICT" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Clean Declaration
                    </span>
                  ) : summary.assigned_validator.coi_status === "CONFLICT_DECLARED" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Conflict Declared (Locked)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Declaration
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Validator Assigned</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Assign an accredited third-party agency (IIT, STQC, NABL, CSIR) to conduct empirical audits and issue the statutory outcome certificate.
                </p>
                <Button
                  onClick={() => setIsAssignModalOpen(true)}
                  size="sm"
                  className="bg-[#0B2545] text-white text-xs gap-1.5 mt-2"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Select Validator
                </Button>
              </div>
            )}
          </div>

          {/* Submitted Validation Report Section */}
          {report ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="gov" className="text-[10px]">Official Assessment</Badge>
                    <span className="text-xs text-slate-400">
                      Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Independent Outcome Audit Report
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      report.overall_assessment === "SUCCESSFUL"
                        ? "success"
                        : report.overall_assessment === "PARTIALLY_SUCCESSFUL"
                        ? "warning"
                        : "destructive"
                    }
                    className="text-xs font-bold py-1 px-3"
                  >
                    {report.overall_assessment}
                  </Badge>

                  {summary?.validation_status !== "VALIDATION_COMPLETED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReopenModalOpen(true)}
                      className="text-xs gap-1 text-slate-600 hover:text-slate-900"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reopen for Clarification
                    </Button>
                  )}
                </div>
              </div>

              {/* Assessment Metrics Scorecard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Overall Achievement</span>
                  <span className="text-xl font-bold text-blue-900">
                    {report.overall_achievement_percentage != null
                      ? `${Math.round(report.overall_achievement_percentage)}%`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">KPIs Achieved</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {report.kpis_achieved_count} / {report.kpis_total_count}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Audit Confidence Level</span>
                  <Badge variant="secondary" className="text-xs font-bold mt-1">
                    {report.confidence_level}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Report Status</span>
                  <span className="font-semibold text-slate-800 block mt-1">{report.status}</span>
                </div>
              </div>

              {/* Executive Summary & Methodology */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-blue-950">
                    Executive Summary
                  </h4>
                  <p className="text-slate-700">{report.executive_summary}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-blue-950">
                    Testing Methodology & Edge Verification
                  </h4>
                  <p className="text-slate-700">{report.methodology}</p>
                </div>
              </div>

              {/* Key Findings & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-blue-950">
                    Key Empirical Findings
                  </h4>
                  <p className="text-slate-700">{report.findings}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-blue-950">
                    Policy & Procurement Scale Recommendations
                  </h4>
                  <p className="text-slate-700">{report.recommendations}</p>
                </div>
              </div>

              {/* KPI Breakdown Table */}
              {report.kpi_validations && report.kpi_validations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Line-by-Line KPI Audit Evaluations
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-3">KPI Metric</th>
                          <th className="p-3">Target Value</th>
                          <th className="p-3">Startup Measured</th>
                          <th className="p-3">Validator Measured</th>
                          <th className="p-3">Audit Result</th>
                          <th className="p-3">Achievement %</th>
                          <th className="p-3">Commentary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.kpi_validations.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">
                              {item.kpi_name || item.kpi_id}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {item.kpi_category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700">
                              {item.kpi_target_value != null ? `${item.kpi_target_value} ${item.kpi_unit || ""}` : "—"}
                            </td>
                            <td className="p-3 text-slate-600">
                              {item.startup_measured_value != null
                                ? `${item.startup_measured_value} ${item.kpi_unit || ""}`
                                : "—"}
                            </td>
                            <td className="p-3 font-bold text-blue-900">
                              {item.validator_measured_value != null
                                ? `${item.validator_measured_value} ${item.kpi_unit || ""}`
                                : "—"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  item.result === "ACHIEVED"
                                    ? "success"
                                    : item.result === "PARTIALLY_ACHIEVED"
                                    ? "warning"
                                    : "destructive"
                                }
                                className="text-[10px]"
                              >
                                {item.result}
                              </Badge>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {item.achievement_percentage != null ? `${Math.round(item.achievement_percentage)}%` : "—"}
                            </td>
                            <td className="p-3 text-slate-500 max-w-xs truncate" title={item.validator_commentary}>
                              {item.validator_commentary || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Awaiting Validation Report</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once the assigned validator completes field testing and submits the official report, comprehensive audit analytics will appear here.
              </p>
            </div>
          )}

          {/* Government Success Confirmation Dossier (If already confirmed) */}
          {summary?.success_status !== "NOT_ASSESSED" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Confirmed Government Success Classification
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Final Classification</span>
                  <span className="text-base font-bold text-slate-900">{summary?.success_status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Confirmation Timestamp</span>
                  <span className="font-medium text-slate-800">
                    {summary?.classification_confirmed_at
                      ? new Date(summary.classification_confirmed_at).toLocaleString()
                      : "Recorded"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Validator Initial Rating</span>
                  <span className="font-medium text-slate-800">{summary?.validator_assessment || "N/A"}</span>
                </div>
              </div>

              {summary?.classification_notes && (
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-slate-700">Departmental Decision Notes:</span>
                  <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700">
                    {summary.classification_notes}
                  </p>
                </div>
              )}

              {summary?.classification_divergence_reason && (
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-amber-900 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                    Statutory Divergence Justification:
                  </span>
                  <p className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 font-medium leading-relaxed">
                    {summary.classification_divergence_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Assign Independent Validator */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-900" />
                <h3 className="text-base font-bold text-slate-900">
                  Assign Accredited Independent Validator
                </h3>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignValidator} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Select Accredited Agency / Expert *</label>
                <select
                  value={selectedValidatorId}
                  onChange={(e) => setSelectedValidatorId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                >
                  {validators.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.organization} — {v.user_name || "Lead Auditor"} ({v.accreditations || "Accredited"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Audit Scope</label>
                <textarea
                  rows={2}
                  value={scopeText}
                  onChange={(e) => setScopeText(e.target.value)}
                  placeholder="e.g. Independent verification of technical KPIs, reliability telemetry, and statutory GFR compliance."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Terms of Reference</label>
                <textarea
                  rows={2}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  placeholder="e.g. Review edge logs, inspect field datasets, and produce structured empirical scorecard."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  The assigned agency must accept the nomination and sign a digital Conflict of Interest declaration prior to accessing the raw evidence repository.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assigning} size="sm" className="bg-[#0B2545] text-white">
                  {assigning && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reopen Validation Report */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Request Report Clarification / Revision
                </h3>
              </div>
              <button onClick={() => setIsReopenModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopen} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Clarification Request Justification *</label>
                <textarea
                  rows={4}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Detail the technical ambiguities, sample inconsistencies, or missing edge logs that require the validator's revision (minimum 10 characters)."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsReopenModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={reopening} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  {reopening && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Submit Request to Validator
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Pilot Success Classification */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Pilot Outcome Success Status
                </h3>
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClassification} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-400 block">Independent Validator Assessment:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {report?.overall_assessment || "N/A"}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Achievement: {report?.overall_achievement_percentage != null ? `${Math.round(report.overall_achievement_percentage)}%` : "N/A"}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Departmental Classification Status *</label>
                <select
                  value={targetSuccessStatus}
                  onChange={(e) => setTargetSuccessStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                >
                  <option value="SUCCESSFUL">SUCCESSFUL (Eligible for subsequent procurement)</option>
                  <option value="PARTIALLY_SUCCESSFUL">PARTIALLY_SUCCESSFUL (Conditional / Limited scope)</option>
                  <option value="FAILED">FAILED (Objectives not met)</option>
                </select>
              </div>

              {/* Dynamic Divergence Warning & Mandatory Input */}
              {isDivergenceDetected && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <Scale className="w-4 h-4 text-amber-700" />
                    <span>Statutory Audit Divergence Notice</span>
                  </div>
                  <p className="text-[11px] text-amber-950 leading-relaxed">
                    You have selected <strong>{targetSuccessStatus}</strong> which diverges from the independent validator recommendation of <strong>{report?.overall_assessment}</strong>. Under public procurement transparency rules, a comprehensive justification is mandatory and will be permanently sealed in the audit trail.
                  </p>
                  <div className="space-y-1 pt-1">
                    <label className="font-bold text-amber-900 text-[11px]">
                      Mandatory Divergence Justification * (minimum 10 characters)
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={divergenceReason}
                      onChange={(e) => setDivergenceReason(e.target.value)}
                      placeholder="Explain the departmental or operational grounds for diverging from the independent validator assessment..."
                      className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs focus:ring-2 focus:ring-amber-500 text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Departmental Decision Commentary</label>
                <textarea
                  rows={2}
                  value={classificationNotes}
                  onChange={(e) => setClassificationNotes(e.target.value)}
                  placeholder="Record summary observations, next-stage recommendations, or field notes."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirmModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={confirming} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Officially Confirm Classification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
