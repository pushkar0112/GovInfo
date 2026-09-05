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
  Check,
  X,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
} from "lucide-react";

interface GovApplicationDetail {
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

export default function GovernmentApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;
  const { currentUser } = useAuth();

  const [application, setApplication] = useState<GovApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Decision Modal State
  const [decisionModalTarget, setDecisionModalTarget] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<GovApplicationDetail>(`/api/v1/government/applications/${applicationId}`);
      setApplication(data);
      if (data.review_notes) {
        setReviewNotes(data.review_notes);
      }
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

  const handleStatusTransition = async (targetStatus: string) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await apiRequest<GovApplicationDetail>(
        `/api/v1/government/applications/${applicationId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: targetStatus,
            review_notes: reviewNotes.trim() || undefined,
          }),
        }
      );
      setApplication(updated);
      setDecisionModalTarget(null);
      setStatusSuccess(`Application successfully transitioned to '${targetStatus}'.`);
      setTimeout(() => setStatusSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to transition application status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs text-slate-500 mt-2">Loading proposal dossier for review...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !application) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Application Unavailable</h2>
            <p className="text-xs text-slate-500">{error || "Record not found or access denied."}</p>
            <Link href="/government/applications">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Inbox
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!application) return null;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Breadcrumb & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/government/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Application Inbox
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Current Status:</span>
              <Badge variant="gov" className="text-xs font-bold">
                {application.status}
              </Badge>
            </div>
          </div>

          {/* Alert Messages */}
          {statusSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusSuccess}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {application.application_code}
                </span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                  Applicant: {application.startup_name}
                </span>
                {application.dpiit_status === "VERIFIED" && (
                  <Badge variant="success" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> DPIIT {application.dpiit_number || "Verified"}
                  </Badge>
                )}
              </div>

              {application.submitted_at && (
                <div className="text-xs text-slate-400">
                  Submitted {new Date(application.submitted_at).toLocaleString()}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              {application.proposal_title || "Untitled Proposal"}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Challenge:</span>
                <Link
                  href={`/government/challenges/${application.challenge_id}`}
                  className="font-bold text-[#0B2545] hover:underline"
                >
                  {application.challenge_title}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-800">
                  Requested Grant: ₹{application.requested_budget ? (application.requested_budget / 100000).toFixed(2) : "—"} Lakhs
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Pilot Timeline: {application.timeline_days || 90} Days</span>
              </div>
            </div>
          </div>

          {/* Two-Column Review Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: 9-Section Technical Proposal Dossier */}
            <div className="lg:col-span-2 space-y-6">
              {/* Executive Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Executive Summary & Solution Brief
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {application.executive_summary}
                </p>
              </div>

              {/* Problem Understanding */}
              {application.problem_understanding && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Problem Understanding & Civic Alignment
                  </h2>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {application.problem_understanding}
                  </p>
                </div>
              )}

              {/* Technical Architecture & Deep-Tech */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Proposed Architecture & Technical Approach
                </h2>

                <div className="space-y-3 text-xs">
                  {application.proposed_solution && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Architecture Specification:</span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                        {application.proposed_solution}
                      </p>
                    </div>
                  )}

                  {application.technical_approach && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Deep-Tech & Algorithmic Innovation:</span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                        {application.technical_approach}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Outcomes & 90-Day Sandbox Plan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Target Outcomes & 90-Day Sandbox Plan
                </h2>

                <div className="space-y-3 text-xs">
                  {application.expected_outcomes && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Expected Measurable Outcomes:</span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                        {application.expected_outcomes}
                      </p>
                    </div>
                  )}

                  {application.pilot_plan && (
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">Field Sandbox Plan:</span>
                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                        {application.pilot_plan}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Team & Past Deployments */}
              {(application.team_capabilities || application.previous_deployments) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Team Track Record & Field Experience
                  </h2>

                  <div className="space-y-3 text-xs">
                    {application.team_capabilities && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Engineering & Operations Team:</span>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                          {application.team_capabilities}
                        </p>
                      </div>
                    )}

                    {application.previous_deployments && (
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Prior Municipal / Enterprise Deployments:</span>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                          {application.previous_deployments}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supporting Documents */}
              {application.supporting_documents && application.supporting_documents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Uploaded Whitepapers & Documents ({application.supporting_documents.length})
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

            {/* Right: Decision Panel & Pre-Screening Snapshot */}
            <div className="space-y-6">
              {/* Reviewer Action Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Official Review & Status Decision
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  As the sponsoring nodal officer, you can transition this application to review, shortlist for pilot sandbox sanction, or reject.
                </p>

                <div className="space-y-2 pt-2">
                  {application.status === "SUBMITTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionModalTarget("UNDER_REVIEW")}
                      className="w-full text-xs font-semibold justify-start gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
                    >
                      <Clock className="w-4 h-4 text-amber-600" /> Mark as &ldquo;Under Review&rdquo;
                    </Button>
                  )}

                  {application.status !== "SHORTLISTED" && (
                    <Button
                      variant="gov"
                      size="sm"
                      onClick={() => setDecisionModalTarget("SHORTLISTED")}
                      className="w-full text-xs font-bold justify-start gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Shortlist for Pilot Sandbox Grant
                    </Button>
                  )}

                  {application.status !== "REJECTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionModalTarget("REJECTED")}
                      className="w-full text-xs font-semibold justify-start gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <X className="w-4 h-4 text-rose-600" /> Reject Application
                    </Button>
                  )}
                </div>

                {/* Review Notes Area */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Official Review Remarks / Notes:
                  </label>
                  <textarea
                    rows={4}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter technical comments, pilot feasibility remarks, or justification for shortlist/rejection..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingStatus}
                    onClick={() => handleStatusTransition(application.status)}
                    className="w-full text-xs font-semibold"
                  >
                    Save Review Notes
                  </Button>
                </div>
              </div>

              {/* Automated Eligibility Snapshot */}
              {application.eligibility_snapshot && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Pre-Screening Snapshot
                    </span>
                    <Badge
                      variant={application.eligibility_snapshot.is_eligible ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {application.eligibility_snapshot.overall_status || "SCREENED"}
                    </Badge>
                  </div>

                  <p className="text-slate-600 text-[11px]">
                    {application.eligibility_snapshot.summary}
                  </p>

                  {application.eligibility_snapshot.mandatory_criteria && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {application.eligibility_snapshot.mandatory_criteria.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-700 text-[11px] truncate max-w-[180px]">{c.criterion}</span>
                          <span className={c.passed ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                            {c.passed ? "✓ Passed" : "✗ Action Req"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {decisionModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Decision: {decisionModalTarget}
                  </h3>
                </div>
                <button
                  onClick={() => setDecisionModalTarget(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to change the status of proposal <strong>{application.application_code}</strong> ({application.startup_name}) to <strong>{decisionModalTarget}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Decision Remarks:
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide decision rationale..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDecisionModalTarget(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition(decisionModalTarget)}
                  className="text-xs font-bold gap-1.5"
                >
                  {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Update
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
