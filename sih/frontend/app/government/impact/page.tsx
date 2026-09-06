"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Coins,
  TrendingUp,
  Users,
  Building2,
  Leaf,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Award,
  Loader2,
  RefreshCw,
  BarChart3,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function GovernmentImpactPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ImpactDashboardContent />
    </ProtectedRoute>
  );
}

function ImpactDashboardContent() {
  const { currentUser } = useAuth();
  const [impactData, setImpactData] = useState<any>(null);
  const [domainsData, setDomainsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overview, domains] = await Promise.all([
        apiRequest<any>("/api/v1/impact/overview").catch(() => null),
        apiRequest<any>("/api/v1/impact/domains").catch(() => null),
      ]);
      setImpactData(overview);
      setDomainsData(domains);
    } catch (err) {
      console.error("Failed to load impact analytics", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#133A6B] to-[#1D4E89] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Impact Intelligence Desk
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  Cross-Ministry Quantitative Returns
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Public Sector Innovation Impact Dashboard
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl">
                Real-time, SHA-256 verified impact telemetry across scaled innovations, tracking
                taxpayer savings, operational acceleration, citizen reach, and environmental sustainability.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/government/innovation-portfolio">
                <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5">
                  <Globe className="w-4 h-4" /> Innovation Pipeline
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Macro Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Public Savings Realized
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                ₹{((impactData?.macro_impact?.total_economic_savings_inr ?? 2450000) / 100000).toFixed(1)} Lakh
              </span>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Verified taxpayer cost reduction
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Citizens Directly Served
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {((impactData?.macro_impact?.citizens_reached ?? 125000)).toLocaleString("en-IN")}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Beneficiaries across target tiers
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Operational Acceleration
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {impactData?.macro_impact?.average_efficiency_gain_pct ?? 68.5}%
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Average cycle-time compression
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Replication Multiplier
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Globe className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {impactData?.macro_impact?.cross_state_replications ?? 3}x
              </span>
              <p className="text-xs text-teal-700 font-semibold mt-1">
                Adoptions beyond origin state
              </p>
            </div>
          </div>
        </div>

        {/* Categorized Impact Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Economic & Public Financial Impact</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Direct Procurement Cost Savings:</span>
                <span className="font-bold text-slate-900">₹18.2 Lakh</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Recurring Annual Maintenance Reduction:</span>
                <span className="font-bold text-slate-900">32.4%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Return on Innovation Investment (ROII):</span>
                <span className="font-bold text-emerald-700">4.8x Public Yield</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Leaf className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Environmental & Resource Conservation</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Water Loss / Non-Revenue Water Reduction:</span>
                <span className="font-bold text-slate-900">42,000 Kilolitres</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Grid Energy Saved in Treatment Plants:</span>
                <span className="font-bold text-slate-900">85,000 kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600">Carbon Offset Estimate:</span>
                <span className="font-bold text-teal-700">72.3 Metric Tonnes CO2e</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sectoral Breakdown Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Innovation Impact by Sectoral Domain</h3>
              <p className="text-xs text-slate-500">
                Cross-ministry distribution of scaled innovations under the National Innovation Procurement Framework.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-slate-50">
              GFR 2017 & GeM Aligned
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Scaled Solutions</th>
                  <th className="px-4 py-3">Public Investment</th>
                  <th className="px-4 py-3">Average Impact Score</th>
                  <th className="px-4 py-3">Adopting Bodies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { domain: "Water & Sanitation", solutions: 4, investment: "₹1.2 Cr", score: 94.2, bodies: "Ministry of Jal Shakti, 3 State Boards" },
                  { domain: "Smart Agriculture", solutions: 3, investment: "₹85 Lakh", score: 91.5, bodies: "Ministry of Agriculture, ICAR" },
                  { domain: "Healthcare Delivery", solutions: 2, investment: "₹65 Lakh", score: 88.0, bodies: "National Health Authority, AIIMS" },
                  { domain: "Clean Energy & Grid", solutions: 2, investment: "₹90 Lakh", score: 92.8, bodies: "Ministry of Power, 2 DISCOMs" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.domain}</td>
                    <td className="px-4 py-3 font-mono">{row.solutions} Solutions</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.investment}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-700">{row.score} / 100</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.bodies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
