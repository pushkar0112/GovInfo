"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Building2,
  Rocket,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Coins,
  Send,
  Loader2,
  FileCheck2,
  ExternalLink,
} from "lucide-react";

export default function GovernmentPilotProcurementDecisionPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ProcurementDecisionContent />
    </ProtectedRoute>
  );
}

function ProcurementDecisionContent() {
  const params = useParams();
  const router = useRouter();
  const pilotId = params?.id as string;
  const { currentUser } = useAuth();

  const [pilot, setPilot] = useState<any>(null);
  const [valSummary, setValSummary] = useState<any>(null);
  const [existingDecision, setExistingDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [decisionType, setDecisionType] = useState<string>("PROCEED_TO_PROCUREMENT");
  const [rationale, setRationale] = useState<string>("");
  const [estimatedValue, setEstimatedValue] = useState<string>("1000000");
  const [intendedScope, setIntendedScope] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [currency, setCurrency] = useState<string>("INR");

  useEffect(() => {
    if (!pilotId) return;
    loadData();
  }, [pilotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Pilot
      const p = await apiRequest<any>(`/api/v1/government/pilots/${pilotId}`);
      setPilot(p);
      setIntendedScope(p.scope || p.problem_statement || "Approved pilot solution deployment at departmental scale.");

      // Load Step 7 Validation Summary
      try {
        const vs = await apiRequest<any>(`/api/v1/government/validation-summary/${pilotId}`);
        setValSummary(vs);
      } catch {
        // Validation might not be finalized yet
      }

      // Load existing Procurement Decision if any
      try {
        const d = await apiRequest<any>(`/api/v1/government/pilots/${pilotId}/procurement-decision`);
        if (d) {
          setExistingDecision(d);
          setDecisionType(d.decision_type);
          setRationale(d.rationale);
          setEstimatedValue(d.estimated_value ? String(d.estimated_value) : "");
          setIntendedScope(d.intended_scope || "");
          setQuantity(d.quantity || 1);
        }
      } catch {
        // No decision yet
      }
    } catch (err: any) {
      setError(err.message || "Failed to load pilot procurement context.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!rationale || rationale.trim().length < 10) {
      setError("Please provide a comprehensive decision rationale (minimum 10 characters).");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        decision_type: decisionType,
        rationale: rationale.trim(),
        estimated_value: decisionType === "PROCEED_TO_PROCUREMENT" ? parseFloat(estimatedValue) || 0 : undefined,
        intended_scope: intendedScope.trim(),
        quantity: quantity,
        currency: currency,
      };

      const res = await apiRequest<any>(`/api/v1/government/pilots/${pilotId}/procurement-decision`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setExistingDecision(res);
      setSuccessMsg(`Procurement decision ${res.procurement_code} created successfully.`);

      // Automatically offer submission / redirect
      if (res.decision_type === "PROCEED_TO_PROCUREMENT") {
        router.push(`/government/procurement`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to record procurement decision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  if (!pilot) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Pilot Sandbox Not Found</h2>
        <Link href="/government/pilots">
          <Button variant="outline" className="mt-4">Back to Pilots</Button>
        </Link>
      </div>
    );
  }

  // Eligibility evaluation
  const isCompleted = pilot.status === "COMPLETED";
  const isValConfirmed = pilot.validation_status === "VALIDATION_CONFIRMED" || pilot.validation_status === "VALIDATION_SUBMITTED";
  const isSuccess = pilot.success_status === "SUCCESSFUL" || pilot.success_status === "PARTIALLY_SUCCESSFUL";
  const eligibleForProcure = isCompleted && isValConfirmed && isSuccess;

  // Divergence check with validator recommendation
  const validatorRec = valSummary?.report?.recommended_outcome || pilot.validator_assessment;
  const isDivergent = decisionType === "PROCEED_TO_PROCUREMENT" && validatorRec === "UNSUCCESSFUL";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/government/pilots/${pilotId}/validation`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Step 7 Validation
          </Link>
          <Badge variant="gov" className="text-xs">
            Step 8: Procurement Decision Gate
          </Badge>
        </div>

        {/* Header Dossier */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">
                {pilot.pilot_code || "PILOT-SANDBOX"}
              </span>
              <span className="text-slate-300">•</span>
              <Badge variant={eligibleForProcure ? "success" : "secondary"} className="text-xs">
                {pilot.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Procurement Decision & Transition Gate
            </h1>
            <p className="text-xs text-slate-600">
              Department: <strong>{pilot.department?.name || "Nodal Department"}</strong> • Startup: <strong>{pilot.startup?.company_name || "Innovator"}</strong>
            </p>
          </div>

          <div className="text-right flex flex-col sm:items-end gap-1">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Pilot Success Status
            </span>
            <Badge
              variant={
                pilot.success_status === "SUCCESSFUL"
                  ? "success"
                  : pilot.success_status === "PARTIALLY_SUCCESSFUL"
                  ? "default"
                  : "destructive"
              }
              className="text-xs font-bold px-3 py-1"
            >
              {pilot.success_status || "NOT_ASSESSED"}
            </Badge>
          </div>
        </div>

        {/* Step 7 Validation Evidence Bridge */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-sm tracking-wide">
                Underlying Empirical Validation Evidence (Step 7)
              </h2>
            </div>
            <Link
              href={`/government/pilots/${pilotId}/validation`}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View Full Audit Report <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Composite KPI Score</span>
              <span className="text-2xl font-bold text-emerald-400">
                {valSummary?.report?.composite_score != null ? `${valSummary.report.composite_score.toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Validator Recommendation</span>
              <span className="text-base font-bold text-slate-200">
                {validatorRec || "Pending Audit"}
              </span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Confirmed Government Classification</span>
              <span className="text-base font-bold text-amber-300">
                {pilot.success_status || "Pending"}
              </span>
            </div>
          </div>

          {valSummary?.report?.recommendations && (
            <div className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-700/40">
              <span className="font-semibold text-slate-200">Validator Recommendations: </span>
              {valSummary.report.recommendations}
            </div>
          )}
        </div>

        {/* Eligibility Check Gate Warnings */}
        {!eligibleForProcure && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm">
                Pilot Outcome Does Not Currently Support Standard Procurement Progression
              </h4>
              <p>
                Standard procurement progression requires the pilot to be in <strong>COMPLETED</strong> status with confirmed <strong>SUCCESSFUL</strong> or <strong>PARTIALLY_SUCCESSFUL</strong> independent validation.
              </p>
              <p className="text-slate-600">
                Government may still record a non-procurement administrative decision below such as <em>Re-Pilot</em>, <em>Do Not Proceed</em>, or <em>Further Review</em>.
              </p>
            </div>
          </div>
        )}

        {/* Divergence Warning */}
        {isDivergent && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold">Statutory Audit Divergence Warning</h4>
              <p>
                The accredited independent validator evaluated this pilot outcome as <strong>UNSUCCESSFUL</strong>. Proceeding to procurement creates a formal statutory divergence. Your rationale will be permanently recorded in the immutable GFR 2017 audit log.
              </p>
            </div>
          </div>
        )}

        {/* Existing Decision Summary if already created */}
        {existingDecision && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm">
                  Active Procurement Decision: {existingDecision.procurement_code}
                </h3>
              </div>
              <Badge variant="success" className="text-xs font-mono">
                {existingDecision.decision_status}
              </Badge>
            </div>
            <p className="text-xs text-emerald-800">
              <strong>Type:</strong> {existingDecision.decision_type} • <strong>Estimated Value:</strong> ₹{existingDecision.estimated_value?.toLocaleString("en-IN") || "0"}
            </p>
            <p className="text-xs text-slate-700 italic">
              "{existingDecision.rationale}"
            </p>
            {existingDecision.decision_status === "APPROVED" && existingDecision.decision_type === "PROCEED_TO_PROCUREMENT" && (
              <div className="pt-2">
                <Link href="/government/procurement">
                  <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5">
                    Proceed to Procurement Transition <FileCheck2 className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Procurement Decision Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Record Formal Procurement Determination
            </h3>
            <p className="text-xs text-slate-500">
              Authorizes the next statutory phase based on empirical pilot outcome telemetry.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Decision Type Radio / Select */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Procurement Decision Determination *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "PROCEED_TO_PROCUREMENT",
                  title: "Proceed to Procurement",
                  desc: "Authorize procurement transition under configured pathway (Requires validated success).",
                  disabled: !eligibleForProcure,
                },
                {
                  id: "RE_PILOT",
                  title: "Re-Pilot",
                  desc: "Recommend extended operational trial with revised criteria.",
                  disabled: false,
                },
                {
                  id: "DO_NOT_PROCEED",
                  title: "Do Not Proceed",
                  desc: "Close the innovation file. Findings do not justify public procurement.",
                  disabled: false,
                },
                {
                  id: "FURTHER_REVIEW",
                  title: "Further Review",
                  desc: "Refer to high-level departmental committee before determination.",
                  disabled: false,
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => !opt.disabled && setDecisionType(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    opt.disabled
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                      : decisionType === opt.id
                      ? "bg-blue-50/70 border-[#0B2545] ring-2 ring-[#0B2545]/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{opt.title}</span>
                    <input
                      type="radio"
                      name="decision_type"
                      checked={decisionType === opt.id}
                      disabled={opt.disabled}
                      onChange={() => setDecisionType(opt.id)}
                      className="accent-[#0B2545]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Procurement Specifications (Only if PROCEED_TO_PROCUREMENT) */}
          {decisionType === "PROCEED_TO_PROCUREMENT" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Estimated Procurement Value (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Quantity / Licenses *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Currency
                </label>
                <input
                  type="text"
                  value={currency}
                  disabled
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Intended Departmental Procurement Scope *
                </label>
                <textarea
                  rows={2}
                  value={intendedScope}
                  onChange={(e) => setIntendedScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
                  placeholder="Outline intended deployment coverage, user licenses, or hardware units..."
                  required
                />
              </div>
            </div>
          )}

          {/* Rationale Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Statutory Decision Rationale & Technical Justification *
            </label>
            <textarea
              rows={4}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
              placeholder="State the detailed administrative and empirical reasoning behind this decision based on validated KPI telemetry and public interest..."
              required
            />
            <p className="text-[11px] text-slate-400">
              Minimum 10 characters. This rationale forms an immutable component of the public procurement audit trail.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href={`/government/pilots/${pilotId}/validation`}>
              <Button variant="outline" size="sm" type="button" className="text-xs">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording Decision...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Save & Confirm Decision
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
