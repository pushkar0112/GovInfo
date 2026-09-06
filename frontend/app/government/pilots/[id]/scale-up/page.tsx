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
  TrendingUp,
  Building2,
  ShieldCheck,
  Award,
  ArrowLeft,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export default function PilotScaleUpGatePage() {
  const params = useParams();
  const pilotId = params.id as string;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <PilotScaleUpGateContent pilotId={pilotId} />
    </ProtectedRoute>
  );
}

function PilotScaleUpGateContent({ pilotId }: { pilotId: string }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [pilot, setPilot] = useState<any>(null);
  const [existingDecisions, setExistingDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [decision, setDecision] = useState("APPROVED_FOR_SCALE");
  const [scaleType, setScaleType] = useState("MULTI_DISTRICT_EXPANSION");
  const [budgetCeiling, setBudgetCeiling] = useState(5000000);
  const [departments, setDepartments] = useState("");
  const [jurisdictions, setJurisdictions] = useState("");
  const [justification, setJustification] = useState("");

  useEffect(() => {
    loadPilotData();
  }, [pilotId]);

  const loadPilotData = async () => {
    try {
      setLoading(true);
      const [pilotData, allDecisions] = await Promise.all([
        apiRequest<any>(`/api/v1/pilots/${pilotId}`),
        apiRequest<any[]>(`/api/v1/government/scale-up/decisions`).catch(() => []),
      ]);
      setPilot(pilotData);
      setDepartments(pilotData?.department || "Primary Ministry");
      setJurisdictions("Rajasthan, Madhya Pradesh, Gujarat");
      setJustification(
        `Pilot demonstrated high feasibility, meeting statutory threshold criteria during independent validation.`
      );

      const related = (allDecisions || []).filter((d) => String(d.pilot_id) === String(pilotId));
      setExistingDecisions(related);
    } catch (err) {
      console.error("Failed to load pilot", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMessage(null);
      const payload = {
        pilot_id: parseInt(pilotId),
        decision: decision,
        recommended_scale_type: scaleType,
        target_departments: departments.split(",").map((s) => s.trim()),
        target_jurisdictions: jurisdictions.split(",").map((s) => s.trim()),
        estimated_budget_ceiling: parseFloat(String(budgetCeiling)),
        justification: justification,
      };

      const res = await apiRequest<any>("/api/v1/government/scale-up/decisions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage({
        text: `Scale Decision ${res.decision_code} created successfully!`,
        type: "success",
      });
      await loadPilotData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to record scale decision.", type: "error" });
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          href={`/government/pilots/${pilotId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B2545]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pilot Sandbox
        </Link>

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

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {pilot?.pilot_code}
                </span>
                <Badge variant="success" className="text-[10px]">
                  {pilot?.status}
                </Badge>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Propose Pilot for Scale-Up & Replication (Step 9)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Initiate formal scale-up decision pathway following completed pilot validation.
              </p>
            </div>
            <Scale className="w-8 h-8 text-[#0B2545]" />
          </div>

          {/* Existing Decisions */}
          {existingDecisions.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Existing Scale Decisions:</span>
              {existingDecisions.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700">{d.decision_code}</span>
                    <Badge variant="default" className="text-[10px]">
                      {d.status}
                    </Badge>
                    <span className="text-slate-600">{d.decision}</span>
                  </div>
                  <Link href="/government/scale-up/decisions">
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Scale-Up Decision</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
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
                value={scaleType}
                onChange={(e) => setScaleType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="MULTI_DISTRICT_EXPANSION">MULTI-DISTRICT EXPANSION</option>
                <option value="STATE_WIDE_ROLLOUT">STATE-WIDE ROLLOUT</option>
                <option value="PAN_INDIA_DEPLOYMENT">PAN-INDIA DEPLOYMENT</option>
                <option value="CROSS_DEPARTMENT_REPLICATION">CROSS-DEPARTMENT REPLICATION</option>
                <option value="CENTRAL_SECTOR_SCHEME_INTEGRATION">CENTRAL SECTOR SCHEME INTEGRATION</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Departments</label>
                <input
                  type="text"
                  value={departments}
                  onChange={(e) => setDepartments(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Estimated Budget Ceiling (₹)</label>
                <input
                  type="number"
                  value={budgetCeiling}
                  onChange={(e) => setBudgetCeiling(parseFloat(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Jurisdictions</label>
              <input
                type="text"
                value={jurisdictions}
                onChange={(e) => setJurisdictions(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Validation Justification</label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-semibold"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Scale Decision"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
