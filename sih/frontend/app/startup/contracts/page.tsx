"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  RefreshCw,
  Coins,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  ArrowRight,
} from "lucide-react";

export default function StartupContractsPage() {
  return (
    <ProtectedRoute allowedRoles={["STARTUP"]}>
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
      const data = await apiRequest<any[]>("/api/v1/startup/contracts");
      setContracts(data || []);
    } catch (err) {
      console.error("Failed to load startup contracts", err);
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
      const deptMatch = c.department_name?.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !deptMatch) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/startup/procurement" className="hover:text-indigo-600 transition">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Contracts Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            My Government Contracts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Legally binding contracts executed following successful pilot validation. Manage milestones and submit payment invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadContracts}
            disabled={loading}
            className="flex items-center gap-2 border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/startup/invoices">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              My Invoices
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contract # or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {["ALL", "ACTIVE", "COMPLETED", "SUSPENDED", "DRAFT"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Listing */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Loading contracts portfolio...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-700">No contracts found</p>
          <p className="text-xs text-slate-500 mt-1">
            Contracts awarded upon government procurement approval will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {contract.contract_code}
                  </span>
                  <Badge
                    className={
                      contract.status === "ACTIVE"
                        ? "bg-emerald-600 text-white font-medium"
                        : contract.status === "COMPLETED"
                        ? "bg-blue-600 text-white font-medium"
                        : "bg-slate-600 text-white font-medium"
                    }
                  >
                    {contract.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{contract.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    {contract.department_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase">Contract Value</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{contract.contract_value?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase">Payment Terms</span>
                    <span className="font-semibold text-slate-700">Milestone-Linked</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"} to{" "}
                  {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"}
                </span>

                <Link href={`/startup/contracts/${contract.id}`}>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1">
                    View Dossier <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
