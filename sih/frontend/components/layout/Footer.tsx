"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export function Footer() {
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiService, setApiService] = useState<string>("");

  useEffect(() => {
    async function checkApi() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok") {
            setApiStatus("online");
            setApiService(data.service || "govinnovate-api");
            return;
          }
        }
        setApiStatus("offline");
      } catch {
        setApiStatus("offline");
      }
    }

    checkApi();
  }, []);

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Identity & Scope */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-md bg-blue-900 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <span className="font-bold text-lg tracking-tight">GovInnovate</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              A startup-friendly public sector innovation procurement platform.
              Bridging government operational challenges with DPIIT startup innovation through structured pilots, objective KPI verification, and legal procurement pathways.
            </p>
            {/* System Health Check Indicator */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs">
                {apiStatus === "checking" && (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-slate-400">Verifying API Health...</span>
                  </>
                )}
                {apiStatus === "online" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-medium">API Online ({apiService})</span>
                  </>
                )}
                {apiStatus === "offline" && (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="text-slate-300">API Offline (Start Backend :8000)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lifecycle & Framework */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Procurement Lifecycle
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>1. Problem Statement Definition</li>
              <li>2. Outcome-Based Challenge</li>
              <li>3. DPIIT Startup Discovery</li>
              <li>4. Expert Technical Evaluation</li>
              <li>5. Controlled Sandbox Pilot</li>
              <li>6. Independent 3rd-Party Audit</li>
              <li>7. Scale & Direct GeM Contract</li>
            </ul>
          </div>

          {/* Governance & Compliance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Governance & Compliance
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>General Financial Rules (GFR) 2017</li>
              <li>GeM Rule 149 Innovation Pathway</li>
              <li>DPIIT Startup Eligibility Standards</li>
              <li>Role-Based Access Control (RBAC)</li>
              <li>Immutable Anti-Tamper Audit Trails</li>
              <li>Milestone-Based Tranche Security</li>
            </ul>
          </div>

          {/* Stakeholder Portals */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Portals & Stakeholders
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Ministry & Department Officers</li>
              <li>DPIIT-Recognized Startups</li>
              <li>Domain & Technical Evaluators</li>
              <li>Independent Testing Labs (STQC/IITs)</li>
              <li>Procurement & Sanction Authorities</li>
              <li>Public Audit & Oversight</li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution & SIH info */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>© 2024–2026 GovInnovate Platform. Built for Smart India Hackathon.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Complements GFR 2017 • Does Not Bypass Procurement Laws</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
