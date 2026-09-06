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
  Scale,
  Building2,
  Rocket,
  ShieldCheck,
  FileCheck2,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Plus,
  Coins,
  Check,
  X,
  Upload,
  Layers,
} from "lucide-react";
import { ProcurementTraceability } from "@/components/procurement/ProcurementTraceability";

export default function GovernmentProcurementDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "PROCUREMENT_OFFICER", "ADMIN"]}>
      <ProcurementDetailContent />
    </ProtectedRoute>
  );
}

function ProcurementDetailContent() {
  const params = useParams();
  const router = useRouter();
  const procurementId = params?.id as string;
  const { currentUser } = useAuth();

  const [record, setRecord] = useState<any>(null);
  const [traceability, setTraceability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contract Creation Modal State
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState("");
  const [contractValue, setContractValue] = useState(1000000);
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [contractEndDate, setContractEndDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [contractTerms, setContractTerms] = useState(
    "Standard public procurement terms and conditions compliant with GFR 2017 Rule 149/194 innovation guidelines."
  );

  // 4 Default Milestones for Step 8: 20%, 30%, 30%, 20%
  const [milestones, setMilestones] = useState([
    { milestone_code: "CM-01", title: "Site Readiness & Inception Baseline", sequence_number: 1, due_date: "", percentage: 20, amount: 200000, deliverable_requirements: "Technical blueprint and architecture sign-off." },
    { milestone_code: "CM-02", title: "Phase 1 Core Operational Deployment", sequence_number: 2, due_date: "", percentage: 30, amount: 300000, deliverable_requirements: "Deployment report and initial telemetry stream." },
    { milestone_code: "CM-03", title: "Full Scale Integration & Acceptance", sequence_number: 3, due_date: "", percentage: 30, amount: 300000, deliverable_requirements: "End-to-end user acceptance testing certification." },
    { milestone_code: "CM-04", title: "Warranty, Knowledge Transfer & Handover", sequence_number: 4, due_date: "", percentage: 20, amount: 200000, deliverable_requirements: "Documentation, training logs, and final handover certificate." },
  ]);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!procurementId) return;
    loadData();
  }, [procurementId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [r, t] = await Promise.all([
        apiRequest<any>(`/api/v1/government/procurement/${procurementId}`),
        apiRequest<any>(`/api/v1/government/procurement/${procurementId}/traceability`),
      ]);
      setRecord(r);
      setTraceability(t);

      // Pre-fill contract modal
      setContractTitle(`Public Procurement Contract: ${r.title}`);
      const val = parseFloat(r.approved_value || r.estimated_value) || 1000000;
      setContractValue(val);
      updateMilestonesForValue(val);
    } catch (err: any) {
      setError(err.message || "Failed to load procurement dossier.");
    } finally {
      setLoading(false);
    }
  };

  const updateMilestonesForValue = (totalVal: number) => {
    setMilestones([
      { milestone_code: "CM-01", title: "Site Readiness & Inception Baseline", sequence_number: 1, due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], percentage: 20, amount: totalVal * 0.20, deliverable_requirements: "Technical blueprint sign-off." },
      { milestone_code: "CM-02", title: "Phase 1 Core Operational Deployment", sequence_number: 2, due_date: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0], percentage: 30, amount: totalVal * 0.30, deliverable_requirements: "Deployment report." },
      { milestone_code: "CM-03", title: "Full Scale Integration & Acceptance", sequence_number: 3, due_date: new Date(Date.now() + 120 * 86400000).toISOString().split("T")[0], percentage: 30, amount: totalVal * 0.30, deliverable_requirements: "UAT certification." },
      { milestone_code: "CM-04", title: "Warranty & Final Handover", sequence_number: 4, due_date: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0], percentage: 20, amount: totalVal * 0.20, deliverable_requirements: "Handover certificate." },
    ]);
  };

  const handleApprovalAction = async (approvalId: string, action: "APPROVE" | "REJECT") => {
    const comments = prompt(`Enter comments for ${action}:`);
    if (comments === null) return;
    try {
      setActionLoading(true);
      await apiRequest(`/api/v1/government/procurement/${procurementId}/approvals/${approvalId}/${action.toLowerCase()}`, {
        method: "POST",
        body: JSON.stringify({ comments }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record approval action.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const payload = {
        title: contractTitle,
        contract_type: "SERVICE",
        contract_value: contractValue,
        currency: record.currency || "INR",
        start_date: contractStartDate,
        end_date: contractEndDate,
        scope: record.scope,
        terms_summary: contractTerms,
        milestones: milestones.map((m) => ({
          milestone_code: m.milestone_code,
          title: m.title,
          sequence_number: m.sequence_number,
          due_date: m.due_date || contractEndDate,
          amount: m.amount,
          percentage: m.percentage,
          deliverable_requirements: m.deliverable_requirements,
        })),
      };

      const newContract = await apiRequest<any>(`/api/v1/government/procurement/${procurementId}/contract`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setContractModalOpen(false);
      router.push(`/government/contracts/${newContract.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to execute contract.");
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

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Procurement Record Not Found</h2>
        <Link href="/government/procurement">
          <Button variant="outline" className="mt-4">Back to Portfolio</Button>
        </Link>
      </div>
    );
  }

  const isApproved = record.approval_status === "APPROVED";
  const hasContract = Boolean(record.contract_id);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/government/procurement"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Procurement Portfolio
        </Link>
        <Badge variant="gov" className="text-xs">
          Step 8: Procurement Dossier
        </Badge>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              {record.procurement_code}
            </span>
            <span className="text-slate-300">•</span>
            <Badge
              variant={
                record.status === "ACTIVE" || record.status === "COMPLETED"
                  ? "success"
                  : record.status === "APPROVED" || record.status === "CONTRACTING"
                  ? "default"
                  : "secondary"
              }
              className="text-xs uppercase"
            >
              {record.status}
            </Badge>
            <span className="text-slate-300">•</span>
            <Badge variant="outline" className="text-xs font-mono">
              {record.approval_status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {record.title}
          </h1>
          <p className="text-xs text-slate-600">
            Department: <strong>{record.department_name || "Nodal Department"}</strong> • Startup: <strong>{record.startup_name || "Awarded Innovator"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasContract ? (
            <Link href={`/government/contracts/${record.contract_id}`}>
              <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-300" />
                View Executed Contract
              </Button>
            </Link>
          ) : isApproved ? (
            <Button
              size="sm"
              onClick={() => setContractModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Create Contract
            </Button>
          ) : (
            <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              Contracting locked until all statutory approvals are complete
            </div>
          )}
        </div>
      </div>

      {/* 10-Stage Traceability Timeline */}
      {traceability?.stages && (
        <ProcurementTraceability
          stages={traceability.stages}
          currentStageId="PROCUREMENT"
          title="Procurement Transition Audit Trail"
        />
      )}

      {/* Grid: Pathway Details & Multi-tier Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pathway & Scope */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-900 text-sm">Procurement Pathway</span>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-900">
                {record.pathway_code}
              </Badge>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Pathway Designation</span>
              <span className="font-semibold text-slate-800 text-xs">{record.pathway_name}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Approved Order Value</span>
              <span className="text-xl font-bold text-emerald-700">
                ₹{(record.approved_value || record.estimated_value)?.toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Statutory Scope</span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                {record.scope}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 space-y-1">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Statutory Acknowledgement Confirmed
              </span>
              <p className="text-[10px] text-emerald-800 leading-tight">
                "Subject to applicable government procurement rules and internal financial approvals."
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Tier Approvals Workflow */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Required Statutory Approval Workflow
                </h3>
                <p className="text-xs text-slate-500">
                  Configured pathway governance requirements. Approvals are strictly explicit.
                </p>
              </div>
              <Badge variant={isApproved ? "success" : "secondary"} className="text-xs">
                {isApproved ? "Fully Approved" : "Approvals In Progress"}
              </Badge>
            </div>

            <div className="space-y-3">
              {record.approvals?.map((a: any, idx: number) => {
                const isPassed = a.status === "APPROVED";
                const isPending = a.status === "PENDING";
                const isRejected = a.status === "REJECTED";

                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                      isPassed
                        ? "bg-emerald-50/40 border-emerald-200"
                        : isRejected
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {a.approval_type.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={isPassed ? "success" : isRejected ? "destructive" : "secondary"}
                          className="text-[9px]"
                        >
                          {a.status}
                        </Badge>
                      </div>

                      {a.approver_name && (
                        <p className="text-slate-500 text-[11px]">
                          Official: <strong>{a.approver_name}</strong> ({a.approver_role})
                        </p>
                      )}
                      {a.comments && (
                        <p className="text-slate-600 italic text-[11px]">
                          "{a.comments}"
                        </p>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleApprovalAction(a.id, "APPROVE")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleApprovalAction(a.id, "REJECT")}
                          className="text-rose-600 hover:bg-rose-50 text-xs h-7 gap-1 border-rose-200"
                        >
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Creation Modal */}
      {contractModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Execute Public Innovation Contract
                </h3>
                <p className="text-xs text-slate-500">
                  Transfers approved procurement transition into an enforceable milestone-bound contract.
                </p>
              </div>
              <button
                onClick={() => setContractModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Contract Title *</label>
                <input
                  type="text"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contract Value (₹) *</label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setContractValue(val);
                      updateMilestonesForValue(val);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">End Date *</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Milestones Distribution (Pre-configured 100% check) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Deliverable Milestones & Tranches (Must sum to 100%)
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    Total: {milestones.reduce((acc, m) => acc + m.percentage, 0)}%
                  </Badge>
                </div>

                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <span className="font-mono font-bold text-slate-800 block text-[11px]">{m.milestone_code}: {m.title}</span>
                        <span className="text-[10px] text-slate-400 truncate block">{m.deliverable_requirements}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700">{m.percentage}%</span>
                      </div>
                      <div className="text-right font-bold text-emerald-700">
                        ₹{m.amount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-semibold text-slate-700">Terms Summary *</label>
                <textarea
                  rows={2}
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContractModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
                  Execute Contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
