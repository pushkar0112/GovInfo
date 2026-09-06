import React from "react";
import { Scale, CheckCircle2, FileCheck, ShieldAlert, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GovernanceSection() {
  return (
    <section id="governance" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="gov" className="mb-3">
            Public Procurement Compliance
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Complements Public Procurement Laws
          </h2>
          <p className="mt-3 text-base text-slate-600">
            GovInnovate is built from the ground up to operate within the existing Indian legal and fiscal frameworks (General Financial Rules 2017, GeM, and DPIIT), ensuring audit-safe scale-up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1: No Legal Bypass */}
          <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/60">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center mb-4">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              GFR 2017 & GeM Synergy
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Rather than attempting to replace government tenders, GovInnovate generates the legal, empirical evidentiary documentation required under GFR Rule 149 and Rule 194 for direct innovation procurement.
            </p>
            <div className="pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>CAG & CVC Audit-Compliant Records</span>
            </div>
          </div>

          {/* Pillar 2: Empirical Proof of Concept */}
          <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/60">
            <div className="w-10 h-10 rounded-lg bg-[#0B2545] text-white flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Empirical Evidence Over Claims
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Procurement decisions are not based on subjective marketing pitches, but on verified telemetry, field trials, and independent laboratory certification against agreed benchmarks.
            </p>
            <div className="pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Independent Testing Agency Certification</span>
            </div>
          </div>

          {/* Pillar 3: De-Risked Milestone Financing */}
          <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/60">
            <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Milestone-Based Sandbox Tranches
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Pilot funding is capped and tied strictly to measurable milestone deliverables. Government funds are safeguarded while giving startups the liquidity needed to demonstrate value.
            </p>
            <div className="pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Large-Scale Financial Risk</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
