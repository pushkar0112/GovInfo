"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Search,
  RefreshCw,
  Coins,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  FileCheck,
  ArrowLeft,
  XCircle,
} from "lucide-react";

export default function StartupInvoicesPage() {
  return (
    <ProtectedRoute allowedRoles={["STARTUP"]}>
      <InvoicesContent />
    </ProtectedRoute>
  );
}

function InvoicesContent() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any[]>("/api/v1/startup/invoices");
      setInvoices(data || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoice_number?.toLowerCase().includes(q);
      const codeMatch = inv.contract_code?.toLowerCase().includes(q);
      if (!numMatch && !codeMatch) return false;
    }
    return true;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalApproved = invoices
    .filter((i) => i.status === "APPROVED" || i.status === "PAID")
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-600 text-white font-medium">Disbursed (Paid)</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 text-white font-medium">Approved for Payment</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-purple-600 text-white font-medium">Submitted</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-indigo-600 text-white font-medium">Under Review</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-600 text-white font-medium">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 font-medium">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/startup/procurement" className="hover:text-indigo-600 transition flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Procurement
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Invoices</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-indigo-600" />
            My Invoices & Claim History
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track statutory milestone payment claims, authority verification status, and Treasury disbursement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInvoices}
            disabled={loading}
            className="flex items-center gap-2 border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/startup/contracts">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              View Contracts
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Invoiced</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalInvoiced.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{invoices.length} invoices filed</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <FileCheck className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved / Disbursed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalApproved.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Cleared for payment</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {invoices.filter((i) => i.status === "SUBMITTED" || i.status === "UNDER_REVIEW").length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Under department scrutiny</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number or contract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {["ALL", "SUBMITTED", "APPROVED", "PAID", "REJECTED"].map((st) => (
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

      {/* Invoices List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Loading your invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-700">No invoices match your filter</p>
          <p className="text-xs text-slate-500 mt-1">
            To generate an invoice, go to your contract and click "Claim Invoice" on any milestone tranche marked ELIGIBLE.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Contract</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Basic Amount</th>
                  <th className="py-3.5 px-4">Tax (GST)</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Review Comments</th>
                  <th className="py-3.5 px-4 text-right">Contract</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {inv.invoice_number}
                      {inv.invoice_file_url && (
                        <a
                          href={inv.invoice_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 ml-2 text-xs text-indigo-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> PDF
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-600 font-medium">
                      {inv.contract_code}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      ₹{inv.basic_amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      ₹{(inv.tax_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{inv.total_amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {inv.review_comments ? (
                        <span title={inv.review_comments}>{inv.review_comments}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/startup/contracts/${inv.contract_id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-indigo-600 hover:bg-indigo-50">
                          View Dossier
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
