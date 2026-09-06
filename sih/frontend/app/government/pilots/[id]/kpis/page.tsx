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
  Plus,
  Target,
  FileCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Activity,
  Edit2,
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

interface PilotHeader {
  id: string;
  pilot_code: string;
  title: string;
  status: string;
  validation_status: string;
  success_status: string;
  pilot_budget: number;
  department_name?: string;
  startup_name?: string;
}

export default function GovernmentKPIsPage() {
  const params = useParams();
  const pilotId = params?.id as string;
  const { currentUser } = useAuth();

  const [pilot, setPilot] = useState<PilotHeader | null>(null);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPIData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TECHNICAL");
  const [measurementType, setMeasurementType] = useState("QUANTITATIVE");
  const [unit, setUnit] = useState("%");
  const [baselineValue, setBaselineValue] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>("");
  const [targetOperator, setTargetOperator] = useState("GTE");
  const [direction, setDirection] = useState("HIGHER_IS_BETTER");
  const [weight, setWeight] = useState("1.0");

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
    } catch (err: any) {
      setError(err?.message || "Failed to load pilot KPIs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pilotId) {
      loadData();
    }
  }, [pilotId]);

  const openCreateModal = () => {
    setEditingKPI(null);
    setName("");
    setDescription("");
    setCategory("TECHNICAL");
    setMeasurementType("QUANTITATIVE");
    setUnit("%");
    setBaselineValue("");
    setTargetValue("");
    setTargetOperator("GTE");
    setDirection("HIGHER_IS_BETTER");
    setWeight("1.0");
    setIsModalOpen(true);
  };

  const openEditModal = (kpi: KPIData) => {
    setEditingKPI(kpi);
    setName(kpi.name);
    setDescription(kpi.description || "");
    setCategory(kpi.category);
    setMeasurementType(kpi.measurement_type);
    setUnit(kpi.unit);
    setBaselineValue(kpi.baseline_value != null ? String(kpi.baseline_value) : "");
    setTargetValue(String(kpi.target_value));
    setTargetOperator(kpi.target_operator);
    setDirection(kpi.direction);
    setWeight(String(kpi.weight || 1.0));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetValue || !unit) {
      setError("Please fill all required fields (Name, Unit, Target Value).");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        name,
        description: description || null,
        category,
        measurement_type: measurementType,
        unit,
        baseline_value: baselineValue !== "" ? parseFloat(baselineValue) : null,
        target_value: parseFloat(targetValue),
        target_operator: targetOperator,
        direction,
        weight: parseFloat(weight) || 1.0,
      };

      if (editingKPI) {
        await apiRequest(`/api/v1/kpis/${editingKPI.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("KPI updated successfully.");
      } else {
        await apiRequest(`/api/v1/pilots/${pilotId}/kpis`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMsg("New KPI successfully defined for pilot.");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to save KPI.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kpiId: string) => {
    if (!confirm("Are you sure you want to delete this KPI?")) return;
    try {
      await apiRequest(`/api/v1/kpis/${kpiId}`, { method: "DELETE" });
      setSuccessMsg("KPI removed.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete KPI.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACHIEVED":
        return <Badge variant="success">Achieved</Badge>;
      case "PARTIALLY_ACHIEVED":
        return <Badge variant="warning">Partially Achieved</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "ACTIVE":
        return <Badge variant="gov">Active Tracking</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumbs & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/government/pilots" className="hover:text-slate-800">
                Pilots
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href={`/government/pilots/${pilotId}`} className="hover:text-slate-800">
                {pilot?.pilot_code || "Pilot Dossier"}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">KPI Targets & Telemetry</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/government/pilots/${pilotId}/validation`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Independent Validation Portal
                </Button>
              </Link>
              <Button onClick={openCreateModal} size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5 shadow-sm">
                <Plus className="w-4 h-4 text-amber-400" />
                Define New KPI
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

          {/* Header Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="gov" className="text-[10px] bg-blue-100 text-blue-900">
                    Step 7: KPI Measurement
                  </Badge>
                  <span className="text-xs font-mono text-slate-500">{pilot?.pilot_code}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {pilot?.title || "Pilot Sandbox"} — KPI Performance Framework
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Formal target specification, quantitative telemetry monitoring, and empirical evidence repository.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                <div>
                  <span className="text-slate-400 block text-[11px]">Validation Status</span>
                  <span className="font-bold text-slate-800">{pilot?.validation_status?.replace(/_/g, " ") || "NOT STARTED"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Success Classification</span>
                  <span className="font-bold text-slate-800">{pilot?.success_status?.replace(/_/g, " ") || "NOT ASSESSED"}</span>
                </div>
              </div>
            </div>

            {/* Metrics quick overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Total KPIs Defined</span>
                <span className="text-lg font-bold text-slate-900">{kpis.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Active Tracking</span>
                <span className="text-lg font-bold text-blue-900">
                  {kpis.filter((k) => k.status === "ACTIVE").length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Achieved Goals</span>
                <span className="text-lg font-bold text-emerald-700">
                  {kpis.filter((k) => k.status === "ACHIEVED").length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Total Evidence Files</span>
                <span className="text-lg font-bold text-indigo-700">
                  {kpis.reduce((acc, k) => acc + (k.evidence_count || 0), 0)}
                </span>
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
              <h3 className="text-sm font-bold text-slate-700">No KPIs Defined Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Define the quantitative outcome metrics against which the startup will submit telemetry and independent validators will audit the sandbox.
              </p>
              <Button onClick={openCreateModal} size="sm" className="bg-[#0B2545] text-white text-xs gap-1.5">
                <Plus className="w-4 h-4 text-amber-400" />
                Add First KPI
              </Button>
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

                      <div className="flex items-center gap-3">
                        {getStatusBadge(kpi.status)}
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(kpi)}
                            className="text-xs h-8 px-2.5 text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(kpi.id)}
                            className="text-xs h-8 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
                        <span className="text-slate-400 block text-[11px]">Target Criterion</span>
                        <span className="font-bold text-slate-900">
                          {kpi.target_operator} {kpi.target_value} {kpi.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Startup Latest Measured</span>
                        <span className="font-extrabold text-blue-900">
                          {kpi.latest_measured_value != null ? `${kpi.latest_measured_value} ${kpi.unit}` : "Pending input"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Progress / Goal</span>
                        <span className="font-extrabold text-emerald-700">{pct}% Achieved</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Direction: {kpi.direction.replace(/_/g, " ")}</span>
                        <span>{pct}% target normalized achievement</span>
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

                    {/* Metadata & Evidence count */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-700" />
                          {kpi.measurement_count || 0} Telemetry Readings
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          {kpi.evidence_count || 0} Evidence Documents
                        </span>
                      </div>
                      {kpi.latest_measurement_date && (
                        <span className="text-[11px] text-slate-400">
                          Last reading logged: {new Date(kpi.latest_measurement_date).toLocaleDateString()}
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

      {/* Modal for Add / Edit KPI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-900" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingKPI ? "Edit Pilot KPI" : "Define New Pilot KPI"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">KPI Title / Metric Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diagnostic Sensitivity Concordance Rate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="TECHNICAL">TECHNICAL (Algorithmic / Engineering)</option>
                    <option value="OPERATIONAL">OPERATIONAL (Throughput / Latency)</option>
                    <option value="FINANCIAL">FINANCIAL (Cost Savings / ROI)</option>
                    <option value="QUALITY">QUALITY (Error Rate / Standards)</option>
                    <option value="IMPACT">IMPACT (Public Sector Outcomes)</option>
                    <option value="COMPLIANCE">COMPLIANCE (Statutory / Cyber)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Measurement Type *</label>
                  <select
                    value={measurementType}
                    onChange={(e) => setMeasurementType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="QUANTITATIVE">QUANTITATIVE (Numeric Value)</option>
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="TIME_DURATION">TIME_DURATION (Minutes / Seconds)</option>
                    <option value="CURRENCY">CURRENCY (₹ INR)</option>
                    <option value="RATIO">RATIO (Score)</option>
                    <option value="BOOLEAN">BOOLEAN (Pass / Fail)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Unit of Metric *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. %, ms, min, patients/day"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Baseline (Pre-Pilot)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 45"
                    value={baselineValue}
                    onChange={(e) => setBaselineValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Target Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 90"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Target Operator</label>
                  <select
                    value={targetOperator}
                    onChange={(e) => setTargetOperator(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="GTE">&ge; (Greater than or equal)</option>
                    <option value="LTE">&le; (Less than or equal)</option>
                    <option value="EQ">= (Exact match)</option>
                    <option value="GT">&gt; (Strictly greater)</option>
                    <option value="LT">&lt; (Strictly less)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Optimization Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="HIGHER_IS_BETTER">HIGHER_IS_BETTER</option>
                    <option value="LOWER_IS_BETTER">LOWER_IS_BETTER (e.g. latency)</option>
                    <option value="CLOSER_TO_TARGET">CLOSER_TO_TARGET</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Weight Multiplier (0.1 - 10.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Methodology & Verification Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Specify sampling methodology, test scripts, independent validator audit expectations, or sensor logs required."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="sm"
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingKPI ? "Update KPI" : "Create KPI"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
