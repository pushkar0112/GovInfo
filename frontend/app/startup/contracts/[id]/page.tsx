"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcurementTraceability } from "@/components/procurement/ProcurementTraceability";
import {
  FileText,
  Calendar,
  Building,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  Upload,
  ExternalLink,
  ChevronRight,
  CreditCard,
  Layers,
  ArrowLeft,
  Check,
  ShieldAlert,
} from "lucide-react";

export default function StartupContractDossierPage() {
  const params = useParams();
  const contractId = params?.id as string;

  return (
    <ProtectedRoute allowedRoles={["STARTUP"]}>
      <ContractDossierContent contractId={contractId} />
    </ProtectedRoute>
  );
}

function ContractDossierContent({ contractId }: { contractId: string }) {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Milestone submission modal
  const [submittingMilestone, setSubmittingMilestone] = useState<any>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState("100");
  const [deliverableProofUrl, setDeliverableProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice claim modal
  const [invoicingTranche, setInvoicingTranche] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [basicAmount, setBasicAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceFileUrl, setInvoiceFileUrl] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any>(`/api/v1/startup/contracts/${contractId}`);
      setContract(data);
    } catch (err) {
      console.error("Failed to load contract dossier", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingMilestone) return;

    try {
      setIsSubmitting(true);
      await apiRequest(
        `/api/v1/startup/contracts/${contractId}/milestones/${submittingMilestone.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            completion_percentage: parseFloat(completionPercentage) || 100,
            submission_notes: submissionNotes,
            deliverable_proof_url: deliverableProofUrl || undefined,
          }),
        }
      );
      setSubmittingMilestone(null);
      setSubmissionNotes("");
      setDeliverableProofUrl("");
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to submit milestone report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoicingTranche) return;

    try {
      setIsSubmittingInvoice(true);
      const bAmt = parseFloat(basicAmount) || invoicingTranche.amount;
      const tAmt = parseFloat(taxAmount) || 0;

      await apiRequest(`/api/v1/startup/invoices`, {
        method: "POST",
        body: JSON.stringify({
          tranche_id: invoicingTranche.id,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          basic_amount: bAmt,
          tax_amount: tAmt,
          notes: invoiceNotes || undefined,
          invoice_file_url: invoiceFileUrl || undefined,
        }),
      });
      setInvoicingTranche(null);
      setInvoiceNumber("");
      setBasicAmount("");
      setTaxAmount("");
      setInvoiceNotes("");
      setInvoiceFileUrl("");
      await loadContract();
    } catch (err: any) {
      alert(err.message || "Failed to submit invoice");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading contract dossier...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Contract Not Found</h2>
          <p className="text-sm text-slate-600">The requested contract was not found or access is restricted.</p>
          <Link href="/startup/contracts">
            <Button variant="outline">Back to Contracts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const milestones = contract.milestones || [];
  const tranches = contract.tranches || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Back & Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/startup/contracts" className="hover:text-indigo-600 transition flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Contracts
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700 font-medium">{contract.contract_code}</span>
      </div>

      {/* Contract Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                {contract.contract_code}
              </span>
              <Badge
                className={
                  contract.status === "ACTIVE"
                    ? "bg-emerald-600 text-white"
                    : contract.status === "COMPLETED"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-600 text-white"
                }
              >
                {contract.status}
              </Badge>
              {contract.procurement_code && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                  Linked Order: {contract.procurement_code}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{contract.title}</h1>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Building className="h-4 w-4 text-slate-400" />
              Awarding Authority: <strong className="text-slate-800">{contract.department_name}</strong>
            </p>
          </div>

          {/* Key Numbers */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contract Value</p>
              <p className="text-2xl font-black text-slate-900">₹{contract.contract_value?.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Term</p>
              <p className="text-xs font-semibold text-slate-700">
                {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"} to{" "}
                {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Contractual Notice:</span> Milestone acceptances and tranche eligibility are
            governed strictly by submitted verification evidence. Tranches become eligible for invoicing only after
            formal department acceptance. Platform provides workflow tracking and does not replace statutory audit
            protocols.
          </div>
        </div>
      </div>

      {/* Milestones & Deliverables Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Contract Milestones ({milestones.length})
          </h2>
          <span className="text-xs text-slate-500">
            Submit milestone completion reports to trigger government review
          </span>
        </div>

        <div className="space-y-3">
          {milestones.map((m: any) => (
            <div
              key={m.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition space-y-3 bg-slate-50/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      #{m.sequence_order}: {m.title}
                    </span>
                    <Badge
                      className={
                        m.status === "ACCEPTED"
                          ? "bg-emerald-600 text-white"
                          : m.status === "SUBMITTED"
                          ? "bg-purple-600 text-white"
                          : m.status === "REJECTED"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-500 text-white"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{m.description || "No description provided."}</p>
                </div>

                <div className="text-right sm:shrink-0">
                  <p className="text-sm font-bold text-slate-900">₹{m.allocated_amount?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">{m.percentage}% of contract</p>
                </div>
              </div>

              {/* Progress & Actions */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : "Not specified"}
                  </span>
                  {m.completion_percentage > 0 && (
                    <span>Progress: <strong>{m.completion_percentage}%</strong></span>
                  )}
                  {m.deliverable_proof_url && (
                    <a
                      href={m.deliverable_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Evidence Link
                    </a>
                  )}
                </div>

                {/* Milestone Submission Button */}
                {(m.status === "PENDING" || m.status === "IN_PROGRESS" || m.status === "REJECTED") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSubmittingMilestone(m);
                      setCompletionPercentage("100");
                      setSubmissionNotes("");
                      setDeliverableProofUrl(m.deliverable_proof_url || "");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Completion
                  </Button>
                )}
                {m.status === "SUBMITTED" && (
                  <span className="text-xs text-purple-700 font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Submitted for Government Review
                  </span>
                )}
                {m.status === "ACCEPTED" && (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accepted & Tranche Unlocked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decoupled Payment Tranches Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-600" />
              Payment Tranches ({tranches.length})
            </h2>
            <p className="text-xs text-slate-500">
              Tranches are decoupled from milestones. When a milestone is accepted, the linked tranche transitions to ELIGIBLE.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {tranches.map((tr: any) => (
            <div
              key={tr.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition space-y-3 bg-slate-50/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {tr.tranche_code}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Tranche #{tr.sequence_order}
                    </span>
                    <Badge
                      className={
                        tr.status === "PAID"
                          ? "bg-emerald-600 text-white"
                          : tr.status === "APPROVED"
                          ? "bg-blue-600 text-white"
                          : tr.status === "ELIGIBLE"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-400 text-white"
                      }
                    >
                      {tr.status}
                    </Badge>
                  </div>
                </div>

                <div className="text-right sm:shrink-0">
                  <p className="text-base font-bold text-slate-900">₹{tr.amount?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">{tr.percentage}% allocation</p>
                </div>
              </div>

              {/* Status details & Claim Button */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-slate-500">
                  {tr.status === "LOCKED" && (
                    <span>Locked until linked milestone #{tr.sequence_order} is formally accepted.</span>
                  )}
                  {tr.status === "ELIGIBLE" && (
                    <span className="text-amber-700 font-medium">
                      Milestone verified! You can now submit your tax invoice for disbursement.
                    </span>
                  )}
                  {tr.status === "APPROVED" && (
                    <span className="text-blue-700 font-medium">
                      Invoice verified by authority. Treasury disbursement in queue.
                    </span>
                  )}
                  {tr.status === "PAID" && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Disbursed (Ref: {tr.payment_reference || "PFMS"})
                    </span>
                  )}
                </div>

                {tr.status === "ELIGIBLE" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setInvoicingTranche(tr);
                      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
                      setBasicAmount(tr.amount?.toString() || "");
                      const tax = Math.round((tr.amount || 0) * 0.18);
                      setTaxAmount(tax.toString());
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Claim Invoice
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 10-Stage Auditable Traceability */}
      {contract.traceability && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Lifecycle Audit & Traceability</h2>
          <ProcurementTraceability
            stages={contract.traceability.stages || []}
            currentStageId="CONTRACT"
            title="Contract Lifecycle Audit Trail"
          />
        </div>
      )}

      {/* Milestone Submission Modal */}
      {submittingMilestone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-600" />
              Submit Milestone Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Milestone #{submittingMilestone.sequence_order}: {submittingMilestone.title}
            </p>

            <form onSubmit={handleSubmitMilestone} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Completion Percentage (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Notes & Deliverable Summary
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Detail the deliverable components completed, test certificates produced, or services delivered..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deliverable Proof URL (Optional)
                </label>
                <input
                  type="url"
                  value={deliverableProofUrl}
                  onChange={(e) => setDeliverableProofUrl(e.target.value)}
                  placeholder="https://drive.google.com/your-deliverable-proof.pdf"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmittingMilestone(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Verification"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoicingTranche && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Claim Invoice: {invoicingTranche.tranche_code}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Submit formal GST tax invoice against eligible Tranche #{invoicingTranche.sequence_order} (₹{invoicingTranche.amount?.toLocaleString()})
            </p>

            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Amount (₹)</label>
                  <input
                    type="number"
                    value={basicAmount}
                    onChange={(e) => setBasicAmount(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Amount / GST (₹)</label>
                  <input
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice PDF URL or Cloud Document Link
                </label>
                <input
                  type="url"
                  value={invoiceFileUrl}
                  onChange={(e) => setInvoiceFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/invoice-doc.pdf"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="e.g. Bank details: HDFC0001234 A/C 991827361..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoicingTranche(null)}
                  disabled={isSubmittingInvoice}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isSubmittingInvoice}
                >
                  {isSubmittingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Invoice"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
