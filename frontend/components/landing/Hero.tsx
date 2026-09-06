"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { StakeholderRole } from "@/types";
import {
  Building2,
  Rocket,
  ShieldCheck,
  Award,
  Scale,
  ArrowRight,
  FileCheck,
} from "lucide-react";

export function Hero() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<StakeholderRole>("GOVERNMENT");

  const triggerAuth = (role: StakeholderRole) => {
    setAuthRole(role);
    setAuthModalOpen(true);
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 border-b border-slate-200 py-16 sm:py-24">
        {/* Subtle structural grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Official badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              <Badge variant="gov" className="py-1 px-3 text-xs gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
                Smart India Hackathon • Public Innovation Procurement Framework
              </Badge>
            </div>

            {/* Platform Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 font-sans mb-4">
              <span className="text-[#0B2545]">Gov</span>
              <span className="text-[#B45309]">Innovate</span>
            </h1>

            {/* Exact Required Main Tagline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-800 tracking-tight mb-6">
              &ldquo;From Government Problems to Proven Innovation&rdquo;
            </h2>

            {/* Exact Required Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10">
              A transparent, startup-friendly platform to discover, pilot, validate and scale innovative solutions for public-sector challenges.
            </p>

            {/* Primary Action Buttons: Government Portal & Startup Portal */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Button
                variant="gov"
                size="lg"
                onClick={() => triggerAuth("GOVERNMENT")}
                className="w-full sm:w-auto text-base px-8 py-3.5 gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
                id="hero-btn-government-portal"
              >
                <Building2 className="w-5 h-5 text-amber-400" />
                <span className="font-semibold">Government Portal</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => triggerAuth("STARTUP")}
                className="w-full sm:w-auto text-base px-8 py-3.5 gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
                id="hero-btn-startup-portal"
              >
                <Rocket className="w-5 h-5" />
                <span className="font-semibold">Startup Portal</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </Button>
            </div>

            {/* Governance Credibility Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-white/80 shadow-2xs">
                <div className="p-2 rounded-md bg-blue-50 text-blue-900 shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Legal Procurement Pathway
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Complements GFR 2017 & GeM Rule 149 instead of bypassing tender laws.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-white/80 shadow-2xs">
                <div className="p-2 rounded-md bg-amber-50 text-amber-700 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Third-Party Validation
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Empirical KPI testing by accredited institutions (IITs / STQC).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 bg-white/80 shadow-2xs">
                <div className="p-2 rounded-md bg-emerald-50 text-emerald-800 shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Milestone-Bound Pilots
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    De-risked government trials with structured tranches & deliverables.
                  </p>
                </div>
              </div>
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
