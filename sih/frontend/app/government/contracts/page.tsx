"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  RefreshCw,
  ArrowUpRight,
  Coins,
  Calendar,
  Building2,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from "lucide-react";

export default function GovernmentContractsPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ContractsContent />
    </ProtectedRoute>
  );
}

function ContractsContent() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any[]>("/api/v1/government/contracts");
      setContracts(data || []);
    } catch (err) {
      console.error("Failed to load contracts", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = c.contract_code?.toLowerCase().includes(q);
      const titleMatch = c.title?.toLowerCase().includes(q);
      const startupMatch = c.startup_name?.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !startupMatch) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Legal & Milestone Contracts Desk
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Executed Public Contracts
          </h1>
          <p className="text-xs text-slate-500">
            Enforceable public contracts, deliverable milestones, and payment disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadContracts} className="text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Link href="/government/procurement">
            <Button size="sm" variant="outline" className="text-xs">
              Procurement Portfolio
            </Button>
          </Link>
          <Link href="/government/payments">
            <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              Payment Desk
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contract code, title, or startup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {["ALL", "DRAFT", "PENDING_SIGNATURE", "ACTIVE", "COMPLETED", "SUSPENDED", "TERMINATED"].map((st) => (
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
            <span>Loading contract portfolio...</span>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No contracts found</p>
            <p className="text-[11px] text-slate-400">
              Contracts are executed from approved procurement transitions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contract Code</th>
                  <th className="py-3 px-4">Title & Procurement Code</th>
                  <th className="py-3 px-4">Startup</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Milestone Progress</th>
                  <th className="py-3 px-4">Payment Progress</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredContracts.map((c) => {
                  const paidPct = c.contract_value > 0 ? Math.round((c.paid_amount / c.contract_value) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {c.contract_code}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{c.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          Procurement: {c.procurement_code || "Linked"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {c.startup_name || "Awarded Startup"}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        ₹{parseFloat(c.contract_value).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {c.start_date} → {c.end_date}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            c.status === "ACTIVE"
                              ? "success"
                              : c.status === "COMPLETED"
                              ? "default"
                              : c.status === "SUSPENDED" || c.status === "TERMINATED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] uppercase"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span>{c.milestone_progress}%</span>
                          </div>
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${c.milestone_progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-emerald-700">{paidPct}% Paid</span>
                          </div>
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${paidPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/government/contracts/${c.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#0B2545] hover:text-[#133A6B]">
                            Open Dossier <ArrowUpRight className="w-3.5 h-3.5" />
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
