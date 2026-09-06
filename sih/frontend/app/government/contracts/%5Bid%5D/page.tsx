"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Building2,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Check,
  X,
  Play,
  Pause,
  StopCircle,
  FileCheck2,
} from "lucide-react";

export default function GovernmentContractDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ContractDetailContent />
    </ProtectedRoute>
  );
}

function ContractDetailContent() {
  const params = useParams();
  const router = useRouter();
  const contractId = params?.id as string;
  const { currentUser } = useAuth();

  const [contract, setContract] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"milestones" | "tranches" | "invoices">("milestones");
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  useEffect(() => {
    if (!contractId) return;
    loadContract();
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const [c, invList] = await Promise.all([
        apiRequest<any>(`/api/v1/government/contracts/${contractId}`),
        apiRequest<any[]>(`/api/v1/government/invoices?contract_id=${contractId}`),
      ]);
      setContract(c);
      setInvoices(invList || []);
    } catch (err: any) {
      console.error("Failed to load contract", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneAction = async (milestoneId: string, action: "ACCEPT" | "REJECT") => {
    if (action === "REJECT") {
      setSelectedMilestoneId(milestoneId);
      setRejectModalOpen(true);
      return;
    }

    const remarks = prompt("Enter optional acceptance remarks:");
    if (remarks === null) return;

    try {
      setActionLoading(true);
      await apiRequest(`/api/v1/government/contracts/${contractId}/milestones/${milestoneId}/accept`, {
        method: "POST",
        body: JSON.stringify({ remarks }),
      });
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to accept milestone.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMilestoneReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestoneId || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      await apiRequest(`/api/v1/government/contracts/${contractId}/milestones/${selectedMilestoneId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      setRejectModalOpen(false);
      setRejectionReason("");
      setSelectedMilestoneId(null);
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to reject milestone.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvoiceReview = async (invoiceId: string, action: "APPROVE" | "REJECT") => {
    let reason = "";
    if (action === "REJECT") {
      const r = prompt("Mandatory: Enter rejection reason:");
      if (!r || r.trim().length < 5) {
        alert("Rejection reason is required (min 5 characters).");
        return;
      }
      reason = r.trim();
    }

    try {
      setActionLoading(true);
      await apiRequest(`/api/v1/government/invoices/${invoiceId}/${action.toLowerCase()}`, {
        method: "POST",
        body: JSON.stringify({
          review_comments: action === "APPROVE" ? "Approved for disbursement sanction" : undefined,
          rejection_reason: action === "REJECT" ? reason : undefined,
        }),
      });
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to review invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLifecycle = async (action: "activate" | "suspend" | "resume" | "complete") => {
    try {
      setActionLoading(true);
      let body: any = {};
      if (action === "suspend") {
        const reason = prompt("Enter reason for suspension:");
        if (!reason) return;
        body = { suspension_reason: reason };
      }

      await apiRequest(`/api/v1/government/contracts/${contractId}/${action}`, {
        method: "POST",
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });
      await loadContract();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} contract.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminationReason.trim()) return;

    try {
      setActionLoading(true);
      await apiRequest(`/api/v1/government/contracts/${contractId}/terminate`, {
        method: "POST",
        body: JSON.stringify({ termination_reason: terminationReason }),
      });
      setTerminateModalOpen(false);
      setTerminationReason("");
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to terminate contract.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Contract Not Found</h2>
        <Link href="/government/contracts">
          <Button variant="outline" className="mt-4">Back to Portfolio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/government/contracts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contract Portfolio
        </Link>
        <Badge variant="gov" className="text-xs">
          Step 8: Contract Management Dossier
        </Badge>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              {contract.contract_code}
            </span>
            <span className="text-slate-300">•</span>
            <Badge
              variant={
                contract.status === "ACTIVE"
                  ? "success"
                  : contract.status === "COMPLETED"
                  ? "default"
                  : contract.status === "SUSPENDED" || contract.status === "TERMINATED"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs uppercase"
            >
              {contract.status}
            </Badge>
            <span className="text-slate-300">•</span>
            <Badge variant="outline" className="text-xs">
              Type: {contract.contract_type}
            </Badge>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {contract.title}
          </h1>

          <p className="text-xs text-slate-600">
            Department: <strong>{contract.department_name}</strong> • Awarded Startup: <strong>{contract.startup_name}</strong>
          </p>
        </div>

        {/* Lifecycle Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {contract.status === "DRAFT" && (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleLifecycle("activate")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Activate Contract
            </Button>
          )}

          {contract.status === "ACTIVE" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => handleLifecycle("suspend")}
                className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                Suspend
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => handleLifecycle("complete")}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete Contract
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => setTerminateModalOpen(true)}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Terminate
              </Button>
            </>
          )}

          {contract.status === "SUSPENDED" && (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleLifecycle("resume")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Resume Operations
            </Button>
          )}

          <Link href={`/government/procurement/${contract.procurement_id}`}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              Procurement Record
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial & Timeline Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Contract Value</span>
          <div className="text-xl font-bold text-slate-900">
            ₹{parseFloat(contract.contract_value).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Disbursed (Paid)</span>
          <div className="text-xl font-bold text-emerald-700">
            ₹{contract.paid_amount?.toLocaleString("en-IN") || "0"}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone Progress</span>
          <div className="text-xl font-bold text-blue-700">
            {contract.milestone_progress}%
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contract Period</span>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            {contract.start_date} → {contract.end_date}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        {[
          { id: "milestones", label: `Contract Milestones (${contract.milestones?.length || 0})` },
          { id: "tranches", label: `Payment Tranches (${contract.payment_tranches?.length || 0})` },
          { id: "invoices", label: `Submitted Invoices (${invoices.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#0B2545] text-[#0B2545] font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MILESTONES */}
      {activeTab === "milestones" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100 text-xs">
            {contract.milestones?.map((m: any) => {
              const isAccepted = m.acceptance_status === "ACCEPTED";
              const isRejected = m.acceptance_status === "REJECTED";
              const isPending = m.acceptance_status === "PENDING";

              return (
                <div key={m.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{m.milestone_code}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-slate-900">{m.title}</span>
                      <Badge
                        variant={isAccepted ? "success" : isRejected ? "destructive" : "secondary"}
                        className="text-[9px]"
                      >
                        {m.acceptance_status}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Deliverable Requirement: <strong>{m.deliverable_requirements || "None specified"}</strong>
                    </p>

                    {m.rejection_reason && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        Rejection feedback: "{m.rejection_reason}"
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                      <span>Due Date: <strong>{m.due_date}</strong></span>
                      <span>•</span>
                      <span>Allocation: <strong>{m.percentage}%</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">₹{parseFloat(m.amount).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {isPending && contract.status === "ACTIVE" && (
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleMilestoneAction(m.id, "ACCEPT")}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Milestone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => handleMilestoneAction(m.id, "REJECT")}
                        className="text-rose-600 hover:bg-rose-50 text-xs gap-1 border-rose-200"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="text-right text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      Payment Tranche <strong>ELIGIBLE</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT TRANCHES */}
      {activeTab === "tranches" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tranche Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Allocation</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {contract.payment_tranches?.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.tranche_code}</td>
                  <td className="py-3 px-4">{t.description}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{t.percentage}%</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">₹{parseFloat(t.amount).toLocaleString("en-IN")}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        t.status === "PAID"
                          ? "success"
                          : t.status === "ELIGIBLE" || t.status === "APPROVED"
                          ? "default"
                          : t.status === "ON_HOLD"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] uppercase"
                    >
                      {t.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {t.status === "ELIGIBLE" && (
                      <span className="text-[10px] text-slate-400">Awaiting Invoice Submission</span>
                    )}
                    {t.status === "APPROVED" && (
                      <span className="text-[10px] text-emerald-700 font-semibold">Ready for Disbursement</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {invoices.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-1">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No invoices submitted yet</p>
              <p className="text-[11px] text-slate-400">
                Startups can submit invoices once linked milestones are accepted and tranches become ELIGIBLE.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Milestone / Tranche</th>
                  <th className="py-3 px-4">Base Amount</th>
                  <th className="py-3 px-4">Tax Amount</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Sanction Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">{inv.milestone_code || "Milestone"}</td>
                    <td className="py-3 px-4">₹{parseFloat(inv.amount).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-slate-500">₹{parseFloat(inv.tax_amount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">₹{parseFloat(inv.total_amount).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{inv.invoice_date}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          inv.status === "PAID"
                            ? "success"
                            : inv.status === "APPROVED"
                            ? "default"
                            : inv.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] uppercase"
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.status === "SUBMITTED" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleInvoiceReview(inv.id, "APPROVE")}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7 gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => handleInvoiceReview(inv.id, "REJECT")}
                            className="text-rose-600 hover:bg-rose-50 text-xs h-7 gap-1 border-rose-200"
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      )}
                      {inv.status === "APPROVED" && (
                        <Link href="/government/payments">
                          <Button size="sm" variant="ghost" className="text-xs text-blue-700 hover:text-blue-900">
                            Disburse in Payments Desk →
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reject Milestone Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Milestone Deliverable</h3>
            <form onSubmit={handleConfirmMilestoneReject} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Specific Rejection Reason *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  placeholder="State the technical deliverables or acceptance criteria that were not satisfied..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Contract Modal */}
      {terminateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-700">Statutory Contract Termination</h3>
            <p className="text-xs text-slate-500">
              Terminating an active public contract requires mandatory legal justification and generates a permanent CVC/GFR audit event.
            </p>
            <form onSubmit={handleTerminate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Termination Reason *</label>
                <textarea
                  rows={3}
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  placeholder="State the material breach or public interest rationale..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setTerminateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Confirm Termination
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
