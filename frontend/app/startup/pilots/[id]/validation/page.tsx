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
  AlertCircle,
  FileText,
  Building2,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function StartupValidationStatusPage() {
  const params = useParams();
  const pilotId = params?.id as string;
  const { currentUser } = useAuth();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const res = await apiRequest<any>(`/api/v1/government/pilots/${pilotId}/validation-summary`);
        setSummary(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load validation status.");
      } finally {
        setLoading(false);
      }
    }
    if (pilotId) {
      loadSummary();
    }
  }, [pilotId]);

  const report = summary?.submitted_report;

  const downloadPDF = async () => {
    if (!report?.id) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("govinnovate_token");
      const res = await fetch(`${apiUrl}/api/v1/government/reports/${report.id}/pdf`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) throw new Error("Failed to download PDF report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Validation_Report_${summary?.pilot_code || "Pilot"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Error downloading PDF.");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/startup/pilots" className="hover:text-slate-800">
                My Sandbox Pilots
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/startup/pilots/${pilotId}`} className="hover:text-slate-800">
                {summary?.pilot_code || "Pilot Workspace"}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">Validation Dossier</span>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/startup/pilots/${pilotId}/kpis`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200">
                  <FileText className="w-3.5 h-3.5 text-blue-900" />
                  Telemetry & Evidence
                </Button>
              </Link>
              {report && (
                <Button
                  onClick={downloadPDF}
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-slate-300 text-slate-800 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  Official Report (PDF)
                </Button>
              )}
            </div>
          </div>

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
                  {summary?.pilot_title || "Sandbox Pilot"} — Third-Party Outcome Certification
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Empirical verification conducted by empanelled research institutions and accredited testing authorities.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Final Status</span>
                <Badge
                  variant={
                    summary?.success_status === "SUCCESSFUL"
                      ? "success"
                      : summary?.success_status === "PARTIALLY_SUCCESSFUL"
                      ? "warning"
                      : summary?.success_status === "FAILED"
                      ? "destructive"
                      : "gov"
                  }
                  className="text-xs font-bold"
                >
                  {summary?.success_status?.replace(/_/g, " ") || "UNDER ASSESSMENT"}
                </Badge>
              </div>
            </div>

            {/* Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-xs">
              {[
                { label: "1. Telemetry Logged", done: summary?.kpi_count > 0 },
                { label: "2. Validator Assigned", done: !!summary?.assigned_validator },
                { label: "3. Independent Audit", done: !!summary?.submitted_report },
                { label: "4. Success Classified", done: summary?.success_status !== "NOT_ASSESSED" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    step.done
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step.done ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {step.done ? "✓" : idx + 1}
                  </div>
                  <span className="font-semibold truncate">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Agency Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              Independent Verification Authority
            </h3>

            {summary?.assigned_validator ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {summary.assigned_validator.organization}
                  </span>
                  <Badge variant="gov" className="text-[10px]">
                    {summary.assigned_validator.status}
                  </Badge>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Empanelled testing authority conducting blind sampling, reliability load tests, and GFR statutory concordance checks against defined KPI criteria.
                </p>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                Awaiting validator nomination by the nodal department.
              </div>
            )}
          </div>

          {/* Report Findings Card */}
          {report ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Empirical Audit Findings & Certification
                </h3>
                <Badge
                  variant={
                    report.overall_assessment === "SUCCESSFUL"
                      ? "success"
                      : report.overall_assessment === "PARTIALLY_SUCCESSFUL"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {report.overall_assessment}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Overall Achievement</span>
                  <span className="text-xl font-bold text-blue-900">
                    {report.overall_achievement_percentage != null
                      ? `${Math.round(report.overall_achievement_percentage)}%`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">KPIs Met</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {report.kpis_achieved_count} / {report.kpis_total_count}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Audit Confidence</span>
                  <span className="font-semibold text-slate-800 block mt-1">{report.confidence_level}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-blue-950">
                    Executive Summary
                  </h4>
                  <p className="text-slate-700">{report.executive_summary}</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-blue-950">
                    Field Recommendations
                  </h4>
                  <p className="text-slate-700">{report.recommendations}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Audit in Progress</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The independent validator is auditing submitted evidence and field data. The full report will be published here upon government review.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
