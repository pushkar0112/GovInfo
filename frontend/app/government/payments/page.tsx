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
  ArrowUpRight,
  Coins,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileCheck,
  Building,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export default function GovernmentPaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

function PaymentsContent() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tranches, setTranches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"invoices" | "tranches">("invoices");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewComments, setReviewComments] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [selectedTranche, setSelectedTranche] = useState<any>(null);
  const [txRef, setTxRef] = useState("");
  const [paymentMode, setPaymentMode] = useState("PFMS");
  const [paidAmount, setPaidAmount] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invData, trData] = await Promise.all([
        apiRequest<any[]>("/api/v1/government/invoices"),
        apiRequest<any[]>("/api/v1/government/tranches"),
      ]);
      setInvoices(invData || []);
      setTranches(trData || []);
    } catch (err) {
      console.error("Failed to load payments data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      setSubmittingReview(true);
      await apiRequest(`/api/v1/government/invoices/${selectedInvoice.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          status: reviewAction,
          review_comments: reviewComments,
        }),
      });
      setSelectedInvoice(null);
      setReviewComments("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to review invoice");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTranche) return;
    try {
      setSubmittingPayment(true);
      await apiRequest(`/api/v1/government/tranches/${selectedTranche.id}/pay`, {
        method: "POST",
        body: JSON.stringify({
          transaction_reference: txRef,
          payment_mode: paymentMode,
          paid_amount: parseFloat(paidAmount) || selectedTranche.amount,
          payment_date: new Date().toISOString(),
        }),
      });
      setSelectedTranche(null);
      setTxRef("");
      setPaidAmount("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPaid = tranches
    .filter((t) => t.status === "PAID")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status === "SUBMITTED" || i.status === "UNDER_REVIEW").length;
  const eligibleTranches = tranches.filter((t) => t.status === "ELIGIBLE").length;

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoice_number?.toLowerCase().includes(q);
      const codeMatch = inv.contract_code?.toLowerCase().includes(q);
      const startupMatch = inv.startup_name?.toLowerCase().includes(q);
      if (!numMatch && !codeMatch && !startupMatch) return false;
    }
    return true;
  });

  const filteredTranches = tranches.filter((tr) => {
    if (statusFilter !== "ALL" && tr.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = tr.tranche_code?.toLowerCase().includes(q);
      const contractMatch = tr.contract_code?.toLowerCase().includes(q);
      const startupMatch = tr.startup_name?.toLowerCase().includes(q);
      if (!codeMatch && !contractMatch && !startupMatch) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-600 text-white font-medium">Paid</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 text-white font-medium">Approved</Badge>;
      case "ELIGIBLE":
        return <Badge className="bg-amber-600 text-white font-medium">Eligible for Invoicing</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-purple-600 text-white font-medium">Submitted</Badge>;
      case "UNDER_REVIEW":
        return <Badge className="bg-indigo-600 text-white font-medium">Under Review</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-600 text-white font-medium">Rejected</Badge>;
      case "PROCESSING":
        return <Badge className="bg-cyan-600 text-white font-medium">Disbursal in Progress</Badge>;
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
            <Link href="/government/procurement" className="hover:text-indigo-600 transition">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Payments & Invoicing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-indigo-600" />
            Payments & Milestone Tranches
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Auditable milestone disbursement desk. Tranches become eligible only upon milestone approval and require verified invoice review.
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
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Disbursed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalPaid.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Verified milestone payouts</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoiced Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalInvoiced.toLocaleString()}</p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">{invoices.length} invoices claimed</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Coins className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Invoices</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingInvoices}</p>
            <p className="text-xs text-slate-500 mt-0.5">Awaiting verification</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible Tranches</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{eligibleTranches}</p>
            <p className="text-xs text-slate-500 mt-0.5">Milestone approved</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl">
            <FileCheck className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => {
            setActiveTab("invoices");
            setStatusFilter("ALL");
          }}
          className={`pb-3 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("tranches");
            setStatusFilter("ALL");
          }}
          className={`pb-3 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === "tranches"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Coins className="h-4 w-4" />
          Payment Tranches ({tranches.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "invoices" ? "Search by invoice # or contract..." : "Search by tranche code or contract..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {["ALL", activeTab === "invoices" ? "SUBMITTED" : "ELIGIBLE", "APPROVED", "PAID", "REJECTED"].map((st) => (
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

      {/* Content View */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Loading payment records...</p>
        </div>
      ) : activeTab === "invoices" ? (
        /* Invoices Table */
        filteredInvoices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No invoices match your filter</p>
            <p className="text-xs text-slate-500 mt-1">
              Invoices submitted by startups for milestone completion will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Contract / Startup</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
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
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/government/contracts/${inv.contract_id}`}
                          className="font-medium text-indigo-600 hover:underline block"
                        >
                          {inv.contract_code}
                        </Link>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" /> {inv.startup_name || "Vendor"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">₹{inv.total_amount?.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500">Tax: ₹{(inv.tax_amount || 0).toLocaleString()}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {inv.submission_date ? new Date(inv.submission_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(inv.status === "SUBMITTED" || inv.status === "UNDER_REVIEW") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setReviewAction("APPROVED");
                                setReviewComments("");
                              }}
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                            >
                              Review & Verify
                            </Button>
                          )}
                          <Link href={`/government/contracts/${inv.contract_id}`}>
                            <Button size="sm" variant="ghost" className="text-xs">
                              Contract
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Tranches Table */
        filteredTranches.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <Coins className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No payment tranches found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Tranche Code</th>
                    <th className="py-3.5 px-4">Contract / Vendor</th>
                    <th className="py-3.5 px-4">Tranche #</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment Reference</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTranches.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">{tr.tranche_code}</td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/government/contracts/${tr.contract_id}`}
                          className="font-medium text-indigo-600 hover:underline block"
                        >
                          {tr.contract_code}
                        </Link>
                        <span className="text-xs text-slate-500">{tr.startup_name || "Startup"}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">Tranche #{tr.sequence_order}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">₹{tr.amount?.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500">{tr.percentage}% of contract</p>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(tr.status)}</td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        {tr.payment_reference ? (
                          <div>
                            <span className="text-emerald-700 font-semibold">{tr.payment_reference}</span>
                            <span className="text-slate-400 block">{tr.payment_mode || "PFMS"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {tr.status === "APPROVED" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTranche(tr);
                              setPaidAmount(tr.amount?.toString() || "");
                              setTxRef(`PFMS-${Date.now().toString().slice(-6)}`);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            Disburse Payment
                          </Button>
                        )}
                        {tr.status === "PAID" && (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                            Disbursed
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Review Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600" />
              Review Invoice: {selectedInvoice.invoice_number}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Verify submitted invoice against the approved milestone and contract tranches before approving disbursement.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Contract:</span>
                <span className="font-semibold">{selectedInvoice.contract_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Claimed Amount:</span>
                <span className="font-bold text-slate-900">₹{selectedInvoice.total_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submission Date:</span>
                <span>{new Date(selectedInvoice.submission_date).toLocaleDateString()}</span>
              </div>
            </div>

            <form onSubmit={handleReviewInvoice} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("APPROVED")}
                    className={`py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "APPROVED"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Check className="h-4 w-4" /> Approve for Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("REJECTED")}
                    className={`py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "REJECTED"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <X className="h-4 w-4" /> Reject Invoice
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Review Comments</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="State justification or rejection grounds (e.g., GSTIN verified, milestone deliverables verified)..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={reviewAction === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
                  disabled={submittingReview}
                >
                  {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Decision"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedTranche && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Disburse Tranche: {selectedTranche.tranche_code}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Record external Treasury / PFMS disbursement confirmation. Tranche status will transition to PAID.
            </p>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PFMS">PFMS (Public Financial Management System)</option>
                  <option value="TREASURY_TRANSFER">Treasury Direct Transfer</option>
                  <option value="NEFT_RTGS">NEFT / RTGS</option>
                  <option value="ESCROW_RELEASE">Escrow Sandbox Release</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / UTR Reference Number
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. PFMS-2026-993812 or UTR77881923"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursed Amount (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTranche(null)}
                  disabled={submittingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Disbursal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
