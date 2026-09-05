"use client";

import React, { useState } from "react";
import {
  Building2,
  Rocket,
  CheckSquare,
  ShieldCheck,
  Scale,
  Settings,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { StakeholderRole } from "@/types";

export function PortalsSection() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<StakeholderRole>("GOVERNMENT");

  const openAuth = (role: StakeholderRole) => {
    setAuthRole(role);
    setAuthModalOpen(true);
  };

  return (
    <>
      <section id="portals" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge variant="gov" className="mb-3">
              Role-Based Portals
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Dedicated Stakeholder Gateways
            </h2>
            <p className="mt-3 text-base text-slate-600">
              GovInnovate provides tailored interfaces for each participant in the public innovation lifecycle, enforcing strict RBAC security and role-specific workflows.
            </p>
          </div>

          {/* Primary Portals: Government & Startup (Prominent Two-Column Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Government Portal Card */}
            <div className="relative rounded-2xl bg-white border-2 border-blue-900/20 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="absolute top-6 right-6">
                <Badge variant="gov">Ministry & Municipalities</Badge>
              </div>
              <div>
                <div className="w-14 h-14 rounded-xl bg-[#0B2545] text-white flex items-center justify-center mb-6">
                  <Building2 className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Government Portal
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Post unresolved operational challenges, define quantitative outcome requirements, approve sandbox pilot agreements, and track real-time KPI metrics.
                </p>
                <div className="space-y-2.5 mb-8">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Outcome-based problem definition builder</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Controlled sandbox pilot management & tranche approvals</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct transition to GeM purchase sanctions</span>
                  </div>
                </div>
              </div>
              <div>
                <Button
                  variant="gov"
                  size="lg"
                  onClick={() => openAuth("GOVERNMENT")}
                  className="w-full justify-center gap-2 text-base font-semibold cursor-pointer"
                  id="portal-card-gov-btn"
                >
                  Access Government Gateway
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Startup Portal Card */}
            <div className="relative rounded-2xl bg-white border-2 border-amber-500/30 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="absolute top-6 right-6">
                <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-800">
                  DPIIT Startups
                </Badge>
              </div>
              <div>
                <div className="w-14 h-14 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-6">
                  <Rocket className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Startup Portal
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Discover government challenges matching your solution, submit technical proposals without prohibitive turnover constraints, and deploy paid pilot sandboxes.
                </p>
                <div className="space-y-2.5 mb-8">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Zero turnover / prior experience exemption under Startup India</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Funded pilot sandbox deployment with milestone grant tranches</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct GeM Startup Runway listing on successful validation</span>
                  </div>
                </div>
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => openAuth("STARTUP")}
                  className="w-full justify-center gap-2 text-base font-semibold cursor-pointer"
                  id="portal-card-startup-btn"
                >
                  Access Startup Gateway
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Specialized Secondary Stakeholder Portals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expert Evaluator */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Expert Evaluator Portal
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Independent technical, feasibility, and commercial scoring on structured rubrics.
              </p>
              <button
                onClick={() => openAuth("EXPERT_EVALUATOR")}
                className="text-xs font-semibold text-indigo-700 flex items-center gap-1 cursor-pointer hover:underline"
              >
                Evaluator Access <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Independent Validator */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Independent Validator Portal
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Accredited testing labs (STQC/IITs) verifying empirical KPI achievements.
              </p>
              <button
                onClick={() => openAuth("INDEPENDENT_VALIDATOR")}
                className="text-xs font-semibold text-emerald-700 flex items-center gap-1 cursor-pointer hover:underline"
              >
                Validator Access <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Procurement Officer */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center mb-3">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                Procurement Officer Portal
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Sanction order creation, GeM catalogue verification, and GFR 2017 legal compliance.
              </p>
              <button
                onClick={() => openAuth("PROCUREMENT_OFFICER")}
                className="text-xs font-semibold text-blue-900 flex items-center gap-1 cursor-pointer hover:underline"
              >
                Procurement Access <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Platform Administrator */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
                <Settings className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">
                System Administration
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                User identity provisioning, RBAC governance, and immutable audit inspection.
              </p>
              <button
                onClick={() => openAuth("ADMIN")}
                className="text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer hover:underline"
              >
                Admin Portal <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultRole={authRole}
      />
    </>
  );
}
