"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  FileCheck,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Coins,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function StartupProcurementPage() {
  return (
    <ProtectedRoute allowedRoles={["STARTUP"]}>
      <StartupProcurementContent />
    </ProtectedRoute>
  );
}

function StartupProcurementContent() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [decData, contData, invData] = await Promise.all([
        apiRequest<any[]>("/api/v1/startup/procurement/decisions"),
        apiRequest<any[]>("/api/v1/startup/contracts"),
        apiRequest<any[]>("/api/v1/startup/invoices"),
      ]);
      setDecisions(decData || []);
      setContracts(contData || []);
      setInvoices(invData || []);
    } catch (err) {
      console.error("Failed to load startup procurement data", err);
    } finally {
      setLoading(false);
    }
  };

  const totalContractValue = contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/startup/dashboard" className="hover:text-indigo-600 transition">
              Startup Portal
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Procurement & Contracts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-indigo-600" />
            Post-Pilot Procurement Awards
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track pilot conversion into procurement orders, active contracts, milestone disbursements, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/startup/invoices">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Manage Invoices
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awarded Contracts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{contracts.length}</p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">{activeContracts} active orders</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <FileCheck className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Contract Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalContractValue.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Sanctioned procurement</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Coins className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoiced Claim</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalInvoiced.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{invoices.length} invoices generated</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <CreditCard className="h-6 w-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Procurement Decisions</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{decisions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Post-pilot transitions</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl">
            <Layers className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Grid: Contracts & Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Contracts (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Active Contracts & Work Orders
            </h2>
            <Link href="/startup/contracts" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
              View all ({contracts.length}) <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading contracts...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No procurement contracts awarded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                When your validated pilot is approved for public procurement, the signed contract and milestones will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 5).map((contract) => (
                <div
                  key={contract.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {contract.contract_code}
                        </span>
                        <Badge
                          className={
                            contract.status === "ACTIVE"
                              ? "bg-emerald-600 text-white"
                              : contract.status === "COMPLETED"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-500 text-white"
                          }
                        >
                          {contract.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 mt-1">{contract.title}</h3>
                      <p className="text-xs text-slate-500">{contract.department_name}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">₹{contract.contract_value?.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Approved Value</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Duration: {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"} to{" "}
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"}
                    </span>
                    <Link href={`/startup/contracts/${contract.id}`}>
                      <Button size="sm" variant="outline" className="text-xs font-medium text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                        View Dossier & Milestones
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Procurement Decisions Side Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Procurement Decisions
          </h2>

          {loading ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
            </div>
          ) : decisions.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              No government procurement decisions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((dec) => (
                <div key={dec.id} className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-600">{dec.decision_code}</span>
                    <Badge
                      className={
                        dec.decision_type === "PROCEED_TO_PROCUREMENT"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-600 text-white"
                      }
                    >
                      {dec.decision_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-800">{dec.challenge_title}</p>
                  <div className="text-slate-500">
                    Pilot Status: <span className="text-emerald-700 font-medium">{dec.pilot_status}</span>
                  </div>
                  {dec.justification && (
                    <p className="text-slate-600 italic border-l-2 border-indigo-200 pl-2">
                      "{dec.justification}"
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Recorded: {new Date(dec.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
