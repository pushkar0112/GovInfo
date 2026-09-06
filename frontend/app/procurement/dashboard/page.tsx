"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
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
  Coins,
  FileText,
  CreditCard,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Building,
  Layers,
} from "lucide-react";

export default function ProcurementDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["PROCUREMENT_OFFICER", "ADMIN"]}>
      <ProcurementDashboardContent />
    </ProtectedRoute>
  );
}

function ProcurementDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"approvals" | "records" | "contracts" | "invoices">("approvals");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>("/api/v1/procurement-officer/dashboard");
      setData(res);
    } catch (err) {
      console.error("Failed to load procurement dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const stats = data?.stats || {
    pending_approvals_count: 0,
    active_contracts_count: 0,
    total_contract_value: 0,
    pending_invoices_count: 0,
    eligible_tranches_count: 0,
    disbursed_amount: 0,
  };

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
                  Step 8 Multi-Tier Authority
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {currentUser.organization_name || "Procurement Directorate"} • Statutory GFR & GeM Regulatory Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              disabled={loading}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
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
              Public Procurement & Milestone Sanction Authority
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
              <span>Department: {currentUser.organization_name || "Procurement Directorate"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/government/procurement">
              <Button size="sm" variant="outline" className="text-xs border-slate-300">
                Procurement Records
              </Button>
            </Link>
            <Link href="/government/contracts">
              <Button size="sm" variant="outline" className="text-xs border-slate-300">
                Contracts
              </Button>
            </Link>
            <Link href="/government/payments">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Payments Desk
              </Button>
            </Link>
          </div>
        </div>

        {/* 6 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Pending Approvals</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending_approvals_count}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Multi-tier signoffs</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Active Contracts</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.active_contracts_count}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Under execution</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Contract Value</span>
              <Coins className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">₹{stats.total_contract_value?.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Total sanctioned</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Invoices Pending</span>
              <FileCheck2 className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.pending_invoices_count}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting scrutiny</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Eligible Tranches</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.eligible_tranches_count}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Milestone verified</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Disbursed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-600">₹{stats.disbursed_amount?.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">PFMS / Treasury paid</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "approvals", label: `Pending Approvals (${data?.pending_approvals?.length || 0})`, icon: Clock },
            { id: "records", label: `Procurement Records (${data?.recent_procurements?.length || 0})`, icon: Scale },
            { id: "contracts", label: `Active Contracts (${data?.recent_contracts?.length || 0})`, icon: FileText },
            { id: "invoices", label: `Recent Invoices (${data?.recent_invoices?.length || 0})`, icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

        {/* Tab Contents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading procurement operational data...</p>
            </div>
          ) : activeTab === "approvals" ? (
            /* Approvals List */
            (data?.pending_approvals?.length || 0) === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">All Approvals Clear</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  There are no pending multi-tier procurement approvals currently awaiting your action.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.pending_approvals.map((appr: any) => (
                  <div
                    key={appr.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Tier {appr.approval_tier}: {appr.tier_name}
                        </span>
                        <Badge className="bg-amber-600 text-white text-[10px]">Pending Approval</Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Procurement Record ID: <span className="font-mono">{appr.procurement_record_id}</span>
                      </p>
                    </div>

                    <Link href={`/government/procurement/${appr.procurement_record_id}`}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                        Review Dossier & Sign Off
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "records" ? (
            /* Procurement Records List */
            (data?.recent_procurements?.length || 0) === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Procurement Records Found</h4>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Procurement Code</th>
                      <th className="py-3 px-4">Pathway</th>
                      <th className="py-3 px-4">Estimated Value</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_procurements.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{p.procurement_code}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">{p.pathway_name || p.pathway_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{p.estimated_value?.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{p.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/government/procurement/${p.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs text-indigo-600">
                              View Dossier
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "contracts" ? (
            /* Contracts List */
            (data?.recent_contracts?.length || 0) === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Contracts Executed Yet</h4>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Contract Code</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Value</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_contracts.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.contract_code}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 text-xs">{c.title}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{c.contract_value?.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Badge className={c.status === "ACTIVE" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/government/contracts/${c.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs text-indigo-600">
                              Manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Invoices List */
            (data?.recent_invoices?.length || 0) === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <CreditCard className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No Invoices Submitted Yet</h4>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Contract</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_invoices.map((i: any) => (
                      <tr key={i.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{i.invoice_number}</td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-600">{i.contract_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{i.total_amount?.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{i.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href="/government/payments">
                            <Button size="sm" variant="ghost" className="text-xs text-indigo-600">
                              Review in Payments
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
