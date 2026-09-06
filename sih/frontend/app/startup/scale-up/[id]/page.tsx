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
  TrendingUp,
  MapPin,
  Building2,
  Rocket,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  ArrowLeft,
  FileCheck2,
  Activity,
  Send,
  Lightbulb,
} from "lucide-react";

export default function StartupScalePlanWorkspacePage() {
  const params = useParams();
  const planId = params.id as string;

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <StartupWorkspaceContent planId={planId} />
    </ProtectedRoute>
  );
}

function StartupWorkspaceContent({ planId }: { planId: string }) {
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Deployment update form
  const [deploymentModal, setDeploymentModal] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState({
    target_id: "",
    deployment_status: "OPERATIONAL",
    rollout_units_completed: 10,
    work_completed_summary: "Completed IoT hardware installation and automated telemetry pipeline.",
    blockers_faced: "",
  });

  // Impact measurement form
  const [measurementModal, setMeasurementModal] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({
    metric_id: "1",
    measured_value: 94.5,
    measurement_methodology: "Automated real-time sensor polling against baseline telemetry.",
    sample_size: 500,
    confidence_interval_pct: 95.0,
    evidence_title: "Independent Quality Audit & Sensor Verification Report",
    evidence_url: "https://storage.govinnovate.gov.in/evidence/scale-sensor-audit-2026.pdf",
  });

  // Lesson learned form
  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    category: "OPERATIONAL",
    what_worked: "",
    what_failed: "",
    recommendation: "",
  });

  useEffect(() => {
    loadWorkspaceData();
  }, [planId]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const [planRes, targetsRes, deploymentsRes] = await Promise.all([
        apiRequest<any>(`/api/v1/startup/scale-up/plans/${planId}`),
        apiRequest<any[]>(`/api/v1/startup/scale-up/plans/${planId}/targets`).catch(() => []),
        apiRequest<any[]>(`/api/v1/startup/scale-up/plans/${planId}/deployments`).catch(() => []),
      ]);
      setPlan(planRes);
      setTargets(targetsRes || []);
      setDeployments(deploymentsRes || []);
      if (targetsRes && targetsRes.length > 0 && !deploymentForm.target_id) {
        setDeploymentForm((prev) => ({ ...prev, target_id: String(targetsRes[0].id) }));
      }
    } catch (err) {
      console.error("Failed to load startup scale workspace", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMessage(null);
      await apiRequest<any>(`/api/v1/startup/scale-up/plans/${planId}/deployments`, {
        method: "POST",
        body: JSON.stringify({
          target_id: parseInt(deploymentForm.target_id),
          deployment_status: deploymentForm.deployment_status,
          rollout_units_completed: parseInt(String(deploymentForm.rollout_units_completed)),
          work_completed_summary: deploymentForm.work_completed_summary,
          blockers_faced: deploymentForm.blockers_faced || null,
        }),
      });
      setMessage({ text: "Deployment update logged successfully!", type: "success" });
      setDeploymentModal(false);
      await loadWorkspaceData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to log deployment update.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMeasurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMessage(null);
      // Submit measurement
      const measRes = await apiRequest<any>(
        `/api/v1/startup/scale-up/plans/${planId}/measurements`,
        {
          method: "POST",
          body: JSON.stringify({
            metric_id: parseInt(measurementForm.metric_id),
            measured_value: parseFloat(String(measurementForm.measured_value)),
            measurement_methodology: measurementForm.measurement_methodology,
            sample_size: parseInt(String(measurementForm.sample_size)),
            confidence_interval_pct: parseFloat(String(measurementForm.confidence_interval_pct)),
          }),
        }
      );

      // Submit evidence with sha-256
      if (measRes && measRes.id) {
        await apiRequest<any>(
          `/api/v1/startup/scale-up/plans/${planId}/measurements/${measRes.id}/evidence`,
          {
            method: "POST",
            body: JSON.stringify({
              title: measurementForm.evidence_title,
              document_url: measurementForm.evidence_url,
              file_hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            }),
          }
        );
      }

      setMessage({ text: "Impact measurement & verified evidence submitted!", type: "success" });
      setMeasurementModal(false);
      await loadWorkspaceData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record impact measurement.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMessage(null);
      await apiRequest<any>(`/api/v1/startup/scale-up/plans/${planId}/lessons`, {
        method: "POST",
        body: JSON.stringify(lessonForm),
      });
      setMessage({ text: "Operational lesson submitted to knowledge base!", type: "success" });
      setLessonModal(false);
      await loadWorkspaceData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit lesson.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/startup/scale-up"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B2545]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Scale-Up Hub
          </Link>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDeploymentModal(true)}
              className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Log Site Deployment
            </Button>
            <Button
              onClick={() => setMeasurementModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Submit Impact Telemetry
            </Button>
            <Button
              onClick={() => setLessonModal(true)}
              variant="outline"
              className="text-xs gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Share Lesson
            </Button>
          </div>
        </div>

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
            <button onClick={() => setMessage(null)} className="text-xs font-bold uppercase">
              Dismiss
            </button>
          </div>
        )}

        {/* Plan Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {plan?.scale_plan_code}
                </span>
                <Badge variant="success" className="text-[10px]">
                  {plan?.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">{plan?.plan_title}</h1>
              <p className="text-xs text-slate-500 mt-1">{plan?.executive_summary}</p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 space-y-1">
              <span className="text-xs text-slate-400 block">Lead Department</span>
              <span className="text-xs font-bold text-slate-800">{plan?.lead_department}</span>
              <div className="text-xs font-semibold text-emerald-700 mt-1">
                Scale Budget: ₹{((plan?.approved_scale_budget || 0) / 100000).toFixed(2)} Lakh
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Target Sites Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Your Assigned Rollout Sites</h3>
            <span className="text-xs text-slate-500 font-medium">
              {targets.filter((t) => t.status === "OPERATIONAL").length} of {targets.length} Operational
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {targets.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{t.site_name}</span>
                  <Badge variant={t.status === "OPERATIONAL" ? "success" : "secondary"} className="text-[9px]">
                    {t.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  {t.district}, {t.state} ({t.target_tier})
                </p>
                <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200/60">
                  Units: {t.achieved_metric_units || 0} / {t.target_metric_units} units
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submitted Logs History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Deployment Logs Submitted</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {deployments.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No logs submitted yet.</p>
            ) : (
              deployments.map((d) => (
                <div key={d.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Site #{d.target_id} • Status: {d.deployment_status}
                    </span>
                    <span className="text-[11px] text-slate-400">{d.created_at?.substring(0, 10)}</span>
                  </div>
                  <p className="text-slate-600">{d.work_completed_summary}</p>
                  {d.blockers_faced && (
                    <p className="text-rose-700 bg-rose-50 p-1.5 rounded-md">
                      Blocker: {d.blockers_faced}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODAL: Log Site Deployment */}
        {deploymentModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Log Site Deployment Progress</h3>
                <button
                  onClick={() => setDeploymentModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleDeploymentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Site</label>
                  <select
                    value={deploymentForm.target_id}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, target_id: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                    required
                  >
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.site_name} ({t.district})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Deployment Status</label>
                  <select
                    value={deploymentForm.deployment_status}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, deployment_status: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="PREPARING">PREPARING</option>
                    <option value="DEPLOYING">DEPLOYING</option>
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="HALTED">HALTED</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Units Installed / Completed</label>
                  <input
                    type="number"
                    value={deploymentForm.rollout_units_completed}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, rollout_units_completed: parseInt(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Work Summary</label>
                  <textarea
                    rows={2}
                    value={deploymentForm.work_completed_summary}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, work_completed_summary: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blockers / Challenges (If any)</label>
                  <textarea
                    rows={2}
                    value={deploymentForm.blockers_faced}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, blockers_faced: e.target.value })}
                    placeholder="e.g. Awaiting local power connection approvals..."
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setDeploymentModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Progress"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Submit Impact Telemetry */}
        {measurementModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Submit Impact Measurement & Evidence</h3>
                <button
                  onClick={() => setMeasurementModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleMeasurementSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Measured Value</label>
                  <input
                    type="number"
                    step="any"
                    value={measurementForm.measured_value}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, measured_value: parseFloat(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sample Size</label>
                    <input
                      type="number"
                      value={measurementForm.sample_size}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, sample_size: parseInt(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Confidence Interval (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={measurementForm.confidence_interval_pct}
                      onChange={(e) => setMeasurementForm({ ...measurementForm, confidence_interval_pct: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Measurement Methodology</label>
                  <textarea
                    rows={2}
                    value={measurementForm.measurement_methodology}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, measurement_methodology: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Verification Document Title</label>
                  <input
                    type="text"
                    value={measurementForm.evidence_title}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, evidence_title: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Evidence URL</label>
                  <input
                    type="text"
                    value={measurementForm.evidence_url}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, evidence_url: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setMeasurementModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Evidence"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Share Lesson */}
        {lessonModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Share Rollout Lesson</h3>
                <button
                  onClick={() => setLessonModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLessonSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lesson Title</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="e.g. Field sensor calibration in high-salinity water"
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">What Worked</label>
                  <textarea
                    rows={2}
                    value={lessonForm.what_worked}
                    onChange={(e) => setLessonForm({ ...lessonForm, what_worked: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recommendation</label>
                  <textarea
                    rows={2}
                    value={lessonForm.recommendation}
                    onChange={(e) => setLessonForm({ ...lessonForm, recommendation: e.target.value })}
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
                    disabled={submitting}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Lesson"}
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
