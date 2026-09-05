"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  FileCheck2,
  TrendingUp,
  FolderOpen,
  LogOut,
  User,
  ShieldAlert,
} from "lucide-react";

type ProcureTab = "cases" | "pilots" | "scaleup";

function ProcurementDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProcureTab>("cases");

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  Procurement Officer Portal
                </h1>
                <Badge variant="gov" className="text-[10px] bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
                  GeM & Finance Sanction Authority
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {currentUser.organization_name || "Government e-Marketplace"} • GFR Rule 149 / Rule 194 Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5">
                <User className="w-3.5 h-3.5" />
                Profile
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Public Procurement & Swiss Challenge Authority
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Welcome, {currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span>Account: <strong>{currentUser.email}</strong></span>
              <span>•</span>
              <Badge variant="gov" className="text-[10px]">
                {currentUser.role}
              </Badge>
              <span>•</span>
              <span>Department: {currentUser.organization_name || "GeM Procurement Authority"}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "cases", label: "Procurement Cases", icon: Scale },
            { id: "pilots", label: "Approved Pilots", icon: FileCheck2 },
            { id: "scaleup", label: "Scale-up Cases", icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProcureTab)}
                className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#0B2545] text-[#0B2545] font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0B2545]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {activeTab === "cases" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Procurement Dossiers & Sanction Cases</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dossiers ready for GeM Direct Purchase onboarding, PAC exemptions, and ministerial approvals.
                </p>
              </div>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No active procurement cases pending review.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Solutions that successfully achieve 100% KPI validation in testbed pilots will automatically submit dossiers here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "pilots" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Approved Field Pilots</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Controlled field sandbox deployments currently under testing across ministries and states.
                </p>
              </div>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <FileCheck2 className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No approved pilots currently monitored.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Ongoing pilots with grant disbursements will be listed here with live milestone progress telemetry.
                </p>
              </div>
            </div>
          )}

          {activeTab === "scaleup" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">National Scale-Up Cases & Swiss Challenge</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial scale-up orders across central departments, state utilities, and smart cities.
                </p>
              </div>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <TrendingUp className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No commercial scale-up orders initiated yet.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Pan-India rollout tenders and multi-ministry adoption frameworks will appear here once sanctioned.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProcurementDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["PROCUREMENT_OFFICER", "ADMIN"]}>
      <ProcurementDashboardContent />
    </ProtectedRoute>
  );
}
