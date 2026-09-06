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
  Target,
  FileCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Upload,
  Plus,
  Activity,
  FileText,
  Download,
  Clock,
  ChevronRight,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";

interface KPIData {
  id: string;
  pilot_id: string;
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
  status: string;
  latest_measured_value?: number;
  latest_achievement_percentage?: number;
  latest_measurement_date?: string;
  measurement_count?: number;
  evidence_count?: number;
  measurements?: any[];
  evidence_items?: any[];
}

export default function StartupKPIsPage() {
  const params = useParams();
  const pilotId = params?.id as string;
  const { currentUser } = useAuth();

  const [pilot, setPilot] = useState<any>(null);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Record Measurement Modal
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [selectedKPIId, setSelectedKPIId] = useState("");
  const [measuredValue, setMeasuredValue] = useState("");
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [measureNotes, setMeasureNotes] = useState("");
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Upload Evidence Modal
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceKPIId, setEvidenceKPIId] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceType, setEvidenceType] = useState("DATASET");
  const [sourceDesc, setSourceDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pilotRes, kpisRes] = await Promise.all([
        apiRequest<any>(`/api/v1/pilots/${pilotId}`),
        apiRequest<KPIData[]>(`/api/v1/pilots/${pilotId}/kpis`),
      ]);
      setPilot(pilotRes);
      setKpis(kpisRes);
      if (kpisRes.length > 0) {
        if (!selectedKPIId) setSelectedKPIId(kpisRes[0].id);
        if (!evidenceKPIId) setEvidenceKPIId(kpisRes[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load KPIs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pilotId) {
      loadData();
    }
  }, [pilotId]);

  const handleRecordMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKPIId || measuredValue === "") {
      setError("Please select a KPI and enter the measured value.");
      return;
    }

    try {
      setSavingMeasure(true);
      setError(null);
      await apiRequest(`/api/v1/kpis/${selectedKPIId}/measurements`, {
        method: "POST",
        body: JSON.stringify({
          kpi_id: selectedKPIId,
          measured_value: parseFloat(measuredValue),
          measurement_date: measurementDate || new Date().toISOString().split("T")[0],
          measurement_method: method || "Field telemetry sensor logger",
          sample_size: sampleSize ? parseInt(sampleSize) : null,
          notes: measureNotes || null,
        }),
      });
      setSuccessMsg("Telemetry measurement recorded successfully.");
      setIsMeasureModalOpen(false);
      setMeasuredValue("");
      setMeasureNotes("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to record measurement.");
    } finally {
      setSavingMeasure(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceKPIId || !selectedFile || !evidenceTitle) {
      setError("Please select a file, KPI, and enter an evidence title.");
      return;
    }

    try {
      setUploadingEvidence(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", evidenceTitle);
      if (evidenceDesc) formData.append("description", evidenceDesc);
      formData.append("evidence_type", evidenceType);
      if (sourceDesc) formData.append("source", sourceDesc);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("govinnovate_token");

      const res = await fetch(`${apiUrl}/api/v1/kpis/${evidenceKPIId}/evidence`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to upload evidence.");
      }

      setSuccessMsg("Evidence file uploaded and version-indexed successfully.");
      setIsEvidenceModalOpen(false);
      setEvidenceTitle("");
      setEvidenceDesc("");
      setSelectedFile(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to upload evidence.");
    } finally {
      setUploadingEvidence(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/startup/pilots" className="hover:text-slate-800">
                My Sandbox Pilots
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/startup/pilots/${pilotId}`} className="hover:text-slate-800">
                {pilot?.pilot_code || "Pilot Workspace"}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">KPI Performance & Evidence</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/startup/pilots/${pilotId}/validation`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Independent Validation Status
                </Button>
              </Link>
              <Button
                onClick={() => setIsMeasureModalOpen(true)}
                size="sm"
                className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5 shadow-sm"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                Record Telemetry Reading
              </Button>
              <Button
                onClick={() => setIsEvidenceModalOpen(true)}
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4 text-emerald-200" />
                Upload Evidence Dataset
              </Button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                  <Badge variant="gov" className="text-[10px] bg-blue-100 text-blue-900">
                    Step 7: Startup Telemetry Portal
                  </Badge>
                  <span className="text-xs font-mono text-slate-500">{pilot?.pilot_code}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {pilot?.title || "Pilot Sandbox"} — Operational Telemetry & Outcomes
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Submit empirical measurement readings and upload verifiable datasets, server logs, or third-party test reports for independent audit.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                <div>
                  <span className="text-slate-400 block text-[11px]">Department Validation</span>
                  <span className="font-bold text-slate-800">{pilot?.validation_status?.replace(/_/g, " ") || "NOT STARTED"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Success Classification</span>
                  <span className="font-bold text-slate-800">{pilot?.success_status?.replace(/_/g, " ") || "NOT ASSESSED"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI List Cards */}
          {loading ? (
            <div className="p-16 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
            </div>
          ) : kpis.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Target className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No KPIs Assigned to this Pilot</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The nodal government department has not yet published the target KPI framework for this pilot sandbox.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {kpis.map((kpi) => {
                const target = kpi.target_value;
                const baseline = kpi.baseline_value != null ? kpi.baseline_value : 0;
                const measured = kpi.latest_measured_value != null ? kpi.latest_measured_value : baseline;
                const pct = kpi.latest_achievement_percentage != null ? Math.round(kpi.latest_achievement_percentage) : 0;

                return (
                  <div
                    key={kpi.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-200 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="gov" className="text-[10px]">
                            {kpi.category}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {kpi.measurement_type}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Weight: {kpi.weight}x
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{kpi.name}</h3>
                        {kpi.description && (
                          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                            {kpi.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedKPIId(kpi.id);
                            setIsMeasureModalOpen(true);
                          }}
                          className="text-xs h-8 gap-1 text-blue-900 border-blue-200 bg-blue-50/50"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-700" />
                          Log Reading
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEvidenceKPIId(kpi.id);
                            setIsEvidenceModalOpen(true);
                          }}
                          className="text-xs h-8 gap-1 text-emerald-800 border-emerald-200 bg-emerald-50/50"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          Attach File
                        </Button>
                      </div>
                    </div>

                    {/* Numerical telemetry breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Baseline Value</span>
                        <span className="font-semibold text-slate-800">
                          {kpi.baseline_value != null ? `${kpi.baseline_value} ${kpi.unit}` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Required Statutory Target</span>
                        <span className="font-bold text-slate-900">
                          {kpi.target_operator} {kpi.target_value} {kpi.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Latest Recorded Telemetry</span>
                        <span className="font-extrabold text-blue-900">
                          {kpi.latest_measured_value != null ? `${kpi.latest_measured_value} ${kpi.unit}` : "No reading yet"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Normalized Goal Progress</span>
                        <span className="font-extrabold text-emerald-700">{pct}% Achieved</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Criterion: {kpi.target_operator} {kpi.target_value} ({kpi.direction.replace(/_/g, " ")})</span>
                        <span>{pct}% target achievement</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            pct >= 100 ? "bg-emerald-600" : pct >= 50 ? "bg-blue-600" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>
                    </div>

                    {/* Telemetry & Evidence Count Footnotes */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-700" />
                          {kpi.measurement_count || 0} Telemetry Points Submitted
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          {kpi.evidence_count || 0} Verifiable Documents Attached
                        </span>
                      </div>
                      {kpi.latest_measurement_date && (
                        <span className="text-[11px] text-slate-400">
                          Last field reading: {new Date(kpi.latest_measurement_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Record Telemetry Reading */}
      {isMeasureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-900" />
                <h3 className="text-base font-bold text-slate-900">
                  Record Telemetry Reading
                </h3>
              </div>
              <button onClick={() => setIsMeasureModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordMeasurement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Select Target KPI *</label>
                <select
                  value={selectedKPIId}
                  onChange={(e) => setSelectedKPIId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                >
                  {kpis.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.category} — Target: {k.target_operator} {k.target_value} {k.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Measured Telemetry Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 13.8"
                    value={measuredValue}
                    onChange={(e) => setMeasuredValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Measurement Timestamp</label>
                  <input
                    type="date"
                    value={measurementDate}
                    onChange={(e) => setMeasurementDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Telemetry Method</label>
                  <input
                    type="text"
                    placeholder="e.g. Edge Server Real-Time Log Batch"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Sample Population Size</label>
                  <input
                    type="number"
                    placeholder="e.g. 1200 patients / transactions"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Field Notes / Observations</label>
                <textarea
                  rows={2}
                  placeholder="Record edge environmental conditions, hardware battery state, network stability, or test bench anomalies."
                  value={measureNotes}
                  onChange={(e) => setMeasureNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMeasureModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingMeasure} size="sm" className="bg-[#0B2545] text-white">
                  {savingMeasure && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Submit Reading
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Evidence Dataset */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Upload Verifiable Evidence Dataset
                </h3>
              </div>
              <button onClick={() => setIsEvidenceModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadEvidence} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Target KPI Metric *</label>
                <select
                  value={evidenceKPIId}
                  onChange={(e) => setEvidenceKPIId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                >
                  {kpis.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alwar PHC Batch 4 Diagnostic Concordance Logs"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
                <span className="text-[10px] text-slate-400 block">
                  Uploading an existing title will automatically increment the version tag (e.g. v2, v3).
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Evidence Classification *</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="DATASET">DATASET (CSV, JSON raw records)</option>
                    <option value="LOGS">LOGS (Server, edge hardware telemetry)</option>
                    <option value="AUDIT_REPORT">AUDIT_REPORT (Third-party lab sign-off)</option>
                    <option value="USER_STUDY">USER_STUDY (Field officer survey feedback)</option>
                    <option value="BENCHMARK_RESULT">BENCHMARK_RESULT (Automated test suite)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Data Source</label>
                  <input
                    type="text"
                    placeholder="e.g. PHC Edge Node Cluster #4"
                    value={sourceDesc}
                    onChange={(e) => setSourceDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Evidence File Attachment *</label>
                <input
                  type="file"
                  required
                  accept=".csv,.json,.txt,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.zip"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                />
                <span className="text-[10px] text-slate-400 block">
                  Accepted formats: CSV, JSON, TXT, PDF, DOCX, XLSX, PNG, JPG, ZIP (max 20MB)
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Description & Context</label>
                <textarea
                  rows={2}
                  placeholder="Provide context regarding sample extraction, data schema, anonymization protocols, or hash integrity."
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEvidenceModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadingEvidence} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  {uploadingEvidence && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Upload Evidence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
