"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcurementTraceability } from "@/components/procurement/ProcurementTraceability";
import {
  TrendingUp,
  Building2,
  Rocket,
  Scale,
  MapPin,
  FileCheck2,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Plus,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  Lightbulb,
  FileText,
  UserCheck,
  Check,
} from "lucide-react";

export default function GovernmentScalePlanDetailPage() {
  const params = useParams();
  const planId = params.id as string;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ScalePlanDetailContent planId={planId} />
    </ProtectedRoute>
  );
}

function ScalePlanDetailContent({ planId }: { planId: string }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<any>(null);
  const [readiness, setReadiness] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [replications, setReplications] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [traceability, setTraceability] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<
    | "readiness"
    | "phases"
    | "targets"
    | "replications"
    | "deployments"
    | "impact"
    | "outcome"
    | "risks"
    | "lessons"
  >("readiness");

  // Modals state
  const [signOffModal, setSignOffModal] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [signOffStatus, setSignOffStatus] = useState("COMPLETED");
  const [signOffNotes, setSignOffNotes] = useState("");

  const [phaseModal, setPhaseModal] = useState(false);
  const [phaseData, setPhaseData] = useState({
    phase_number: 1,
    phase_name: "",
    target_geography: "",
    allocated_budget: 1000000,
    start_date: "2026-04-01",
    end_date: "2026-09-30",
  });

  const [targetModal, setTargetModal] = useState(false);
  const [targetData, setTargetData] = useState({
    site_name: "",
    district: "",
    state: "Rajasthan",
    target_tier: "TIER_2",
    target_metric_units: 50,
    allocated_budget: 500000,
  });

  const [replicationModal, setReplicationModal] = useState(false);
  const [replicationData, setReplicationData] = useState({
    adopting_department: "",
    target_jurisdiction: "",
    adaptation_notes: "",
    local_constraints: "",
  });

  const [metricModal, setMetricModal] = useState(false);
  const [metricData, setMetricData] = useState({
    metric_name: "",
    category: "ECONOMIC_SAVINGS",
    unit_of_measure: "INR",
    baseline_value: 0,
    target_value: 100,
    weight_percentage: 25,
    is_critical_kpi: false,
    direction: "HIGHER_IS_BETTER",
  });

  const [riskModal, setRiskModal] = useState(false);
  const [riskData, setRiskData] = useState({
    risk_title: "",
    risk_category: "OPERATIONAL",
    severity: "MEDIUM",
    likelihood: "MEDIUM",
    mitigation_strategy: "",
  });

  const [lessonModal, setLessonModal] = useState(false);
  const [lessonData, setLessonData] = useState({
    title: "",
    category: "OPERATIONAL",
    what_worked: "",
    what_failed: "",
    recommendation: "",
  });

  const [outcomeJustification, setOutcomeJustification] = useState("");

  useEffect(() => {
    loadAllData();
  }, [planId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        planRes,
        readinessRes,
        targetsRes,
        phasesRes,
        replicationsRes,
        deploymentsRes,
        metricsRes,
        measurementsRes,
        outcomeRes,
        risksRes,
        lessonsRes,
        traceRes,
      ] = await Promise.all([
        apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}`),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/readiness`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/targets`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/phases`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/replications`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/deployments`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/metrics`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/measurements`).catch(() => []),
        apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/outcome`).catch(() => null),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/risks`).catch(() => []),
        apiRequest<any[]>(`/api/v1/government/scale-up/plans/${planId}/lessons`).catch(() => []),
        apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/traceability`).catch(() => null),
      ]);

      setPlan(planRes);
      setReadiness(readinessRes || []);
      setTargets(targetsRes || []);
      setPhases(phasesRes || []);
      setReplications(replicationsRes || []);
      setDeployments(deploymentsRes || []);
      setMetrics(metricsRes || []);
      setMeasurements(measurementsRes || []);
      setOutcome(outcomeRes);
      setRisks(risksRes || []);
      setLessons(lessonsRes || []);
      setTraceability(traceRes);

      if (phasesRes && phasesRes.length > 0) {
        setPhaseData((prev) => ({ ...prev, phase_number: phasesRes.length + 1 }));
      }
    } catch (err) {
      console.error("Failed to load scale plan data", err);
    } finally {
      setLoading(false);
    }
  };

  // Readiness Checklist Gate check
  const mandatoryItems = readiness.filter((r) => r.is_mandatory);
  const pendingOrBlockedMandatory = mandatoryItems.filter(
    (r) => r.status === "PENDING" || r.status === "BLOCKED"
  );
  const isReadinessGatePassed = mandatoryItems.length > 0 && pendingOrBlockedMandatory.length === 0;

  // Activation Action
  const handleActivatePlan = async () => {
    try {
      setActionLoading(true);
      setMessage(null);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/activate`, {
        method: "POST",
      });
      setMessage({ text: "Scale Plan successfully ACTIVATED for multi-site rollout!", type: "success" });
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to activate scale plan.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Sign off readiness check
  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signOffModal.item) return;
    try {
      setActionLoading(true);
      await apiRequest<any>(
        `/api/v1/government/scale-up/plans/${planId}/readiness/${signOffModal.item.id}/sign-off`,
        {
          method: "POST",
          body: JSON.stringify({
            status: signOffStatus,
            notes: signOffNotes,
            signed_off_by_name: currentUser?.full_name || "Authorized Officer",
            signed_off_by_role: currentUser?.role || "GOVERNMENT",
          }),
        }
      );
      setMessage({ text: `Readiness check '${signOffModal.item.check_name}' updated.`, type: "success" });
      setSignOffModal({ open: false, item: null });
      setSignOffNotes("");
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update readiness check.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Phase
  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/phases`, {
        method: "POST",
        body: JSON.stringify(phaseData),
      });
      setMessage({ text: `Phase ${phaseData.phase_number} added successfully!`, type: "success" });
      setPhaseModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to add phase.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Target
  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/targets`, {
        method: "POST",
        body: JSON.stringify(targetData),
      });
      setMessage({ text: `Target site '${targetData.site_name}' added!`, type: "success" });
      setTargetModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to add target site.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Replication
  const handleCreateReplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/replications`, {
        method: "POST",
        body: JSON.stringify(replicationData),
      });
      setMessage({ text: `Replication initiative registered for ${replicationData.adopting_department}!`, type: "success" });
      setReplicationModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to initiate replication.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Metric
  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/metrics`, {
        method: "POST",
        body: JSON.stringify(metricData),
      });
      setMessage({ text: `Impact Metric '${metricData.metric_name}' defined!`, type: "success" });
      setMetricModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to add impact metric.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Outcome
  const handleConfirmOutcome = async (finalOutcome: string) => {
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/outcome`, {
        method: "POST",
        body: JSON.stringify({
          confirmed_outcome: finalOutcome,
          divergence_justification: outcomeJustification,
        }),
      });
      setMessage({ text: `Scale outcome confirmed as ${finalOutcome}.`, type: "success" });
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to confirm outcome.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Risk
  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/risks`, {
        method: "POST",
        body: JSON.stringify(riskData),
      });
      setMessage({ text: `Risk logged in register.`, type: "success" });
      setRiskModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to log risk.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Lesson
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiRequest<any>(`/api/v1/government/scale-up/plans/${planId}/lessons`, {
        method: "POST",
        body: JSON.stringify(lessonData),
      });
      setMessage({ text: `Institutional lesson recorded!`, type: "success" });
      setLessonModal(false);
      await loadAllData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record lesson.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#0B2545] animate-spin mx-auto mb-4" />
          <h2 className="text-base font-semibold text-slate-800">Loading Scale-Up Operations Plan...</h2>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Scale Plan Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            The scale plan with ID {planId} could not be retrieved or you lack department permissions.
          </p>
          <Link href="/government/scale-up" className="inline-block mt-4">
            <Button size="sm" className="bg-[#0B2545] text-white text-xs">
              Return to Scale-Up Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/government/scale-up"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B2545] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Scale-Up Hub
          </Link>

          <div className="flex items-center gap-2">
            {plan.status === "IN_PREPARATION" && (
              <Button
                onClick={handleActivatePlan}
                disabled={!isReadinessGatePassed || actionLoading}
                className={
                  isReadinessGatePassed
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed text-xs gap-1.5"
                }
                title={
                  !isReadinessGatePassed
                    ? "Cannot activate: Mandatory readiness items are still PENDING or BLOCKED"
                    : "Activate Scale Plan"
                }
              >
                {isReadinessGatePassed ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Activate Scale-Up Rollout
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Activation Gate Locked
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={actionLoading}
              className="border-slate-200 h-8 w-8 p-0"
              title="Refresh Plan"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: Plan Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                  {plan.scale_plan_code}
                </span>
                <Badge
                  variant={
                    plan.status === "ACTIVE_ROLLOUT"
                      ? "success"
                      : plan.status === "COMPLETED"
                      ? "outline"
                      : "default"
                  }
                  className="text-[10px]"
                >
                  {plan.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-slate-50">
                  {plan.target_scale_type?.replace(/_/g, " ")}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {plan.plan_title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                {plan.executive_summary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block">Lead Department</span>
                  <span className="font-semibold text-slate-800">{plan.lead_department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Startup Partner</span>
                  <span className="font-semibold text-slate-800">{plan.startup_name || `Startup #${plan.startup_id}`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Approved Budget</span>
                  <span className="font-semibold text-slate-900">
                    ₹{((plan.approved_scale_budget || 0) / 100000).toFixed(2)} Lakh
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Spent / Disbursed</span>
                  <span className="font-semibold text-slate-900">
                    ₹{((plan.disbursed_budget || 0) / 100000).toFixed(2)} Lakh
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Health Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 w-full md:w-64 space-y-3 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Rollout Health
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Phases Complete:</span>
                <span className="font-bold text-slate-900">
                  {phases.filter((p) => p.status === "COMPLETED").length} / {phases.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Sites Operational:</span>
                <span className="font-bold text-emerald-700">
                  {targets.filter((t) => t.status === "OPERATIONAL").length} / {targets.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Readiness Gate:</span>
                <span
                  className={`font-bold ${
                    isReadinessGatePassed ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {isReadinessGatePassed ? "CERTIFIED" : `${pendingOrBlockedMandatory.length} PENDING`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Extended 13-Stage Audit Lineage */}
        {traceability && (
          <ProcurementTraceability
            stages={traceability.stages}
            currentStageId="SCALE_PLAN"
            title="Extended 13-Stage Innovation Lineage: Step 1 (Challenge) to Step 9 (Scale-Up & Impact)"
          />
        )}

        {/* Navigation Tabs for 9 Detailed Management Areas */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
          {[
            { id: "readiness", label: "1. Readiness Checklist Gate", count: readiness.length },
            { id: "phases", label: "2. Multi-Phase Roadmap", count: phases.length },
            { id: "targets", label: "3. Deployment Sites", count: targets.length },
            { id: "replications", label: "4. Replications", count: replications.length },
            { id: "deployments", label: "5. Startup Logs", count: deployments.length },
            { id: "impact", label: "6. Impact Framework", count: metrics.length },
            { id: "outcome", label: "7. Outcome & Audit", count: outcome ? 1 : 0 },
            { id: "risks", label: "8. Risk Register", count: risks.length },
            { id: "lessons", label: "9. Lessons Learned", count: lessons.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? "bg-[#0B2545] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* TAB 1: Mandatory Readiness Checklist Gate */}
        {activeTab === "readiness" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Mandatory Pre-Scale Readiness Checklist Gate
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Rule-based institutional gateway. Every mandatory check must be certified or marked
                    NOT APPLICABLE before public scale-up activation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isReadinessGatePassed ? "success" : "destructive"}
                    className="text-xs px-2.5 py-1"
                  >
                    {isReadinessGatePassed
                      ? "GATEWAY CLEARED"
                      : `${pendingOrBlockedMandatory.length} MANDATORY CHECKS BLOCKED/PENDING`}
                  </Badge>
                </div>
              </div>

              {!isReadinessGatePassed && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Activation Guard Active:</span> This Scale Plan cannot be
                    activated until all {mandatoryItems.length} statutory checklist items (Technical,
                    Security, GFR 2017 alignment, Financial, Capacity) have been signed off by the
                    appropriate authorities.
                  </div>
                </div>
              )}

              <div className="mt-6 divide-y divide-slate-100">
                {readiness.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {item.check_name}
                        </span>
                        {item.is_mandatory && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1">
                            Mandatory
                          </Badge>
                        )}
                        <Badge
                          variant={
                            item.status === "COMPLETED"
                              ? "success"
                              : item.status === "BLOCKED"
                              ? "destructive"
                              : item.status === "NOT_APPLICABLE"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[9px] py-0"
                        >
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                      {item.signed_off_by_name && (
                        <p className="text-[11px] text-slate-400">
                          Certified by: {item.signed_off_by_name} ({item.signed_off_by_role}) •{" "}
                          {item.signed_off_at?.substring(0, 10)}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded-md mt-1">
                          Notes: {item.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSignOffModal({ open: true, item })}
                      className="text-xs shrink-0 self-start sm:self-auto"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Certify / Update
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Multi-Phase Rollout Roadmap */}
        {activeTab === "phases" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multi-Phase Rollout Roadmap</h3>
                  <p className="text-xs text-slate-500">
                    Phased geographic and functional expansion. Each phase operates under an explicit budget ceiling.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPhaseModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rollout Phase
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {phases.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No phases defined yet.</p>
                ) : (
                  phases.map((ph) => (
                    <div
                      key={ph.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold">
                            {ph.phase_number}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{ph.phase_name}</h4>
                          <Badge
                            variant={
                              ph.status === "ACTIVE"
                                ? "success"
                                : ph.status === "COMPLETED"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-[9px]"
                          >
                            {ph.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>Target Geography:</strong> {ph.target_geography}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            Allocated Budget: ₹{((ph.allocated_budget || 0) / 100000).toFixed(2)} Lakh
                          </span>
                          <span>•</span>
                          <span>
                            Window: {ph.start_date?.substring(0, 10)} to {ph.end_date?.substring(0, 10)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-48 text-right">
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Phase Progress</span>
                          <span className="font-bold text-slate-900">{ph.progress_percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ph.progress_percentage || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Deployment Sites */}
        {activeTab === "targets" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Target Deployment Sites</h3>
                  <p className="text-xs text-slate-500">
                    Granular tracking across districts, municipalities, health centers, and public facilities.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setTargetModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Target Site
                </Button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Site / Facility</th>
                      <th className="px-4 py-3">District & State</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Target vs Achieved</th>
                      <th className="px-4 py-3">Allocated Budget</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No deployment targets registered.
                        </td>
                      </tr>
                    ) : (
                      targets.map((tg) => (
                        <tr key={tg.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{tg.site_name}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {tg.district}, {tg.state}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                              {tg.target_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {tg.achieved_metric_units || 0} / {tg.target_metric_units} units
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            ₹{((tg.allocated_budget || 0) / 100000).toFixed(2)} Lakh
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                tg.status === "OPERATIONAL"
                                  ? "success"
                                  : tg.status === "DEPLOYING"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {tg.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Cross-Department Replications */}
        {activeTab === "replications" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cross-Department Replication Pipelines</h3>
                  <p className="text-xs text-slate-500">
                    Framework for peer ministries and state bodies to adopt this proven innovation with context adaptations.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setReplicationModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Initiate Peer Replication
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {replications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No replications initiated yet.</p>
                ) : (
                  replications.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            {rep.adopting_department}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            ({rep.target_jurisdiction})
                          </span>
                        </div>
                        <Badge variant="default" className="text-[10px]">
                          {rep.status}
                        </Badge>
                      </div>

                      {rep.adaptation_notes && (
                        <p className="text-xs text-slate-600">
                          <strong>Adaptation Requirements:</strong> {rep.adaptation_notes}
                        </p>
                      )}
                      {rep.local_constraints && (
                        <p className="text-xs text-slate-500">
                          <strong>Local Constraints:</strong> {rep.local_constraints}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Startup Deployment Logs */}
        {activeTab === "deployments" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Startup Site Deployment Updates</h3>
                <p className="text-xs text-slate-500">
                  Real-time telemetry and milestone updates submitted by the partner startup across rollout locations.
                </p>
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                {deployments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No deployment updates logged yet.</p>
                ) : (
                  deployments.map((dep) => (
                    <div key={dep.id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-xs text-slate-900">
                            Target Site #{dep.target_id}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {dep.deployment_status}
                          </Badge>
                          {dep.is_government_reviewed ? (
                            <Badge variant="success" className="text-[9px]">
                              Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[9px]">
                              Pending Review
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {dep.created_at?.substring(0, 10)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700">{dep.work_completed_summary}</p>

                      {dep.blockers_faced && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-800">
                          <strong>Blocker Reported:</strong> {dep.blockers_faced}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Impact Framework & KPI Tracking */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Impact Framework & KPI Measurement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rigorous quantitative indicators across economic savings, operational efficiency, and social benefit.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setMetricModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Define Impact Metric
                </Button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Metric Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Baseline</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Achieved</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">Normalized Score</th>
                      <th className="px-4 py-3">Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No impact metrics configured.
                        </td>
                      </tr>
                    ) : (
                      metrics.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{m.metric_name}</td>
                          <td className="px-4 py-3 text-slate-600">{m.category?.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3">
                            {m.baseline_value} {m.unit_of_measure}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {m.target_value} {m.unit_of_measure}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            {m.achieved_value || 0} {m.unit_of_measure}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">{m.weight_percentage}%</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">
                              {m.normalized_score != null ? m.normalized_score.toFixed(1) : "—"} / 100
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {m.is_critical_kpi ? (
                              <Badge variant="destructive" className="text-[9px]">
                                Critical KPI
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px]">
                                Standard
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Outcome Recommendation & Statutory Audit */}
        {activeTab === "outcome" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Algorithmic Impact Scoring & Recommendation Engine
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Objective, evidence-based scale scoring. Outcome is deterministically computed from
                  normalized metric values and critical KPI gates.
                </p>
              </div>

              {outcome ? (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Composite Score
                      </span>
                      <div className="text-3xl font-extrabold text-slate-900 mt-1">
                        {outcome.composite_impact_score != null
                          ? outcome.composite_impact_score.toFixed(1)
                          : "—"}
                        <span className="text-sm font-normal text-slate-400"> / 100</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Algorithmic Recommendation
                      </span>
                      <div className="mt-2">
                        <Badge
                          variant={
                            outcome.algorithmic_recommendation === "SUCCESSFUL"
                              ? "success"
                              : "default"
                          }
                          className="text-xs px-3 py-1 font-bold"
                        >
                          {outcome.algorithmic_recommendation}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Confirmed Outcome
                      </span>
                      <div className="mt-2">
                        {outcome.confirmed_outcome ? (
                          <Badge variant="success" className="text-xs px-3 py-1 font-bold">
                            {outcome.confirmed_outcome}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-3 py-1">
                            Awaiting Confirmation
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Section */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Statutory Government Confirmation
                    </h4>
                    <p className="text-xs text-slate-600">
                      The competent authority must review the algorithmic evaluation and confirm the final outcome.
                      If the department decision diverges from the algorithm, GFR 2017 requires mandatory written justification.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Divergence Justification (Required only if overriding algorithm)
                      </label>
                      <textarea
                        rows={3}
                        value={outcomeJustification}
                        onChange={(e) => setOutcomeJustification(e.target.value)}
                        placeholder="State legal, operational, or strategic grounds for divergence..."
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleConfirmOutcome("SUCCESSFUL")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Confirm SUCCESSFUL
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleConfirmOutcome("PARTIALLY_SUCCESSFUL")}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        Confirm PARTIALLY SUCCESSFUL
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleConfirmOutcome("UNSUCCESSFUL")}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                      >
                        Confirm UNSUCCESSFUL
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Impact measurements must be submitted before algorithmic scoring can run.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: Risk Register */}
        {activeTab === "risks" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Scale-Up Risk Register</h3>
                  <p className="text-xs text-slate-500">
                    Proactive mitigation for multi-site deployment, technical debt, and institutional inertia.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setRiskModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Scale Risk
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {risks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No scale risks identified.</p>
                ) : (
                  risks.map((rk) => (
                    <div
                      key={rk.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-bold text-slate-900">{rk.risk_title}</h4>
                          <Badge variant="outline" className="text-[9px]">
                            {rk.risk_category}
                          </Badge>
                        </div>
                        <Badge
                          variant={
                            rk.severity === "CRITICAL" || rk.severity === "HIGH"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[9px]"
                        >
                          {rk.severity} SEVERITY
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Mitigation:</strong> {rk.mitigation_strategy}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: Institutional Lessons Learned */}
        {activeTab === "lessons" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Institutional Lessons Learned</h3>
                  <p className="text-xs text-slate-500">
                    Knowledge retention and policy reform insights for subsequent national procurement pipelines.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLessonModal(true)}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Lesson
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {lessons.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No lessons documented yet.</p>
                ) : (
                  lessons.map((ls) => (
                    <div
                      key={ls.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-bold text-slate-900">{ls.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {ls.category}
                        </Badge>
                      </div>

                      {ls.what_worked && (
                        <p className="text-xs text-emerald-800">
                          <strong>What Worked:</strong> {ls.what_worked}
                        </p>
                      )}
                      {ls.what_failed && (
                        <p className="text-xs text-rose-800">
                          <strong>Challenges:</strong> {ls.what_failed}
                        </p>
                      )}
                      {ls.recommendation && (
                        <p className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-200">
                          <strong>Recommendation:</strong> {ls.recommendation}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Certify Readiness Check */}
        {signOffModal.open && signOffModal.item && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Certify Readiness Check
                </h3>
                <button
                  onClick={() => setSignOffModal({ open: false, item: null })}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-2">
                <p className="font-semibold text-slate-800">{signOffModal.item.check_name}</p>
                <p className="text-slate-500">{signOffModal.item.description}</p>
              </div>

              <form onSubmit={handleSignOffSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Check Status</label>
                  <select
                    value={signOffStatus}
                    onChange={(e) => setSignOffStatus(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="COMPLETED">COMPLETED (Certified)</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
                    <option value="BLOCKED">BLOCKED (Halt Scale-Up)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sign-Off Notes / Evidence</label>
                  <textarea
                    rows={3}
                    value={signOffNotes}
                    onChange={(e) => setSignOffNotes(e.target.value)}
                    placeholder="Reference audit certificate, committee note, or exemption basis..."
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignOffModal({ open: false, item: null })}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Certification"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Phase */}
        {phaseModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add Rollout Phase</h3>
                <button
                  onClick={() => setPhaseModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePhase} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phase Number</label>
                  <input
                    type="number"
                    value={phaseData.phase_number}
                    onChange={(e) => setPhaseData({ ...phaseData, phase_number: parseInt(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phase Name</label>
                  <input
                    type="text"
                    value={phaseData.phase_name}
                    onChange={(e) => setPhaseData({ ...phaseData, phase_name: e.target.value })}
                    placeholder="e.g. Phase 2: State-Wide Municipal Expansion"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Geography</label>
                  <input
                    type="text"
                    value={phaseData.target_geography}
                    onChange={(e) => setPhaseData({ ...phaseData, target_geography: e.target.value })}
                    placeholder="e.g. 10 Municipal Corporations in Rajasthan"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Allocated Budget Ceiling (₹)</label>
                  <input
                    type="number"
                    value={phaseData.allocated_budget}
                    onChange={(e) => setPhaseData({ ...phaseData, allocated_budget: parseFloat(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setPhaseModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Phase"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Target Site */}
        {targetModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add Deployment Target Site</h3>
                <button
                  onClick={() => setTargetModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTarget} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Site / Facility Name</label>
                  <input
                    type="text"
                    value={targetData.site_name}
                    onChange={(e) => setTargetData({ ...targetData, site_name: e.target.value })}
                    placeholder="e.g. Udaipur Water Treatment Facility"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">District</label>
                    <input
                      type="text"
                      value={targetData.district}
                      onChange={(e) => setTargetData({ ...targetData, district: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">State</label>
                    <input
                      type="text"
                      value={targetData.state}
                      onChange={(e) => setTargetData({ ...targetData, state: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Units / Capacity</label>
                  <input
                    type="number"
                    value={targetData.target_metric_units}
                    onChange={(e) => setTargetData({ ...targetData, target_metric_units: parseInt(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Allocated Budget (₹)</label>
                  <input
                    type="number"
                    value={targetData.allocated_budget}
                    onChange={(e) => setTargetData({ ...targetData, allocated_budget: parseFloat(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setTargetModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Target Site"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Initiate Replication */}
        {replicationModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Initiate Peer Replication</h3>
                <button
                  onClick={() => setReplicationModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateReplication} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Adopting Department / Ministry</label>
                  <input
                    type="text"
                    value={replicationData.adopting_department}
                    onChange={(e) => setReplicationData({ ...replicationData, adopting_department: e.target.value })}
                    placeholder="e.g. Gujarat Water Supply & Sewerage Board"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Jurisdiction</label>
                  <input
                    type="text"
                    value={replicationData.target_jurisdiction}
                    onChange={(e) => setReplicationData({ ...replicationData, target_jurisdiction: e.target.value })}
                    placeholder="e.g. Ahmedabad & Surat"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Adaptation Notes</label>
                  <textarea
                    rows={2}
                    value={replicationData.adaptation_notes}
                    onChange={(e) => setReplicationData({ ...replicationData, adaptation_notes: e.target.value })}
                    placeholder="Contextual customisations required..."
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setReplicationModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Initiate Replication"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Metric */}
        {metricModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Define Impact Metric</h3>
                <button
                  onClick={() => setMetricModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMetric} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Metric Name</label>
                  <input
                    type="text"
                    value={metricData.metric_name}
                    onChange={(e) => setMetricData({ ...metricData, metric_name: e.target.value })}
                    placeholder="e.g. Energy Consumption Reduction"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Category</label>
                    <select
                      value={metricData.category}
                      onChange={(e) => setMetricData({ ...metricData, category: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="ECONOMIC_SAVINGS">ECONOMIC SAVINGS</option>
                      <option value="OPERATIONAL_EFFICIENCY">OPERATIONAL EFFICIENCY</option>
                      <option value="CITIZEN_EXPERIENCE">CITIZEN EXPERIENCE</option>
                      <option value="ENVIRONMENT">ENVIRONMENT</option>
                      <option value="SOCIAL_IMPACT">SOCIAL IMPACT</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={metricData.unit_of_measure}
                      onChange={(e) => setMetricData({ ...metricData, unit_of_measure: e.target.value })}
                      placeholder="e.g. %, kWh, Days"
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Baseline</label>
                    <input
                      type="number"
                      value={metricData.baseline_value}
                      onChange={(e) => setMetricData({ ...metricData, baseline_value: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target</label>
                    <input
                      type="number"
                      value={metricData.target_value}
                      onChange={(e) => setMetricData({ ...metricData, target_value: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Weight (%)</label>
                    <input
                      type="number"
                      value={metricData.weight_percentage}
                      onChange={(e) => setMetricData({ ...metricData, weight_percentage: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_critical_kpi"
                    checked={metricData.is_critical_kpi}
                    onChange={(e) => setMetricData({ ...metricData, is_critical_kpi: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="is_critical_kpi" className="font-semibold text-slate-700 text-xs">
                    Mark as Critical KPI (Caps scale recommendation if &lt; 70%)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setMetricModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Metric"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Risk */}
        {riskModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Log Scale-Up Risk</h3>
                <button
                  onClick={() => setRiskModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRisk} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Risk Description</label>
                  <input
                    type="text"
                    value={riskData.risk_title}
                    onChange={(e) => setRiskData({ ...riskData, risk_title: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Severity</label>
                    <select
                      value={riskData.severity}
                      onChange={(e) => setRiskData({ ...riskData, severity: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Likelihood</label>
                    <select
                      value={riskData.likelihood}
                      onChange={(e) => setRiskData({ ...riskData, likelihood: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mitigation Strategy</label>
                  <textarea
                    rows={2}
                    value={riskData.mitigation_strategy}
                    onChange={(e) => setRiskData({ ...riskData, mitigation_strategy: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setRiskModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Log Risk"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Lesson */}
        {lessonModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Record Institutional Lesson</h3>
                <button
                  onClick={() => setLessonModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLesson} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lesson Title</label>
                  <input
                    type="text"
                    value={lessonData.title}
                    onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={lessonData.category}
                    onChange={(e) => setLessonData({ ...lessonData, category: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="POLICY">POLICY</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="PROCUREMENT">PROCUREMENT</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">What Worked Well</label>
                  <textarea
                    rows={2}
                    value={lessonData.what_worked}
                    onChange={(e) => setLessonData({ ...lessonData, what_worked: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">What Failed / Hurdles</label>
                  <textarea
                    rows={2}
                    value={lessonData.what_failed}
                    onChange={(e) => setLessonData({ ...lessonData, what_failed: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recommendation for Future Rollouts</label>
                  <textarea
                    rows={2}
                    value={lessonData.recommendation}
                    onChange={(e) => setLessonData({ ...lessonData, recommendation: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setLessonModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Lesson"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
