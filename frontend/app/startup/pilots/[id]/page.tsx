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
  Rocket,
  Building2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Coins,
  ShieldCheck,
  Award,
  FileCheck,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  Send,
  Calendar,
  MapPin,
  FileText,
  Download,
  Upload,
  Play,
  Scale,
  Layers,
  X,
  Plus,
  HelpCircle,
  FlaskConical,
} from "lucide-react";

interface DeliverableItem {
  id: string;
  milestone_id: string;
  pilot_id: string;
  title: string;
  description?: string;
  file_name: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  submission_version: number;
  status: string;
  submitted_at: string;
  submitted_by?: string;
  reviewer_name?: string;
  review_comments?: string;
}

interface MilestoneItem {
  id: string;
  pilot_id: string;
  milestone_code?: string;
  sequence_number: number;
  title: string;
  objective?: string;
  description?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  weight: number;
  completion_percentage: number;
  status: string;
  acceptance_status: string;
  block_reason?: string;
  rejection_reason?: string;
  tranche_amount: number;
  is_overdue: boolean;
  deliverables: DeliverableItem[];
}

interface PilotDetail {
  id: string;
  pilot_code?: string;
  application_id: string;
  challenge_id?: string;
  startup_id?: string;
  pilot_title?: string;
  title?: string;
  objective?: string;
  scope?: string;
  pilot_location?: string;
  operating_regions?: string;
  start_date?: string;
  planned_end_date?: string;
  duration_days: number;
  pilot_budget?: number;
  approved_budget?: number;
  currency: string;
  status: string;
  approval_status: string;
  success_status: string;
  government_owner_name?: string;
  department_name?: string;
  challenge_title?: string;
  pilot_progress: number;
  total_milestones_count: number;
  completed_milestones_count: number;
  overdue_milestones_count: number;
  milestones: MilestoneItem[];
  deliverables: DeliverableItem[];
  created_at: string;
}

export default function StartupPilotWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const pilotId = params.id as string;
  const { currentUser } = useAuth();

  const [pilot, setPilot] = useState<PilotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Milestone Progress Modal
  const [progressModalMilestone, setProgressModalMilestone] = useState<MilestoneItem | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState("IN_PROGRESS");
  const [updatedPercentage, setUpdatedPercentage] = useState(0);
  const [updatedBlockReason, setUpdatedBlockReason] = useState("");

  // Deliverable Submission Modal
  const [deliverableModalMilestone, setDeliverableModalMilestone] = useState<MilestoneItem | null>(null);
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableDescription, setDeliverableDescription] = useState("");
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  const fetchPilot = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PilotDetail>(`/api/v1/startup/pilots/${pilotId}`);
      setPilot(data);
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to load pilot workspace." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pilotId) {
      fetchPilot();
    }
  }, [pilotId]);

  const handleProposePlan = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const updated = await apiRequest<PilotDetail>(`/api/v1/startup/pilots/${pilotId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action: "PROPOSE" }),
      });
      setPilot(updated);
      setActionMessage({
        type: "success",
        text: "Pilot sandbox roadmap proposed! Awaiting departmental officer review and formal approval.",
      });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to propose pilot plan." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMilestoneProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalMilestone) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      await apiRequest(`/api/v1/startup/pilots/${pilotId}/milestones/${progressModalMilestone.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: updatedStatus,
          completion_percentage: Number(updatedPercentage),
          block_reason: updatedStatus === "BLOCKED" ? updatedBlockReason.trim() : undefined,
        }),
      });

      setProgressModalMilestone(null);
      setActionMessage({ type: "success", text: "Milestone progress and status updated." });
      fetchPilot();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to update milestone progress." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableModalMilestone || !deliverableFile) return;

    if (deliverableFile.size > 20 * 1024 * 1024) {
      setActionMessage({ type: "error", text: "File size exceeds 20MB limit." });
      return;
    }

    setUploadingDeliverable(true);
    setActionMessage(null);

    const formData = new FormData();
    formData.append("title", deliverableTitle.trim());
    if (deliverableDescription.trim()) {
      formData.append("description", deliverableDescription.trim());
    }
    formData.append("file", deliverableFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("govinnovate_token");

      const res = await fetch(
        `${apiUrl}/api/v1/startup/pilots/${pilotId}/milestones/${deliverableModalMilestone.id}/deliverables`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Upload failed.");
      }

      setDeliverableModalMilestone(null);
      setDeliverableTitle("");
      setDeliverableDescription("");
      setDeliverableFile(null);
      setActionMessage({
        type: "success",
        text: "Deliverable evidence uploaded! Departmental reviewers have been notified for compliance review.",
      });
      fetchPilot();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to upload deliverable file." });
    } finally {
      setUploadingDeliverable(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!pilot) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Pilot Not Found</h2>
            <p className="text-xs text-slate-500">You do not have access to this pilot sandbox.</p>
            <Link href="/startup/pilots">
              <Button variant="outline" size="sm" className="text-xs">
                Back to My Pilots
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const title = pilot.pilot_title || pilot.title || "Operational Sandbox Trial";
  const budget = pilot.pilot_budget || pilot.approved_budget || 0;
  const progress = Math.round(pilot.pilot_progress || 0);

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Back Nav & Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/startup/pilots"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Pilots
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Pilot Status:</span>
              <Badge variant="gov" className="text-xs font-bold">
                {pilot.status}
              </Badge>
              {pilot.approval_status === "APPROVED" && (
                <Badge variant="success" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                </Badge>
              )}
            </div>
          </div>

          {/* Feedback Message */}
          {actionMessage && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-semibold">{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="font-bold text-slate-500 hover:text-slate-800"
              >
                ×
              </button>
            </div>
          )}

          {/* Propose Action Banner if Draft */}
          {pilot.status === "DRAFT" && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1">
                <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-amber-600" />
                  Pilot Sandbox in Draft Mode
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Review the milestone specifications, weights, and timelines below. Once ready, submit the roadmap for formal government nodal officer approval.
                </p>
              </div>
              <Button
                variant="gov"
                size="sm"
                disabled={isProcessing}
                onClick={handleProposePlan}
                className="text-xs bg-amber-700 hover:bg-amber-800 text-white gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Submit Roadmap for Approval
              </Button>
            </div>
          )}

          {/* Top Pilot Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {pilot.pilot_code || "PILOT-SANDBOX"}
                </span>
                <Badge variant="gov">
                  <Rocket className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Startup Execution Desk
                </Badge>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>GFR 2017 Milestone-Bound Grant</span>
                </div>
              </div>

              <div className="text-xs text-slate-400">
                Created {new Date(pilot.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {title}
              </h1>
              {pilot.objective && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                  {pilot.objective}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nodal Department</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-900" />
                  {pilot.department_name || "Sponsoring Department"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sanctioned Grant</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  ₹{(budget / 100000).toFixed(2)} Lakhs
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sandbox Site</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {pilot.pilot_location || "Primary Deployment Field"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Deployment Window</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {pilot.duration_days || 90} Days ({pilot.start_date || "Pending"} to {pilot.planned_end_date || "Pending"})
                </span>
              </div>
            </div>

            {/* Progress Strip */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Cumulative Milestone Progress</span>
                <span className="font-extrabold text-blue-900 text-sm">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-900 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, progress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{pilot.completed_milestones_count} of {pilot.total_milestones_count} milestones accepted</span>
                <span>Grants are released in tranches upon verified deliverable approval.</span>
              </div>
            </div>
          </div>

          {/* Milestone Operational Roadmap */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Operational Roadmap & Milestone Deliverables
                </h2>
                <p className="text-xs text-slate-500">
                  Execute deliverables according to defined sequence and weights. Upload technical evidence for nodal review.
                </p>
              </div>
              <Badge variant="gov" className="text-xs">
                {pilot.milestones.length} Structured Milestones
              </Badge>
            </div>

            <div className="space-y-6">
              {pilot.milestones.map((m) => {
                const isAccepted = m.status === "ACCEPTED" || m.status === "COMPLETED";
                const isSubmitted = m.status === "SUBMITTED" || m.status === "UNDER_REVIEW";
                const isBlocked = m.status === "BLOCKED";
                const isRejected = m.status === "REJECTED";

                return (
                  <div
                    key={m.id}
                    className={`p-6 rounded-xl border transition-all space-y-4 ${
                      isAccepted
                        ? "border-emerald-200 bg-emerald-50/20"
                        : isSubmitted
                        ? "border-blue-200 bg-blue-50/20 ring-1 ring-blue-200"
                        : isBlocked
                        ? "border-rose-200 bg-rose-50/20"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                          Milestone 0{m.sequence_number}
                        </span>
                        <Badge
                          variant={
                            isAccepted
                              ? "success"
                              : isSubmitted
                              ? "gov"
                              : isBlocked
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {m.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Weight: {m.weight}%
                        </Badge>
                        {m.tranche_amount > 0 && (
                          <span className="text-[11px] font-semibold text-slate-700">
                            Grant Tranche: ₹{m.tranche_amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* Action buttons for startup */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProgressModalMilestone(m);
                            setUpdatedStatus(m.status === "NOT_STARTED" ? "IN_PROGRESS" : m.status);
                            setUpdatedPercentage(m.completion_percentage);
                            setUpdatedBlockReason(m.block_reason || "");
                          }}
                          className="text-xs gap-1.5"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          Update Progress
                        </Button>

                        <Button
                          variant="gov"
                          size="sm"
                          onClick={() => {
                            setDeliverableModalMilestone(m);
                            setDeliverableTitle(`Deliverable for Milestone 0${m.sequence_number}`);
                            setDeliverableDescription("");
                            setDeliverableFile(null);
                          }}
                          className="text-xs gap-1.5 shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          Submit Deliverable
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {m.title}
                        </h3>

                        {m.objective && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {m.objective}
                          </p>
                        )}

                        {m.description && (
                          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            Deliverable Requirements: {m.description}
                          </p>
                        )}

                        {isBlocked && m.block_reason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                            <span className="font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Reported Operational Blocker
                            </span>
                            <p>{m.block_reason}</p>
                          </div>
                        )}

                        {isRejected && m.rejection_reason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                            <span className="font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Revision Required by Government Nodal Officer
                            </span>
                            <p>{m.rejection_reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Milestone Progress & Dates */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-700">Completion</span>
                            <span className="font-bold text-blue-900">{m.completion_percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-900 h-2 rounded-full transition-all"
                              style={{ width: `${Math.max(2, m.completion_percentage)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                          <div className="flex justify-between">
                            <span>Target Date:</span>
                            <span className="font-semibold text-slate-800">{m.planned_end_date || "—"}</span>
                          </div>
                          {m.actual_end_date && (
                            <div className="flex justify-between">
                              <span>Completed Date:</span>
                              <span className="font-semibold text-emerald-700">{m.actual_end_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deliverables List */}
                    {m.deliverables && m.deliverables.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Submitted Deliverables & Proof Documents ({m.deliverables.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.deliverables.map((del) => (
                            <div
                              key={del.id}
                              className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                                <div className="truncate">
                                  <div className="font-semibold text-slate-900 truncate">{del.title}</div>
                                  <div className="text-[10px] text-slate-400">
                                    Version {del.submission_version} • {del.file_name} • {(del.file_size / 1024).toFixed(0)} KB
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant={
                                    del.status === "ACCEPTED"
                                      ? "success"
                                      : del.status === "REJECTED"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-[9px]"
                                >
                                  {del.status}
                                </Badge>

                                <a
                                  href={`/api/v1/startup/pilots/${pilotId}/deliverables/${del.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL: Update Milestone Progress */}
        {progressModalMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Update Milestone 0{progressModalMilestone.sequence_number} Progress
                  </h3>
                </div>
                <button
                  onClick={() => setProgressModalMilestone(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMilestoneProgress} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={updatedStatus}
                    onChange={(e) => setUpdatedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="SUBMITTED">SUBMITTED (Ready for review)</option>
                    <option value="BLOCKED">BLOCKED (Flag operational obstacle)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Completion Percentage (%)
                    </label>
                    <span className="font-extrabold text-blue-900">{updatedPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={updatedPercentage}
                    onChange={(e) => setUpdatedPercentage(parseInt(e.target.value) || 0)}
                    className="w-full accent-[#0B2545]"
                  />
                </div>

                {updatedStatus === "BLOCKED" && (
                  <div>
                    <label className="block font-semibold text-rose-700 mb-1">
                      Blocker Description & Assistance Needed *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={updatedBlockReason}
                      onChange={(e) => setUpdatedBlockReason(e.target.value)}
                      placeholder="Describe site delays, hardware customs, API access bottlenecks..."
                      className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:ring-1 focus:ring-rose-500 text-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProgressModalMilestone(null)}
                    disabled={isProcessing}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gov"
                    size="sm"
                    disabled={isProcessing}
                    className="text-xs font-bold gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Progress
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Submit Deliverable Evidence */}
        {deliverableModalMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Upload Milestone Deliverable Evidence
                  </h3>
                </div>
                <button
                  onClick={() => setDeliverableModalMilestone(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Submitting evidence for <strong>Milestone 0{deliverableModalMilestone.sequence_number}</strong>: {deliverableModalMilestone.title}.
              </p>

              <form onSubmit={handleSubmitDeliverable} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deliverable Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliverableTitle}
                    onChange={(e) => setDeliverableTitle(e.target.value)}
                    placeholder="e.g. PHC Baseline Telemetry Calibration Report"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Technical Scope Description
                  </label>
                  <textarea
                    rows={2}
                    value={deliverableDescription}
                    onChange={(e) => setDeliverableDescription(e.target.value)}
                    placeholder="Provide overview of telemetry artifacts, test scenarios, or empirical logs..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attach Evidence File (PDF, ZIP, DOCX, CSV - Max 20MB) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 hover:file:bg-slate-100"
                  />
                  {deliverableFile && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Selected: {deliverableFile.name} ({(deliverableFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Version-Tracked Deliverable
                  </span>
                  <p>
                    Re-submitting evidence after rework automatically creates an incremental version (v2, v3) while preserving historical review audit trails.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeliverableModalMilestone(null)}
                    disabled={uploadingDeliverable}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gov"
                    size="sm"
                    disabled={uploadingDeliverable || !deliverableTitle.trim() || !deliverableFile}
                    className="text-xs font-bold gap-1.5"
                  >
                    {uploadingDeliverable ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload & Submit Evidence
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
