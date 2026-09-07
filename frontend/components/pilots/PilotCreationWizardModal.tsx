"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  MapPin,
  Calendar,
  Building2,
  Rocket,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  FlaskConical,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";

interface PilotCreationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: {
    id: string;
    application_code: string;
    challenge_id: string;
    challenge_title: string;
    startup_id: string;
    startup_name: string;
    proposal_title: string;
    executive_summary?: string;
    problem_understanding?: string;
    proposed_solution?: string;
    expected_outcomes?: string;
    pilot_plan?: string;
    timeline_days?: number;
    requested_budget?: number;
  };
  onPilotCreated?: (pilot: any) => void;
}

interface MilestoneInput {
  sequence_number: number;
  title: string;
  objective: string;
  description: string;
  weight: number;
  tranche_amount: number;
  planned_end_date: string;
}

export function PilotCreationWizardModal({
  isOpen,
  onClose,
  application,
  onPilotCreated,
}: PilotCreationWizardModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
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

  // Initial milestones state
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);

  useEffect(() => {
    if (application) {
      setPilotTitle(application.proposal_title ? `Pilot Sandbox: ${application.proposal_title}` : `Pilot Sandbox for ${application.challenge_title}`);
      setObjective(application.executive_summary || `Execute structured sandbox validation for ${application.proposal_title}`);
      setScope(application.pilot_plan || application.executive_summary || "Controlled sandbox field deployment.");
      setProblemStatement(application.problem_understanding || "");
      setProposedSolution(application.proposed_solution || "");
      setExpectedOutcomes(application.expected_outcomes || "");
      setPilotLocation("State Health Innovation Sandbox Facility");
      setOperatingRegions("Primary Pilot Deployment Zone");
      
      const today = new Date();
      const sDate = today.toISOString().split("T")[0];
      setStartDate(sDate);

      const days = application.timeline_days || 90;
      setDurationDays(days);
      const eDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setPlannedEndDate(eDate);

      const budget = application.requested_budget || 1500000;
      setPilotBudget(budget);

      // Pre-seed 3 balanced milestones summing to 100%
      const m1Date = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const m2Date = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const m3Date = eDate;

      setMilestones([
        {
          sequence_number: 1,
          title: "Hardware / Infrastructure Calibration & Baseline Deployment",
          objective: "Establish operational baseline and integrate telemetry instruments at sandbox location.",
          description: "Deploy baseline hardware and configure secure telemetry ingestion.",
          weight: 30,
          tranche_amount: Math.round(budget * 0.3),
          planned_end_date: m1Date,
        },
        {
          sequence_number: 2,
          title: "Controlled Field Sandbox Trial Execution & Telemetry Logging",
          objective: "Conduct field trials across representative user cohorts and generate telemetry logs.",
          description: "Execute operational trials and document empirical performance logs.",
          weight: 40,
          tranche_amount: Math.round(budget * 0.4),
          planned_end_date: m2Date,
        },
        {
          sequence_number: 3,
          title: "Final Performance Assessment, Deliverable Dossier & Handover",
          objective: "Synthesize operational findings and compile technical verification evidence.",
          description: "Deliver final pilot completion report and audited evidence data.",
          weight: 30,
          tranche_amount: Math.round(budget * 0.3),
          planned_end_date: m3Date,
        },
      ]);
    }
  }, [application]);

  if (!isOpen) return null;

  const totalMilestoneWeight = milestones.reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const isWeightValid = Math.abs(totalMilestoneWeight - 100.0) < 0.01;

  const handleAddMilestone = () => {
    const nextSeq = milestones.length + 1;
    const remainingWeight = Math.max(0, 100 - totalMilestoneWeight);
    setMilestones([
      ...milestones,
      {
        sequence_number: nextSeq,
        title: `Milestone 0${nextSeq}: Technical Deliverable`,
        objective: "Define specific outcome and deliverable criteria.",
        description: "Milestone scope and evidence requirements.",
        weight: remainingWeight,
        tranche_amount: 0,
        planned_end_date: plannedEndDate,
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    const filtered = milestones.filter((_, i) => i !== index);
    const reindexed = filtered.map((m, idx) => ({
      ...m,
      sequence_number: idx + 1,
    }));
    setMilestones(reindexed);
  };

  const handleUpdateMilestone = (index: number, field: keyof MilestoneInput, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      application_id: application.id,
      pilot_title: pilotTitle.trim(),
      objective: objective.trim() || undefined,
      scope: scope.trim() || undefined,
      problem_statement: problemStatement.trim() || undefined,
      proposed_solution: proposedSolution.trim() || undefined,
      expected_outcomes: expectedOutcomes.trim() || undefined,
      pilot_location: pilotLocation.trim() || "State Innovation Sandbox",
      operating_regions: operatingRegions.trim() || undefined,
      start_date: startDate || undefined,
      planned_end_date: plannedEndDate || undefined,
      duration_days: durationDays || 90,
      pilot_budget: pilotBudget || 0,
      currency: "INR",
      milestones: milestones.map((m) => ({
        sequence_number: m.sequence_number,
        title: m.title.trim(),
        objective: m.objective.trim() || undefined,
        description: m.description.trim() || undefined,
        weight: Number(m.weight) || 0,
        tranche_amount: Number(m.tranche_amount) || 0,
        planned_end_date: m.planned_end_date || undefined,
      })),
    };

    try {
      const result = await apiRequest<any>("/api/v1/government/pilots", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (onPilotCreated) {
        onPilotCreated(result);
      }
      onClose();
      router.push(`/government/pilots/${result.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize pilot sandbox.");
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Scope & Objectives" },
    { num: 2, label: "Location & Region" },
    { num: 3, label: "Timeline & Duration" },
    { num: 4, label: "Sanctioned Budget" },
    { num: 5, label: "Stakeholders" },
    { num: 6, label: "Milestones & Weights" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full my-8 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B2545] text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Operational Pilot Sandbox Provisioning Wizard
                </h2>
                <Badge variant="gov" className="text-[10px]">
                  Step {currentStep} of 6
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                GFR 2017 & Public Sector Innovation Sandbox Commissioning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div className="grid grid-cols-6 gap-1 border-b border-slate-100 pb-4">
          {steps.map((s) => {
            const isActive = s.num === currentStep;
            const isDone = s.num < currentStep;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex flex-col items-center text-center p-1 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-900 font-bold"
                    : isDone
                    ? "text-emerald-700 hover:bg-slate-50"
                    : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold ${
                    isActive
                      ? "bg-[#0B2545] text-white"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isDone ? "✓" : s.num}
                </div>
                <span className="text-[10px] truncate max-w-full hidden sm:inline">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-4 min-h-[300px]">
          {/* Step 1: Scope & Objectives */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Associated Proposal</span>
                  <span className="font-bold text-slate-800">
                    {application.application_code} • {application.startup_name}
                  </span>
                </div>
                <Badge variant="gov" className="text-[10px]">
                  {application.challenge_title}
                </Badge>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilot Sandbox Title *
                </label>
                <input
                  type="text"
                  value={pilotTitle}
                  onChange={(e) => setPilotTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="e.g. PHC Rural Tele-Triage Field Sandbox Trial"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  High-Level Objective *
                </label>
                <textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="State the core experimental goal of this operational deployment..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope of Work & Boundaries
                </label>
                <textarea
                  rows={3}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="Define technical sandbox parameters, inclusion/exclusion criteria, and operational environments..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Location & Region */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-blue-900 inline mr-1.5" />
                Specify physical testbeds, department facilities, hospitals, or pilot labs where the solution will be validated.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sandbox Operational Facility / Site *
                </label>
                <input
                  type="text"
                  value={pilotLocation}
                  onChange={(e) => setPilotLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="e.g. Alwar District Sub-Divisional Health Centres, Rajasthan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Regions / Jurisdictions
                </label>
                <input
                  type="text"
                  value={operatingRegions}
                  onChange={(e) => setOperatingRegions(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="e.g. Northern Health Zone (Rajasthan, Haryana)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Measurable Outcomes
                </label>
                <textarea
                  rows={3}
                  value={expectedOutcomes}
                  onChange={(e) => setExpectedOutcomes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  placeholder="Describe empirical success criteria to be audited during and after deployment..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Duration */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Planned Completion Date *
                  </label>
                  <input
                    type="date"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={14}
                    max={730}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 90)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Pilots are capped sandbox engagements (typically 90-180 days) under GFR 2017 innovation exemptions.
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Sanctioned Budget */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sanctioned Pilot Grant Budget (INR ₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    ₹
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={pilotBudget}
                    onChange={(e) => setPilotBudget(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 caret-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Amount in words: ₹{(pilotBudget / 100000).toFixed(2)} Lakhs (Requested by startup: ₹{( (application.requested_budget || 0) / 100000).toFixed(2)} Lakhs)
                </span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Milestone-Bound Tranche Releases
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Funds are not disbursed lump-sum. The platform enforces that tranches are disbursed strictly upon verified deliverable acceptance.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Stakeholders */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="w-4 h-4 text-blue-900" />
                  Government Sponsoring Authority
                </div>
                <p className="text-slate-600 text-xs">
                  Challenge Host Department: <strong>{application.challenge_title}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  The authenticated nodal officer will act as the supervisory authority overseeing milestones, reviews, and lifecycle decisions.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Rocket className="w-4 h-4 text-amber-600" />
                  Deploying Startup Partner
                </div>
                <p className="text-slate-600 text-xs">
                  Awarded Startup: <strong>{application.startup_name}</strong> ({application.application_code})
                </p>
                <p className="text-[11px] text-slate-500">
                  The startup engineering lead will be granted access to the Startup Sandbox Workspace to submit milestone deliverables and technical evidence.
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Milestones & Weights */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Weight Budget Monitor */}
              <div className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-900" />
                    <span className="text-xs font-bold text-slate-900">
                      Milestone Weight Allocation
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    To start an active pilot, milestone weights must sum to exactly 100.0%.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total Weight</span>
                    <span className={`text-base font-extrabold ${isWeightValid ? "text-emerald-700" : "text-amber-600"}`}>
                      {totalMilestoneWeight.toFixed(1)}% / 100%
                    </span>
                  </div>
                  <Badge variant={isWeightValid ? "success" : "warning"} className="text-xs">
                    {isWeightValid ? "100% Valid" : `${(100 - totalMilestoneWeight).toFixed(1)}% Remaining`}
                  </Badge>
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {milestones.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-100">
                          #{m.sequence_number}
                        </span>
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => handleUpdateMilestone(idx, "title", e.target.value)}
                          placeholder="Milestone title..."
                          className="font-semibold text-slate-900 bg-white px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] caret-slate-900 placeholder:text-slate-400 text-xs w-64 sm:w-80"
                        />
                      </div>

                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Weight (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={m.weight}
                          onChange={(e) => handleUpdateMilestone(idx, "weight", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Tranche (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={5000}
                          value={m.tranche_amount}
                          onChange={(e) => handleUpdateMilestone(idx, "tranche_amount", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Target Due Date
                        </label>
                        <input
                          type="date"
                          value={m.planned_end_date}
                          onChange={(e) => handleUpdateMilestone(idx, "planned_end_date", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={m.objective}
                        onChange={(e) => handleUpdateMilestone(idx, "objective", e.target.value)}
                        placeholder="Deliverable description or acceptance criteria..."
                        className="w-full px-2 py-1 text-[11px] text-slate-900 border border-slate-300 rounded bg-white caret-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMilestone}
                className="text-xs gap-1.5 border-dashed border-slate-300 w-full"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentStep === 1 || submitting}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>

            {currentStep < 6 ? (
              <Button
                type="button"
                variant="gov"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                className="text-xs font-semibold gap-1.5"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="gov"
                size="sm"
                disabled={submitting || !pilotTitle.trim()}
                onClick={handleSubmit}
                className="text-xs font-bold gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
                )}
                Initialize Sandbox Pilot
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
