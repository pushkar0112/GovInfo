"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Building2,
  Rocket,
  FileCheck2,
  FileText,
  CreditCard,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Coins,
} from "lucide-react";

export default function GovernmentProcurementDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ProcurementDashboardContent />
    </ProtectedRoute>
  );
}

function ProcurementDashboardContent() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, statData] = await Promise.all([
        apiRequest<any[]>("/api/v1/government/procurement"),
        apiRequest<any>("/api/v1/government/procurement/stats"),
      ]);
      setRecords(recList || []);
      setStats(statData);
    } catch (err) {
      console.error("Failed to load procurement data", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = r.procurement_code?.toLowerCase().includes(q);
      const titleMatch = r.title?.toLowerCase().includes(q);
      const startupMatch = r.startup_name?.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !startupMatch) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Public Procurement Command Center
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Innovation Procurement Portfolio
          </h1>
          <p className="text-xs text-slate-500">
            Validated pilot transitions, multi-tier statutory approvals, and contracting workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Link href="/government/contracts">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-slate-300">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Contract Portfolio
            </Button>
          </Link>
          <Link href="/government/payments">
            <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Payment Desk
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Decisions", value: stats?.total_decisions || 0, icon: Scale, color: "text-slate-800" },
          { label: "Active", value: stats?.active_procurements || 0, icon: Rocket, color: "text-blue-600" },
          { label: "Approvals Due", value: stats?.approvals_pending || 0, icon: Clock, color: "text-amber-600" },
          { label: "Contracts", value: stats?.contracts_count || 0, icon: FileText, color: "text-indigo-600" },
          {
            label: "Contract Value",
            value: `₹${((stats?.total_contract_value || 0) / 100000).toFixed(1)}L`,
            icon: Coins,
            color: "text-emerald-700",
          },
          {
            label: "Payment Eligible",
            value: `₹${((stats?.payment_eligible_value || 0) / 100000).toFixed(1)}L`,
            icon: CheckCircle2,
            color: "text-teal-600",
          },
          { label: "Invoices Due", value: stats?.invoices_pending_count || 0, icon: AlertCircle, color: "text-rose-600" },
          {
            label: "Disbursed",
            value: `₹${((stats?.paid_amount || 0) / 100000).toFixed(1)}L`,
            icon: CreditCard,
            color: "text-emerald-600",
          },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">{c.label}</span>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className={`text-lg font-bold tracking-tight ${c.color}`}>
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, or startup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {["ALL", "INITIATED", "APPROVAL_PENDING", "APPROVED", "CONTRACTING", "ACTIVE", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-[#0B2545] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Procurements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
            <span>Loading procurement portfolio...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Scale className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No procurement transitions found</p>
            <p className="text-[11px] text-slate-400">
              Procurements are initiated from completed and validated pilots in Step 7.
            </p>
            <Link href="/government/pilots">
              <Button size="sm" variant="outline" className="text-xs mt-2">
                Explore Completed Pilots
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Procurement Title & Scope</th>
                  <th className="py-3 px-4">Startup</th>
                  <th className="py-3 px-4">Configured Pathway</th>
                  <th className="py-3 px-4">Approved Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approvals</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((r) => {
                  const approvedCount = r.approvals?.filter((a: any) => a.status === "APPROVED").length || 0;
                  const totalApprovals = r.approvals?.length || 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {r.procurement_code}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{r.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{r.scope}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {r.startup_name || "Awarded Startup"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          {r.pathway_code || "PATHWAY"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        ₹{(r.approved_value || r.estimated_value)?.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            r.status === "ACTIVE" || r.status === "COMPLETED"
                              ? "success"
                              : r.status === "APPROVED" || r.status === "CONTRACTING"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] uppercase"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {approvedCount}/{totalApprovals} Approved
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/government/procurement/${r.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#0B2545] hover:text-[#133A6B]">
                            View Dossier <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
