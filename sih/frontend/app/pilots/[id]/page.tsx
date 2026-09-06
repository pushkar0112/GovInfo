"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FlaskConical,
  Building2,
  Rocket,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Coins,
  ShieldCheck,
  Award,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Loader2,
  Check,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, getStoredAuth } from "@/lib/auth";

export default function PilotDetailPage() {
  const params = useParams();
  const pilotId = params?.id as string;
  const [auth, setAuth] = useState(getStoredAuth());
  const [pilot, setPilot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());

    async function loadPilot() {
      try {
        const data = await apiRequest<any>(`/api/v1/pilots/${pilotId}`);
        setPilot(data);
      } catch {
        // High-fidelity fallback for sandbox exploration
        setPilot({
          id: pilotId,
          title: "PHC Rural Tele-Triage Field Sandbox Trial",
          scope_of_work:
            "Controlled 12-week deployment of edge-computed vital telemetry tablets across 5 Sub-Divisional Health Centres in Alwar District, evaluating triage latency reduction and diagnostic concordance.",
          duration_weeks: 12,
          sandbox_location: "Alwar District Health Centres, Rajasthan",
          approved_budget: 1500000,
          status: "ACTIVE",
          department_name: "National Health Authority",
          startup_name: "InnovateTech AI Solutions",
          milestones: [
            {
              id: "m-1",
              sequence_number: 1,
              title: "Hardware Provisioning & Baseline Setup",
              deliverable_description: "Deliver 15 rugged tablets and calibrate baseline telemetry in all 5 PHCs.",
              tranche_amount: 500000,
              status: "TRANCHE_DISBURSED",
              due_date: "2024-09-15",
              completion_date: "2024-09-12",
            },
            {
              id: "m-2",
              sequence_number: 2,
              title: "1,000 Live Patient Triage Assessments",
              deliverable_description: "Execute and log 1,000 live patient triage assessments with physician log verification.",
              tranche_amount: 500000,
              status: "DELIVERABLE_SUBMITTED",
              due_date: "2024-10-15",
              completion_date: null,
            },
            {
              id: "m-3",
              sequence_number: 3,
              title: "Independent STQC Empirical Audit & Certification",
              deliverable_description: "Submit telemetry audit logs for third-party accredited STQC / IIT validation.",
              tranche_amount: 500000,
              status: "PENDING",
              due_date: "2024-11-15",
              completion_date: null,
            },
          ],
          kpis: [
            {
              id: "kpi-1",
              metric_name: "Median Patient Triage Wait Time",
              baseline_value: 45.0,
              target_value: 15.0,
              achieved_value: 13.8,
              unit: "minutes",
              is_verified: true,
              verification_source: "STQC Field Log Batch #4",
            },
            {
              id: "kpi-2",
              metric_name: "Diagnostic Concordance with Tertiary Consultants",
              baseline_value: 52.0,
              target_value: 90.0,
              achieved_value: 93.4,
              unit: "%",
              is_verified: true,
              verification_source: "NHA Clinical Audit Board",
            },
            {
              id: "kpi-3",
              metric_name: "Low-Bandwidth GSM Telemetry Sync Reliability",
              baseline_value: 65.0,
              target_value: 98.0,
              achieved_value: 99.1,
              unit: "%",
              is_verified: false,
              verification_source: "District Edge Gateway Ping Logs",
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }

    loadPilot();
  }, [pilotId]);

  const handleAuthorizeTranche = async (milestoneId: string) => {
    setIsProcessing(true);
    try {
      await apiRequest(`/api/v1/pilots/${pilotId}/milestones/${milestoneId}/approve`, {
        method: "POST",
      });
      setActionMessage("Milestone tranche successfully authorized & disbursed!");
      // Update local state
      setPilot((prev: any) => ({
        ...prev,
        milestones: prev.milestones.map((m: any) =>
          m.id === milestoneId
            ? { ...m, status: "TRANCHE_DISBURSED", completion_date: new Date().toISOString().split("T")[0] }
            : m
        ),
      }));
    } catch {
      // simulate for demo
      setPilot((prev: any) => ({
        ...prev,
        milestones: prev.milestones.map((m: any) =>
          m.id === milestoneId
            ? { ...m, status: "TRANCHE_DISBURSED", completion_date: new Date().toISOString().split("T")[0] }
            : m
        ),
      }));
      setActionMessage("Milestone tranche successfully authorized & disbursed (Demo Simulation)!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitDeliverable = async (milestoneId: string) => {
    setIsProcessing(true);
    try {
      await apiRequest(`/api/v1/pilots/${pilotId}/milestones/${milestoneId}/submit`, {
        method: "POST",
      });
      setActionMessage("Deliverable evidence submitted for departmental review!");
      setPilot((prev: any) => ({
        ...prev,
        milestones: prev.milestones.map((m: any) =>
          m.id === milestoneId ? { ...m, status: "DELIVERABLE_SUBMITTED" } : m
        ),
      }));
    } catch {
      setPilot((prev: any) => ({
        ...prev,
        milestones: prev.milestones.map((m: any) =>
          m.id === milestoneId ? { ...m, status: "DELIVERABLE_SUBMITTED" } : m
        ),
      }));
      setActionMessage("Deliverable evidence submitted for departmental review (Demo Simulation)!");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  const userRole = auth.user?.role || "GOVERNMENT";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href={userRole === "STARTUP" ? "/portal/startup" : "/portal/government"}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {userRole === "STARTUP" ? (
              <>
                <Link href={`/startup/pilots/${pilotId}/kpis`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-blue-200 text-blue-900 bg-blue-50/50">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-800" />
                    KPI Telemetry
                  </Button>
                </Link>
                <Link href={`/startup/pilots/${pilotId}/validation`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-300 text-emerald-900 bg-emerald-50/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Validation Status
                  </Button>
                </Link>
                <Link href={`/startup/pilots/${pilotId}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 text-slate-700">
                    <Rocket className="w-3.5 h-3.5 text-amber-500" />
                    Workspace
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={`/government/pilots/${pilotId}/kpis`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-blue-200 text-blue-900 bg-blue-50/50">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-800" />
                    KPI Framework
                  </Button>
                </Link>
                <Link href={`/government/pilots/${pilotId}/validation`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-300 text-emerald-900 bg-emerald-50/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Independent Validation
                  </Button>
                </Link>
                <Link href={`/government/pilots/${pilotId}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-blue-900" />
                    Dossier
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Action feedback notification */}
        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Top Sandbox Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gov">
                <FlaskConical className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                Live Operational Sandbox
              </Badge>
              <Badge variant="secondary">Step 7: KPI & Validation</Badge>
              {pilot?.validation_status && (
                <Badge variant="gov" className="bg-blue-100 text-blue-900 border-blue-200">
                  {pilot.validation_status.replace(/_/g, " ")}
                </Badge>
              )}
              {pilot?.success_status && pilot.success_status !== "NOT_ASSESSED" && (
                <Badge
                  variant={
                    pilot.success_status === "SUCCESSFUL"
                      ? "success"
                      : pilot.success_status === "PARTIALLY_SUCCESSFUL"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {pilot.success_status.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>GFR 2017 Milestone-Bound Grant</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {pilot?.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
            {pilot?.scope_of_work}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block">Sanctioned Pilot Budget</span>
              <span className="text-lg font-bold text-slate-900">
                ₹{pilot?.approved_budget?.toLocaleString("en-IN") || "15,00,000"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Sandbox Operational Site</span>
              <span className="font-semibold text-slate-800">
                {pilot?.sandbox_location}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Nodal Department</span>
              <span className="font-semibold text-slate-800">
                {pilot?.department_name || "National Health Authority"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Deploying Startup</span>
              <span className="font-semibold text-slate-800">
                {pilot?.startup_name || "InnovateTech AI"}
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Tranche Pipeline Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Milestone Deliverables & Tranche Disbursements
              </h2>
              <p className="text-xs text-slate-500">
                Grants are released in tranches only upon verified deliverable approval.
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              3 Structured Tranches
            </div>
          </div>

          <div className="p-6 space-y-6">
            {pilot?.milestones?.map((m: any) => {
              const isDisbursed = m.status === "TRANCHE_DISBURSED";
              const isSubmitted = m.status === "DELIVERABLE_SUBMITTED";
              const isPending = m.status === "PENDING";

              return (
                <div
                  key={m.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isDisbursed
                      ? "border-emerald-200 bg-emerald-50/40"
                      : isSubmitted
                      ? "border-blue-200 bg-blue-50/40 ring-1 ring-blue-300"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          Milestone 0{m.sequence_number}
                        </span>
                        {isDisbursed && (
                          <Badge variant="success" className="text-[10px]">
                            <Check className="w-3 h-3 mr-1" /> Tranche Disbursed
                          </Badge>
                        )}
                        {isSubmitted && (
                          <Badge variant="secondary" className="border-blue-200 bg-blue-100 text-blue-900 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Awaiting Review
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="secondary" className="text-[10px]">
                            Pending Deliverable
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {m.deliverable_description}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Due Date: {m.due_date} {m.completion_date && `• Approved: ${m.completion_date}`}
                      </div>
                    </div>

                    {/* Tranche value and action button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Grant Tranche
                        </span>
                        <span className="text-base font-bold text-slate-900">
                          ₹{m.tranche_amount?.toLocaleString("en-IN") || "5,00,000"}
                        </span>
                      </div>

                      {/* Action buttons based on Role and Milestone State */}
                      {isSubmitted && (userRole === "GOVERNMENT" || userRole === "ADMIN") && (
                        <Button
                          variant="gov"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleAuthorizeTranche(m.id)}
                          className="text-xs gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          Authorize Tranche
                        </Button>
                      )}

                      {isPending && (userRole === "STARTUP" || userRole === "ADMIN") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleSubmitDeliverable(m.id)}
                          className="text-xs gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit Deliverable
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quantitative KPI Telemetry Meters */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quantitative KPI Telemetry Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Live empirical performance measurements audited for procurement certification.
              </p>
            </div>
            <Badge variant="gov" className="text-xs">
              <Award className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Outcome Measurement
            </Badge>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {pilot?.kpis?.map((kpi: any) => {
              const baseline = kpi.baseline_value || 0;
              const target = kpi.target_value;
              const achieved = kpi.achieved_value ?? baseline;
              const isLowerBetter = target < baseline;

              let progressPct = 0;
              if (isLowerBetter) {
                progressPct = Math.min(100, Math.round(((baseline - achieved) / (baseline - target)) * 100));
              } else {
                progressPct = Math.min(100, Math.round((achieved / target) * 100));
              }

              return (
                <div
                  key={kpi.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                        KPI Metric
                      </span>
                      {kpi.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Field Telemetry</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {kpi.metric_name}
                    </h4>
                  </div>

                  {/* Meter Card */}
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Target:</span>
                      <span className="font-bold text-slate-900">
                        {kpi.target_value} {kpi.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Achieved:</span>
                      <span className="font-extrabold text-blue-900 text-sm">
                        {kpi.achieved_value != null ? `${kpi.achieved_value} ${kpi.unit}` : "Measuring..."}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-900 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, progressPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Baseline: {kpi.baseline_value} {kpi.unit}</span>
                      <span className="font-semibold text-slate-700">{progressPct}% of Goal</span>
                    </div>
                  </div>

                  {kpi.verification_source && (
                    <p className="text-[10px] text-slate-400 italic">
                      Source: {kpi.verification_source}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
