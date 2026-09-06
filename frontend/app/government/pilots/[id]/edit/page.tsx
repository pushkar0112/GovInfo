"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FlaskConical,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Coins,
  ShieldCheck,
} from "lucide-react";

export default function GovernmentPilotEditPage() {
  const params = useParams();
  const router = useRouter();
  const pilotId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [pilotCode, setPilotCode] = useState("");
  const [pilotTitle, setPilotTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [expectedOutcomes, setExpectedOutcomes] = useState("");
  const [pilotLocation, setPilotLocation] = useState("");
  const [operatingRegions, setOperatingRegions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [durationDays, setDurationDays] = useState(90);
  const [pilotBudget, setPilotBudget] = useState(0);

  useEffect(() => {
    async function loadPilot() {
      try {
        const data = await apiRequest<any>(`/api/v1/government/pilots/${pilotId}`);
        setPilotCode(data.pilot_code || "");
        setPilotTitle(data.pilot_title || data.title || "");
        setObjective(data.objective || "");
        setScope(data.scope || data.scope_of_work || "");
        setProblemStatement(data.problem_statement || "");
        setProposedSolution(data.proposed_solution || "");
        setExpectedOutcomes(data.expected_outcomes || "");
        setPilotLocation(data.pilot_location || data.sandbox_location || "");
        setOperatingRegions(data.operating_regions || "");
        setStartDate(data.start_date || "");
        setPlannedEndDate(data.planned_end_date || data.end_date || "");
        setDurationDays(data.duration_days || 90);
        setPilotBudget(data.pilot_budget || data.approved_budget || 0);
      } catch (err: any) {
        setError(err.message || "Failed to load pilot data.");
      } finally {
        setLoading(false);
      }
    }

    if (pilotId) {
      loadPilot();
    }
  }, [pilotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      pilot_title: pilotTitle.trim(),
      objective: objective.trim() || undefined,
      scope: scope.trim() || undefined,
      problem_statement: problemStatement.trim() || undefined,
      proposed_solution: proposedSolution.trim() || undefined,
      expected_outcomes: expectedOutcomes.trim() || undefined,
      pilot_location: pilotLocation.trim() || undefined,
      operating_regions: operatingRegions.trim() || undefined,
      start_date: startDate || undefined,
      planned_end_date: plannedEndDate || undefined,
      duration_days: durationDays || 90,
      pilot_budget: pilotBudget || 0,
    };

    try {
      await apiRequest(`/api/v1/government/pilots/${pilotId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      router.push(`/government/pilots/${pilotId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update pilot specifications.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Nav */}
          <Link
            href={`/government/pilots/${pilotId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Back to Dossier
          </Link>

          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {pilotCode || "PILOT-SANDBOX"}
              </span>
              <Badge variant="gov">Edit Sandbox Specifications</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Update Pilot Sandbox Parameters
            </h1>
            <p className="text-xs text-slate-500">
              Modify operational objectives, field testbed locations, schedules, and financial allocations.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6 text-xs">
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                1. Core Identity & Objectives
              </h2>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilot Sandbox Title *
                </label>
                <input
                  type="text"
                  required
                  value={pilotTitle}
                  onChange={(e) => setPilotTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Experimental Objective
                </label>
                <textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Scope of Work & Boundaries
                </label>
                <textarea
                  rows={3}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                2. Technical Architecture & Outcomes
              </h2>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Problem Diagnosis
                </label>
                <textarea
                  rows={2}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Solution Architecture
                </label>
                <textarea
                  rows={2}
                  value={proposedSolution}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expected Measurable Outcomes
                </label>
                <textarea
                  rows={2}
                  value={expectedOutcomes}
                  onChange={(e) => setExpectedOutcomes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                3. Sandbox Locations & Regional Bounds
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Operational Site / Sandbox Facility
                  </label>
                  <input
                    type="text"
                    value={pilotLocation}
                    onChange={(e) => setPilotLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Operating Regions / Jurisdictions
                  </label>
                  <input
                    type="text"
                    value={operatingRegions}
                    onChange={(e) => setOperatingRegions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                4. Schedule & Sanctioned Financials
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deployment Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Planned Completion Date
                  </label>
                  <input
                    type="date"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={14}
                    max={730}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 90)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sanctioned Pilot Grant Budget (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={pilotBudget}
                  onChange={(e) => setPilotBudget(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Amount in words: ₹{(pilotBudget / 100000).toFixed(2)} Lakhs
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href={`/government/pilots/${pilotId}`}>
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="gov"
                size="sm"
                disabled={saving || !pilotTitle.trim()}
                className="text-xs font-bold gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
