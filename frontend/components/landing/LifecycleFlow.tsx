"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  FileText,
  Lightbulb,
  CheckSquare,
  FlaskConical,
  FileBadge,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LifecycleStage {
  step: number;
  id: string;
  name: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  keyOutputs: string[];
  procurementContext: string;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    step: 1,
    id: "problem",
    name: "Problem",
    shortLabel: "Problem Definition",
    icon: HelpCircle,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    description:
      "Government ministry or municipal department identifies a real operational friction, service delivery gap, or civic bottleneck.",
    keyOutputs: ["Unmet operational need", "Citizen pain points", "Baseline metric data"],
    procurementContext: "No tender yet. Focuses on the problem rather than pre-specifying technology vendors.",
  },
  {
    step: 2,
    id: "challenge",
    name: "Challenge",
    shortLabel: "Outcome Definition",
    icon: FileText,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description:
      "The problem is structured into an open, outcome-driven challenge with quantitative KPIs and pilot budget ceiling.",
    keyOutputs: ["Outcome specification", "Objective success metrics", "Public challenge posting"],
    procurementContext: "Replaces restrictive legacy technical specifications with measurable target outcomes.",
  },
  {
    step: 3,
    id: "startup",
    name: "Startup",
    shortLabel: "Startup Discovery",
    icon: Lightbulb,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description:
      "DPIIT-registered startups and innovators discover challenges aligned with their solution and submit technical proposals.",
    keyOutputs: ["DPIIT verification check", "Solution readiness (TRL 7+)", "Pilot execution plan"],
    procurementContext: "Bypasses prohibitive turnover/prior experience hurdles under Startup India exemptions.",
  },
  {
    step: 4,
    id: "evaluation",
    name: "Evaluation",
    shortLabel: "Expert Evaluation",
    icon: CheckSquare,
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    description:
      "Independent multidisciplinary evaluation committees score proposals on feasibility, impact, and deployment readiness.",
    keyOutputs: ["Dual technical/commercial score", "Committee consensus", "Sandbox shortlist"],
    procurementContext: "Transparent, auditable scoring rubric recorded on an immutable ledger.",
  },
  {
    step: 5,
    id: "pilot",
    name: "Pilot",
    shortLabel: "Controlled Pilot",
    icon: FlaskConical,
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    description:
      "Shortlisted startup deploys solution in a live government operational sandbox under controlled, time-bound pilot conditions.",
    keyOutputs: ["Sandbox deployment agreement", "Milestone tranches", "Live operational telemetry"],
    procurementContext: "Low-risk sandbox trial protecting public funds before large-scale commercial procurement.",
  },
  {
    step: 6,
    id: "evidence",
    name: "Evidence",
    shortLabel: "Independent Validation",
    icon: FileBadge,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description:
      "Accredited third-party testing agencies (e.g., IITs, STQC) audit pilot performance against predefined quantifiable KPIs.",
    keyOutputs: ["Empirical audit report", "KPI achievement verification", "Readiness certificate"],
    procurementContext: "Provides the legal evidence threshold required for non-tendered single-source adoption.",
  },
  {
    step: 7,
    id: "scale",
    name: "Scale",
    shortLabel: "Procurement Scale-Up",
    icon: TrendingUp,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description:
      "Verified innovation transitions into scaled adoption via GeM Startup Runway or direct sanction orders under GFR provisions.",
    keyOutputs: ["GeM catalogue listing", "Departmental sanction order", "Pan-India replication"],
    procurementContext: "Complies with General Financial Rules (GFR 2017) Rule 149 through verified proof of concept.",
  },
];

export function LifecycleFlow() {
  const [selectedStage, setSelectedStage] = useState<LifecycleStage>(LIFECYCLE_STAGES[0]);

  return (
    <section id="lifecycle" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="gov" className="mb-3">
            End-to-End Innovation Pipeline
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            The GovInnovate Lifecycle
          </h2>
          <p className="mt-3 text-base text-slate-600">
            A continuous, transparent bridge connecting public problem identification directly to legally compliant procurement.
          </p>
        </div>

        {/* Desktop Connected Lifecycle Visualizer */}
        <div className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 lg:gap-3 items-stretch">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = selectedStage.id === stage.id;
              const isLast = idx === LIFECYCLE_STAGES.length - 1;

              return (
                <div key={stage.id} className="relative flex flex-col">
                  <button
                    onClick={() => setSelectedStage(stage)}
                    className={`h-full flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-[#0B2545] bg-blue-50/50 shadow-sm ring-2 ring-[#0B2545]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Step indicator */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-[10px] font-bold text-slate-400">
                        0{stage.step}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545]" />
                      )}
                    </div>

                    {/* Stage Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg ${stage.bgColor} ${stage.borderColor} border flex items-center justify-center mb-2.5`}
                    >
                      <Icon className={`w-5 h-5 ${stage.color}`} />
                    </div>

                    {/* Stage Name */}
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {stage.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block">
                      {stage.shortLabel}
                    </span>
                  </button>

                  {/* Flow Arrow (visible between columns on large displays) */}
                  {!isLast && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-300">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Stage Inspector Card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${selectedStage.bgColor} ${selectedStage.borderColor} border flex items-center justify-center shrink-0`}
              >
                {React.createElement(selectedStage.icon, {
                  className: `w-6 h-6 ${selectedStage.color}`,
                })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Stage 0{selectedStage.step} of 07
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedStage.shortLabel}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedStage.name}: {selectedStage.shortLabel}
                </h3>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Full Governance Audit Trail Maintained</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Description */}
            <div className="md:col-span-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Stage Overview
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedStage.description}
              </p>
            </div>

            {/* Key Deliverables */}
            <div className="md:col-span-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Verifiable Outputs
              </h4>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {selectedStage.keyOutputs.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-[#0B2545] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Public Procurement Alignment */}
            <div className="md:col-span-1 bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
                Procurement Law Alignment
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedStage.procurementContext}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
