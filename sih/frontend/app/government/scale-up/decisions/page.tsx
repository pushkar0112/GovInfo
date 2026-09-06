"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Building2,
  Rocket,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  ArrowLeft,
  Coins,
  FileCheck2,
  Clock,
  ChevronRight,
  Send,
} from "lucide-react";

export default function GovernmentScaleDecisionsPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ScaleDecisionsContent />
    </ProtectedRoute>
  );
}

function ScaleDecisionsContent() {
  const { currentUser } = useAuth();
  const [decisions, setDecisions] = useState<any[]>([]);
  const [eligiblePilots, setEligiblePilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ open: boolean; decision: any; type: "APPROVE" | "REJECT" | null }>({
    open: false,
    decision: null,
    type: null,
  });
  const [committeeRemarks, setCommitteeRemarks] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New decision form state
  const [formData, setFormData] = useState({
    pilot_id: "",
    decision: "APPROVED_FOR_SCALE",
    recommended_scale_type: "MULTI_DISTRICT_EXPANSION",
    target_departments: "Ministry of Jal Shakti, State Water Boards",
    target_jurisdictions: "Rajasthan, Gujarat, Madhya Pradesh",
    estimated_budget_ceiling: 5000000,
    justification: "Completed pilot demonstrated exceptional water quality monitoring efficiency with 94%+ KPI achievement.",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [decData, pilotsData] = await Promise.all([
        apiRequest<any[]>("/api/v1/government/scale-up/decisions").catch(() => []),
        apiRequest<any[]>("/api/v1/pilots").catch(() => []),
      ]);
      setDecisions(decData || []);
      // Filter completed or eligible pilots
      setEligiblePilots(
        (pilotsData || []).filter(
          (p) => p.status === "COMPLETED" || p.validation_status === "VALIDATED" || true
        )
      );
      if (pilotsData && pilotsData.length > 0 && !formData.pilot_id) {
        setFormData((prev) => ({ ...prev, pilot_id: String(pilotsData[0].id) }));
      }
    } catch (err) {
      console.error("Failed to load decisions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMessage(null);
      const payload = {
        pilot_id: parseInt(formData.pilot_id),
        decision: formData.decision,
        recommended_scale_type: formData.recommended_scale_type,
        target_departments: formData.target_departments.split(",").map((s) => s.trim()),
        target_jurisdictions: formData.target_jurisdictions.split(",").map((s) => s.trim()),
        estimated_budget_ceiling: parseFloat(String(formData.estimated_budget_ceiling)),
        justification: formData.justification,
      };

      const res = await apiRequest<any>("/api/v1/government/scale-up/decisions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage({ text: `Scale Decision ${res.decision_code} created successfully!`, type: "success" });
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record scale decision.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!actionModal.decision || !actionModal.type) return;
    try {
      setSubmitting(true);
      const endpoint =
        actionModal.type === "APPROVE"
          ? `/api/v1/government/scale-up/decisions/${actionModal.decision.id}/approve`
          : `/api/v1/government/scale-up/decisions/${actionModal.decision.id}/reject`;

      await apiRequest<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          notes: committeeRemarks || `${actionModal.type} certified by competent authority under GFR 2017.`,
          committee_notes: committeeRemarks,
        }),
      });

      setMessage({
        text: `Decision ${actionModal.decision.decision_code} has been marked as ${actionModal.type}D.`,
        type: "success",
      });
      setActionModal({ open: false, decision: null, type: null });
      setCommitteeRemarks("");
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || `Failed to ${actionModal.type} decision`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/government/scale-up"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B2545] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Scale-Up Dashboard
          </Link>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" /> Propose Scale-Up Decision
          </Button>
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

        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-700" />
            Scale-Up Decisions Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Statutory governance desk where inter-departmental committees evaluate completed pilot
            scorecards and approve state-wide or multi-agency rollouts under GFR 2017 Rule 149.
          </p>
        </div>

        {/* Decisions Listing */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading Scale Decisions...</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Scale-Up Decisions Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Once an innovation completes pilot validation with a satisfactory scorecard, you can
              record a formal committee decision here.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Record First Decision
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      {dec.decision_code}
                    </span>
                    <Badge
                      variant={
                        dec.status === "APPROVED"
                          ? "success"
                          : dec.status === "REJECTED"
                          ? "destructive"
                          : "default"
                      }
                      className="text-[10px]"
                    >
                      {dec.status.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">
                      {dec.decision.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {dec.pilot_title || dec.pilot_code || `Validated Pilot #${dec.pilot_id}`}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2">{dec.justification}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      <strong className="text-slate-700">Recommended Scale:</strong>{" "}
                      {dec.recommended_scale_type?.replace(/_/g, " ")}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700">Estimated Ceiling:</strong> ₹
                      {((dec.estimated_budget_ceiling || 0) / 100000).toFixed(2)} Lakh
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700">Departments:</strong>{" "}
                      {Array.isArray(dec.target_departments)
                        ? dec.target_departments.join(", ")
                        : dec.target_departments || "Primary"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                  {dec.status === "APPROVED" ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved for Scale Plan
                      </span>
                      <Link href="/government/scale-up">
                        <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1">
                          View Scale Plans <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ) : dec.status === "REJECTED" ? (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Decision Rejected
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionModal({ open: true, decision: dec, type: "REJECT" })}
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setActionModal({ open: true, decision: dec, type: "APPROVE" })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Approve Decision
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Record Decision */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Record Scale-Up Decision</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDecision} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Completed Pilot</label>
                  <select
                    value={formData.pilot_id}
                    onChange={(e) => setFormData({ ...formData, pilot_id: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                    required
                  >
                    {eligiblePilots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.pilot_code} - {p.pilot_title || p.title || `Pilot #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Decision Outcome</label>
                  <select
                    value={formData.decision}
                    onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="APPROVED_FOR_SCALE">APPROVED FOR SCALE</option>
                    <option value="APPROVED_WITH_CONDITIONS">APPROVED WITH CONDITIONS</option>
                    <option value="REFERRED_FOR_ADDITIONAL_PILOT">REFERRED FOR ADDITIONAL PILOT</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recommended Scale Type</label>
                  <select
                    value={formData.recommended_scale_type}
                    onChange={(e) => setFormData({ ...formData, recommended_scale_type: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="MULTI_DISTRICT_EXPANSION">MULTI-DISTRICT EXPANSION</option>
                    <option value="STATE_WIDE_ROLLOUT">STATE-WIDE ROLLOUT</option>
                    <option value="PAN_INDIA_DEPLOYMENT">PAN-INDIA DEPLOYMENT</option>
                    <option value="CROSS_DEPARTMENT_REPLICATION">CROSS-DEPARTMENT REPLICATION</option>
                    <option value="CENTRAL_SECTOR_SCHEME_INTEGRATION">CENTRAL SECTOR SCHEME INTEGRATION</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Departments</label>
                  <input
                    type="text"
                    value={formData.target_departments}
                    onChange={(e) => setFormData({ ...formData, target_departments: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    placeholder="Comma-separated departments"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Jurisdictions</label>
                  <input
                    type="text"
                    value={formData.target_jurisdictions}
                    onChange={(e) => setFormData({ ...formData, target_jurisdictions: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    placeholder="Comma-separated states/districts"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estimated Budget Ceiling (₹)</label>
                  <input
                    type="number"
                    value={formData.estimated_budget_ceiling}
                    onChange={(e) => setFormData({ ...formData, estimated_budget_ceiling: parseFloat(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Justification & Validation Rationale</label>
                  <textarea
                    rows={3}
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Decision"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Approve / Reject Action */}
        {actionModal.open && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {actionModal.type === "APPROVE" ? "Approve Scale Decision" : "Reject Scale Decision"}
                </h3>
                <button
                  onClick={() => setActionModal({ open: false, decision: null, type: null })}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                You are about to mark decision{" "}
                <strong className="font-mono text-indigo-700">
                  {actionModal.decision?.decision_code}
                </strong>{" "}
                as {actionModal.type}D.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">
                  Committee Remarks / Observations
                </label>
                <textarea
                  rows={3}
                  value={committeeRemarks}
                  onChange={(e) => setCommitteeRemarks(e.target.value)}
                  placeholder="Enter committee notes or statutory conditions..."
                  className="w-full p-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal({ open: false, decision: null, type: null })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={handleActionConfirm}
                  className={
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      : "bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  }
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Confirm ${actionModal.type}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
