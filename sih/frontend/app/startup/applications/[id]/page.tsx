"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  Download,
  AlertTriangle,
  X,
  Send,
  Edit,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface ApplicationDetail {
  id: string;
  application_code: string;
  challenge_id: string;
  challenge_title: string;
  department_name?: string;
  ministry?: string;
  startup_id: string;
  startup_name: string;
  dpiit_number?: string;
  dpiit_status?: string;
  status: string;
  proposal_title: string;
  executive_summary: string;
  problem_understanding?: string;
  proposed_solution?: string;
  technical_approach?: string;
  expected_outcomes?: string;
  implementation_plan?: string;
  pilot_plan?: string;
  timeline_days?: number;
  team_capabilities?: string;
  previous_deployments?: string;
  requested_budget?: number;
  estimated_cost?: number;
  data_requirements?: string;
  security_approach?: string;
  ip_approach?: string;
  supporting_documents?: {
    document_id: string;
    original_filename: string;
    document_type: string;
    file_size_bytes: number;
    upload_timestamp: string;
  }[];
  eligibility_snapshot?: any;
  review_notes?: string;
  submitted_at?: string;
  created_at: string;
  updated_at?: string;
}

export default function StartupApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "true";
  const applicationId = params.id as string;
  const { currentUser } = useAuth();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(
    justSubmitted ? "Application successfully submitted to the department!" : null
  );

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ApplicationDetail>(`/api/v1/applications/${applicationId}`);
      setApplication(data);
    } catch (err: any) {
      setError(err.message || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/applications/${applicationId}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ reason: withdrawReason || "Withdrawn by startup applicant." }),
      });
      setShowWithdrawModal(false);
      setActionSuccess("Application was successfully withdrawn.");
      fetchApplication();
    } catch (err: any) {
      setError(err.message || "Failed to withdraw application.");
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case "DRAFT":
        return 0;
      case "SUBMITTED":
        return 1;
      case "UNDER_REVIEW":
        return 2;
      case "SHORTLISTED":
        return 3;
      case "REJECTED":
        return -1; // special case
      default:
        return 1;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs text-slate-500 mt-2">Loading application dossier...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !application) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Application Unavailable</h2>
            <p className="text-xs text-slate-500">{error || "Record not found."}</p>
            <Link href="/startup/applications">
              <Button variant="outline" size="sm" className="text-xs">
                Back to My Applications
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!application) return null;

  const currentStepIdx = getStatusStepIndex(application.status);
  const canWithdraw = application.status === "SUBMITTED" || application.status === "UNDER_REVIEW";

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Breadcrumb & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/startup/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to My Applications
            </Link>

            <div className="flex items-center gap-3">
              {application.status === "DRAFT" && (
                <Link href={`/startup/challenges/${application.challenge_id}/apply`}>
                  <Button variant="gov" size="sm" className="text-xs font-bold gap-1.5 shadow-xs">
                    <Edit className="w-3.5 h-3.5" /> Edit Proposal Draft
                  </Button>
                </Link>
              )}

              {canWithdraw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWithdrawModal(true)}
                  className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Withdraw Application
                </Button>
              )}
            </div>
          </div>

          {/* Success / Error Alerts */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
              <button
                onClick={() => setActionSuccess(null)}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {application.application_code || "DRAFT"}
                </span>
                <Badge variant="gov" className="text-xs">
                  {application.status}
                </Badge>
              </div>

              {application.submitted_at && (
                <div className="text-xs text-slate-400">
                  Formally submitted on {new Date(application.submitted_at).toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {application.proposal_title || "Untitled Solution Proposal"}
              </h1>
              <div className="text-xs text-slate-600 mt-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-500">Challenge:</span>
                  <Link
                    href={`/startup/challenges/${application.challenge_id}`}
                    className="font-bold text-[#0B2545] hover:underline"
                  >
                    {application.challenge_title}
                  </Link>
                </div>
                {application.department_name && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{application.department_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Progress Stepper */}
            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-800 mb-3">Application Review Status</div>
              {application.status === "REJECTED" ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <strong>Application Not Shortlisted:</strong> This proposal did not advance to the sandbox grant shortlist for this challenge cycle.
                    {application.review_notes && (
                      <p className="mt-1 text-slate-700 italic">&ldquo;{application.review_notes}&rdquo;</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "1. Draft Saved", desc: "Form saved" },
                    { label: "2. Submitted", desc: "Dispatched to Dept" },
                    { label: "3. Under Review", desc: "Technical screening" },
                    { label: "4. Shortlisted", desc: "Sandbox Pilot Grant" },
                  ].map((step, idx) => {
                    const isPassed = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? "bg-blue-50/80 border-[#0B2545] text-slate-900"
                            : isPassed
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{step.label}</div>
                        <div className="text-[10px] mt-0.5 opacity-80">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Department Review Comments (if present) */}
          {application.review_notes && application.status !== "REJECTED" && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-700" /> Sponsoring Department Review Notes
              </span>
              <p className="text-blue-900 leading-relaxed pl-5">{application.review_notes}</p>
            </div>
          )}

          {/* Proposal Specifications Dossier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Section 1: Executive Summary */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Executive Summary & Solution Pitch
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                {application.executive_summary}
              </p>
            </div>

            {/* Section 2: Problem Understanding */}
            {application.problem_understanding && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Problem Understanding & Public Sector Alignment
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {application.problem_understanding}
                </p>
              </div>
            )}

            {/* Section 3: Proposed Architecture & Deep-Tech */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {application.proposed_solution && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Proposed Technical Architecture
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.proposed_solution}
                  </p>
                </div>
              )}

              {application.technical_approach && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Deep-Tech Innovation & Algorithms
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.technical_approach}
                  </p>
                </div>
              )}
            </div>

            {/* Section 4: Expected Outcomes & 90-Day Pilot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {application.expected_outcomes && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Expected Outcomes & KPI Commitments
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.expected_outcomes}
                  </p>
                </div>
              )}

              {application.pilot_plan && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Field Pilot Sandbox Plan ({application.timeline_days || 90} Days)
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.pilot_plan}
                  </p>
                </div>
              )}
            </div>

            {/* Section 5: Commercial Budget Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Financial Breakdown & Commercials
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Requested Pilot Grant:</span>
                  <span className="text-base font-extrabold text-[#0B2545]">
                    ₹{application.requested_budget ? (application.requested_budget / 100000).toFixed(2) : "—"} Lakhs
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Full Rollout Cost:</span>
                  <span className="text-base font-bold text-slate-800">
                    ₹{application.estimated_cost ? (application.estimated_cost / 100000).toFixed(2) : "—"} Lakhs
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sandbox Timeline:</span>
                  <span className="text-base font-bold text-slate-800">
                    {application.timeline_days || 90} Days
                  </span>
                </div>
              </div>
            </div>

            {/* Section 6: Attached Supporting Documents */}
            {application.supporting_documents && application.supporting_documents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Supporting Documents & Whitepapers ({application.supporting_documents.length})
                </h2>
                <div className="space-y-2">
                  {application.supporting_documents.map((doc) => {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                    const downloadUrl = `${apiUrl}/api/v1/applications/documents/${doc.document_id}/download`;

                    return (
                      <div
                        key={doc.document_id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                          <div>
                            <div className="font-semibold text-slate-900">{doc.original_filename}</div>
                            <span className="text-[10px] text-slate-400">
                              {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        </div>

                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" /> Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Withdraw Confirmation Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold">Withdraw Application</h3>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to withdraw proposal <strong>{application.application_code}</strong>? Once withdrawn, evaluation officers will no longer consider this submission for sandbox funding.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Withdrawal (Optional)
                </label>
                <textarea
                  rows={2}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="e.g. Updating technical approach for next cycle..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={withdrawing}
                  onClick={handleWithdraw}
                  className="text-xs font-bold gap-1.5"
                >
                  {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Withdrawal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
