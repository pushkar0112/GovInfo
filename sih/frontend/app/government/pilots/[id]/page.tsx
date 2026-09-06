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
  FlaskConical,
  Building2,
  Rocket,
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
  Plus,
  Play,
  Pause,
  StopCircle,
  XCircle,
  Edit,
  X,
  Scale,
  Layers,
  ChevronRight,
  Info,
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
  submitter_name?: string;
  reviewed_at?: string;
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
  deliverable_description?: string;
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
  due_date?: string;
  completion_date?: string;
  is_overdue: boolean;
  deliverables: DeliverableItem[];
}

interface PilotDetail {
  id: string;
  pilot_code?: string;
  application_id: string;
  challenge_id?: string;
  startup_id?: string;
  government_department_id?: string;
  pilot_title?: string;
  title?: string;
  objective?: string;
  scope?: string;
  scope_of_work?: string;
  problem_statement?: string;
  proposed_solution?: string;
  expected_outcomes?: string;
  pilot_location?: string;
  sandbox_location?: string;
  operating_regions?: string;
  start_date?: string;
  planned_end_date?: string;
  end_date?: string;
  actual_end_date?: string;
  duration_days: number;
  pilot_budget?: number;
  approved_budget?: number;
  currency: string;
  status: string;
  approval_status: string;
  success_status: string;
  government_owner_name?: string;
  startup_owner_name?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  pilot_progress: number;
  total_milestones_count: number;
  completed_milestones_count: number;
  overdue_milestones_count: number;
  startup_name?: string;
  department_name?: string;
  challenge_title?: string;
  milestones: MilestoneItem[];
  deliverables: DeliverableItem[];
  created_at: string;
  updated_at?: string;
}

export default function GovernmentPilotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pilotId = params.id as string;
  const { currentUser } = useAuth();

  const [pilot, setPilot] = useState<PilotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"milestones" | "scope" | "deliverables" | "governance">("milestones");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals state
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ action: string; title: string; prompt: string; requiresReason: boolean } | null>(null);
  const [actionReason, setActionReason] = useState("");

  const [reviewMilestoneModal, setReviewMilestoneModal] = useState<MilestoneItem | null>(null);
  const [milestoneReviewAction, setMilestoneReviewAction] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [milestoneReviewRemarks, setMilestoneReviewRemarks] = useState("");

  const [reviewDeliverableModal, setReviewDeliverableModal] = useState<DeliverableItem | null>(null);
  const [deliverableReviewAction, setDeliverableReviewAction] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [deliverableReviewRemarks, setDeliverableReviewRemarks] = useState("");

  // New milestone form state
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneObjective, setNewMilestoneObjective] = useState("");
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");
  const [newMilestoneWeight, setNewMilestoneWeight] = useState(25);
  const [newMilestoneTranche, setNewMilestoneTranche] = useState(0);
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("");

  const fetchPilot = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PilotDetail>(`/api/v1/government/pilots/${pilotId}`);
      setPilot(data);
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to load pilot dossier." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pilotId) {
      fetchPilot();
    }
  }, [pilotId]);

  const handleLifecycleAction = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      const updated = await apiRequest<PilotDetail>(`/api/v1/government/pilots/${pilotId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: actionModal.action,
          reason: actionReason.trim() || undefined,
        }),
      });
      setPilot(updated);
      setActionMessage({
        type: "success",
        text: `Pilot sandbox status updated: '${updated.status}'.`,
      });
      setActionModal(null);
      setActionReason("");
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || `Failed to execute action ${actionModal.action}.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionMessage(null);

    const nextSeq = (pilot?.milestones?.length || 0) + 1;

    try {
      await apiRequest(`/api/v1/government/pilots/${pilotId}/milestones`, {
        method: "POST",
        body: JSON.stringify({
          sequence_number: nextSeq,
          title: newMilestoneTitle.trim(),
          objective: newMilestoneObjective.trim() || undefined,
          description: newMilestoneDescription.trim() || undefined,
          weight: Number(newMilestoneWeight) || 0,
          tranche_amount: Number(newMilestoneTranche) || 0,
          planned_end_date: newMilestoneDueDate || undefined,
        }),
      });

      setAddMilestoneModalOpen(false);
      setNewMilestoneTitle("");
      setNewMilestoneObjective("");
      setNewMilestoneDescription("");
      setNewMilestoneDueDate("");
      setActionMessage({ type: "success", text: "Milestone added to operational roadmap." });
      fetchPilot();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to add milestone." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewMilestone = async () => {
    if (!reviewMilestoneModal) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      await apiRequest(`/api/v1/government/pilots/${pilotId}/milestones/${reviewMilestoneModal.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action: milestoneReviewAction,
          reason: milestoneReviewRemarks.trim() || undefined,
        }),
      });

      setReviewMilestoneModal(null);
      setMilestoneReviewRemarks("");
      setActionMessage({
        type: "success",
        text: `Milestone review recorded: ${milestoneReviewAction}.`,
      });
      fetchPilot();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to submit milestone review." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewDeliverable = async () => {
    if (!reviewDeliverableModal) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      await apiRequest(`/api/v1/government/pilots/${pilotId}/deliverables/${reviewDeliverableModal.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action: deliverableReviewAction,
          review_comments: deliverableReviewRemarks.trim() || undefined,
        }),
      });

      setReviewDeliverableModal(null);
      setDeliverableReviewRemarks("");
      setActionMessage({
        type: "success",
        text: `Deliverable evidence review recorded: ${deliverableReviewAction}.`,
      });
      fetchPilot();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to submit deliverable review." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading operational pilot dossier...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!pilot) {
    return (
      <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Pilot Not Found</h2>
            <p className="text-xs text-slate-500">This pilot record does not exist or access is restricted.</p>
            <Link href="/government/pilots">
              <Button variant="outline" size="sm" className="text-xs">
                Back to Portfolio
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
  const location = pilot.pilot_location || pilot.sandbox_location || "Primary Field Sandbox Site";
  const totalWeights = pilot.milestones.reduce((s, m) => s + (m.weight || 0), 0);
  const isWeight100 = Math.abs(totalWeights - 100.0) < 0.01;

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Breadcrumb & Status Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/government/pilots"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Pilot Portfolio
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Pilot Status:</span>
              <Badge variant="gov" className="text-xs font-bold">
                {pilot.status}
              </Badge>
              {pilot.approval_status === "APPROVED" && (
                <Badge variant="success" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Plan Approved
                </Badge>
              )}
            </div>
          </div>

          {/* Action Feedback Notification */}
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

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {pilot.pilot_code || "PILOT-SANDBOX"}
                </span>
                <Badge variant="gov">
                  <FlaskConical className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                  Live Operational Sandbox
                </Badge>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>GFR 2017 Milestone-Bound Grant Sandbox</span>
                </div>
              </div>

              {/* Step 7 KPI Notice Banner */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Success Status: <strong className="text-slate-900">{pilot.success_status}</strong> (Governed by Step 7 KPI Validation)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {title}
              </h1>

              {pilot.objective && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                  {pilot.objective}
                </p>
              )}
            </div>

            {/* Quick Context Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Deploying Startup</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Rocket className="w-3.5 h-3.5 text-amber-600" />
                  {pilot.startup_name || "Partner Startup"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sponsoring Challenge</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-blue-900" />
                  {pilot.challenge_title || "National Challenge"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sandbox Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {location}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Timeline / Duration</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {pilot.duration_days || 90} Days ({pilot.start_date || "TBD"} to {pilot.planned_end_date || "TBD"})
                </span>
              </div>
            </div>

            {/* Progress & Lifecycle Toolbar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-1.5 max-w-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Overall Milestone Execution Progress</span>
                  <span className="font-extrabold text-blue-900 text-sm">{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-900 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, progress)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{pilot.completed_milestones_count} of {pilot.total_milestones_count} milestones completed</span>
                  <span>Sanctioned Grant: ₹{(budget / 100000).toFixed(2)} Lakhs</span>
                </div>
              </div>

              {/* Nodal Officer Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {pilot.status === "PROPOSED" && (
                  <>
                    <Button
                      variant="gov"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() =>
                        setActionModal({
                          action: "APPROVE",
                          title: "Approve Pilot Sandbox Plan",
                          prompt: "Confirm departmental approval of the startup's submitted sandbox plan.",
                          requiresReason: false,
                        })
                      }
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() =>
                        setActionModal({
                          action: "REJECT",
                          title: "Reject Pilot Sandbox Plan",
                          prompt: "State the reason for rejecting the proposed pilot plan.",
                          requiresReason: true,
                        })
                      }
                      className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Plan
                    </Button>
                  </>
                )}

                {(pilot.status === "APPROVED" || pilot.status === "PLANNING" || pilot.status === "DRAFT") && (
                  <Button
                    variant="gov"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => {
                      if (!isWeight100) {
                        setActionMessage({
                          type: "error",
                          text: `Cannot start pilot: Total milestone weights must equal exactly 100.0% (Current sum is ${totalWeights.toFixed(1)}%). Add or calibrate milestone weights before starting deployment.`,
                        });
                        return;
                      }
                      setActionModal({
                        action: "START",
                        title: "Start Live Field Deployment",
                        prompt: "Activate this sandbox pilot into the field. This transitions status to ACTIVE and locks baseline specifications.",
                        requiresReason: false,
                      });
                    }}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Active Deployment
                  </Button>
                )}

                {pilot.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() =>
                        setActionModal({
                          action: "PAUSE",
                          title: "Temporarily Pause Pilot",
                          prompt: "Pause sandbox operations due to site readiness, technical revision, or compliance review.",
                          requiresReason: false,
                        })
                      }
                      className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50 gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Pilot
                    </Button>

                    <Button
                      variant="gov"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() =>
                        setActionModal({
                          action: "COMPLETE",
                          title: "Mark Sandbox Pilot as Completed",
                          prompt: "Conclude operational sandbox trial. Requires that all milestones have been formally accepted. Note: Success status remains NOT_ASSESSED until Step 7 KPI Validation.",
                          requiresReason: false,
                        })
                      }
                      className="text-xs bg-[#0B2545] text-white gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Complete Sandbox
                    </Button>
                  </>
                )}

                {pilot.status === "PAUSED" && (
                  <Button
                    variant="gov"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() =>
                      setActionModal({
                        action: "RESUME",
                        title: "Resume Field Operations",
                        prompt: "Resume the active sandbox trial and unblock milestone tracking.",
                        requiresReason: false,
                      })
                    }
                    className="text-xs bg-blue-900 text-white gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" /> Resume Operations
                  </Button>
                )}

                {pilot.status !== "CANCELLED" && pilot.status !== "COMPLETED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() =>
                      setActionModal({
                        action: "CANCEL",
                        title: "Cancel Pilot Sandbox",
                        prompt: "Terminate sandbox engagement under public interest or critical breach. Reason is required.",
                        requiresReason: true,
                      })
                    }
                    className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel Pilot
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddMilestoneModalOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Milestone
                </Button>

                <Link href={`/government/pilots/${pilot.id}/edit`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Edit className="w-3.5 h-3.5" /> Edit Specs
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab("milestones")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "milestones"
                  ? "bg-[#0B2545] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Roadmap & Milestones ({pilot.milestones.length})
            </button>

            <button
              onClick={() => setActiveTab("scope")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "scope"
                  ? "bg-[#0B2545] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Technical Scope & Architecture
            </button>

            <button
              onClick={() => setActiveTab("deliverables")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "deliverables"
                  ? "bg-[#0B2545] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Deliverables & Proof Hub ({pilot.deliverables.length})
            </button>

            <button
              onClick={() => setActiveTab("governance")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "governance"
                  ? "bg-[#0B2545] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Governance & Audit Logs
            </button>
          </div>

          {/* TAB 1: Roadmap & Milestones */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              {/* Weight distribution warning if not 100% */}
              {!isWeight100 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Milestone weights currently total <strong>{totalWeights.toFixed(1)}%</strong> (Remaining:{" "}
                      <strong>{(100 - totalWeights).toFixed(1)}%</strong>). All active sandboxes strictly require a 100.0% sum to begin deployment.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddMilestoneModalOpen(true)}
                    className="text-xs bg-white text-amber-900 border-amber-300"
                  >
                    Add / Calibrate Milestone
                  </Button>
                </div>
              )}

              {pilot.milestones.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                  <Scale className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">No Milestones Defined Yet</h3>
                  <p className="text-xs text-slate-500">
                    Add time-bound milestones with deliverable criteria and percentage weights.
                  </p>
                  <Button
                    variant="gov"
                    size="sm"
                    onClick={() => setAddMilestoneModalOpen(true)}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone 01
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pilot.milestones.map((m) => {
                    const isAccepted = m.status === "ACCEPTED" || m.status === "COMPLETED";
                    const isSubmitted = m.status === "SUBMITTED" || m.status === "UNDER_REVIEW";
                    const isBlocked = m.status === "BLOCKED";
                    const isRejected = m.status === "REJECTED";

                    return (
                      <div
                        key={m.id}
                        className={`bg-white rounded-xl border p-6 transition-all space-y-4 ${
                          isAccepted
                            ? "border-emerald-200 bg-emerald-50/20"
                            : isSubmitted
                            ? "border-blue-200 bg-blue-50/20 ring-1 ring-blue-200"
                            : isBlocked
                            ? "border-rose-200 bg-rose-50/20"
                            : "border-slate-200"
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
                            {m.is_overdue && !isAccepted && (
                              <Badge variant="destructive" className="text-[10px]">
                                <Clock className="w-3 h-3 mr-1" /> Overdue Target
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              Weight: {m.weight}%
                            </Badge>
                            {m.tranche_amount > 0 && (
                              <span className="text-[11px] font-semibold text-slate-700">
                                Tranche: ₹{m.tranche_amount.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Review Button for Government */}
                            <Button
                              variant="gov"
                              size="sm"
                              onClick={() => {
                                setReviewMilestoneModal(m);
                                setMilestoneReviewAction("ACCEPT");
                                setMilestoneReviewRemarks("");
                              }}
                              className="text-xs gap-1.5 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                              Review Milestone
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
                                Deliverable Criteria: {m.description}
                              </p>
                            )}

                            {isBlocked && m.block_reason && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                                <span className="font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Milestone Blocked by Startup
                                </span>
                                <p>{m.block_reason}</p>
                              </div>
                            )}

                            {isRejected && m.rejection_reason && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                                <span className="font-bold flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" /> Milestone Rejected by Department
                                </span>
                                <p>{m.rejection_reason}</p>
                              </div>
                            )}
                          </div>

                          {/* Milestone Timeline & Completion Bar */}
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
                                <span>Planned Target:</span>
                                <span className="font-semibold text-slate-800">{m.planned_end_date || m.due_date || "—"}</span>
                              </div>
                              {m.actual_end_date && (
                                <div className="flex justify-between">
                                  <span>Actual Completed:</span>
                                  <span className="font-semibold text-emerald-700">{m.actual_end_date}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Weight Contribution:</span>
                                <span className="font-bold text-[#0B2545]">{((m.weight * m.completion_percentage) / 100).toFixed(1)}% of total</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Deliverables for this milestone */}
                        {m.deliverables && m.deliverables.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Technical Deliverables & Evidence ({m.deliverables.length})
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
                                        v{del.submission_version} • {del.file_name} • {(del.file_size / 1024).toFixed(0)} KB
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
                                      href={`/api/v1/government/pilots/${pilotId}/deliverables/${del.id}/download`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
                                      title="Download Evidence"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setReviewDeliverableModal(del);
                                        setDeliverableReviewAction("ACCEPT");
                                        setDeliverableReviewRemarks("");
                                      }}
                                      className="text-[10px] h-6 px-2 border-slate-200"
                                    >
                                      Review
                                    </Button>
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
              )}
            </div>
          )}

          {/* TAB 2: Technical Scope & Architecture */}
          {activeTab === "scope" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Operational Sandbox Specifications & Scope
                </h2>
                <p className="text-xs text-slate-500">
                  Approved technical parameters, problem diagnosis, and expected sandbox field performance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-slate-800 uppercase text-[11px] block mb-1">
                      Problem Statement
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                      {pilot.problem_statement || "No specific problem diagnosis recorded."}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 uppercase text-[11px] block mb-1">
                      Scope of Work & Sandbox Boundaries
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                      {pilot.scope || pilot.scope_of_work || "No specific scope of work defined."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-slate-800 uppercase text-[11px] block mb-1">
                      Proposed Solution Architecture
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                      {pilot.proposed_solution || "Architecture specifications preserved in proposal dossier."}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 uppercase text-[11px] block mb-1">
                      Expected Empirical Outcomes
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                      {pilot.expected_outcomes || "Outcome metrics defined in milestone telemetry logs."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Deliverables & Evidence Hub */}
          {activeTab === "deliverables" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Milestone Technical Deliverables Hub
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comprehensive registry of all whitepapers, telemetry datasets, test reports, and verification evidence submitted by the startup.
                  </p>
                </div>
                <Badge variant="gov" className="text-xs">
                  {pilot.deliverables.length} Total Submissions
                </Badge>
              </div>

              {pilot.deliverables.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2 text-xs">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No deliverables submitted yet by the startup partner.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pilot.deliverables.map((del) => (
                    <div
                      key={del.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{del.title}</span>
                          <span className="font-mono text-[10px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-100">
                            Version {del.submission_version}
                          </span>
                          <Badge
                            variant={
                              del.status === "ACCEPTED"
                                ? "success"
                                : del.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {del.status}
                          </Badge>
                        </div>

                        {del.description && (
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {del.description}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                          <span>File: {del.file_name}</span>
                          <span>•</span>
                          <span>Size: {(del.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Submitted {new Date(del.submitted_at).toLocaleString()}</span>
                        </div>

                        {del.review_comments && (
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                            <strong>Review Remarks:</strong> {del.review_comments}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/api/v1/government/pilots/${pilotId}/deliverables/${del.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="text-xs gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Download File
                          </Button>
                        </a>

                        <Button
                          variant="gov"
                          size="sm"
                          onClick={() => {
                            setReviewDeliverableModal(del);
                            setDeliverableReviewAction("ACCEPT");
                            setDeliverableReviewRemarks("");
                          }}
                          className="text-xs gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Review Deliverable
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Governance & Audit Logs */}
          {activeTab === "governance" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 text-xs">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Governance, Legal Framework & Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Compliance verification with GFR 2017 innovation sandbox provisions and platform immutability policies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 uppercase text-[11px] block">
                    Public Procurement Law Compliance
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    This operational sandbox trial is sanctioned under General Financial Rules (GFR) 2017 innovation procurement exemptions. All grant disbursements are strictly conditioned on documented deliverable validation.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 uppercase text-[11px] block">
                    Step 7 KPI Validation Boundary Notice
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Notice: Final pilot success classification is strictly governed by Step 7 KPI Validation and Independent Third-Party Audits. Milestone acceptance confirms operational deliverable receipt only.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">
                  Dossier Metadata & Timestamps
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Created Timestamp</span>
                    <span className="font-semibold text-slate-800">{new Date(pilot.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Last Updated</span>
                    <span className="font-semibold text-slate-800">{pilot.updated_at ? new Date(pilot.updated_at).toLocaleString() : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Application ID</span>
                    <span className="font-mono text-slate-800">{pilot.application_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Currency</span>
                    <span className="font-bold text-slate-800">{pilot.currency}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: Lifecycle Action (Approve, Start, Pause, Complete, Cancel) */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    {actionModal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActionModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {actionModal.prompt}
              </p>

              {actionModal.requiresReason && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Justification / Reason *
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={isProcessing || (actionModal.requiresReason && !actionReason.trim())}
                  onClick={handleLifecycleAction}
                  className="text-xs font-bold gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Action
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Milestone */}
        {addMilestoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full my-8 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Add Milestone to Operational Roadmap
                  </h3>
                </div>
                <button
                  onClick={() => setAddMilestoneModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Milestone Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder="e.g. Field Deployment of Telemetry Sensors"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Objective
                  </label>
                  <input
                    type="text"
                    value={newMilestoneObjective}
                    onChange={(e) => setNewMilestoneObjective(e.target.value)}
                    placeholder="Target outcome..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deliverable Specifications / Evidence Required
                  </label>
                  <textarea
                    rows={2}
                    value={newMilestoneDescription}
                    onChange={(e) => setNewMilestoneDescription(e.target.value)}
                    placeholder="Describe specific documentation, telemetry files, or verification reports..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Weight (%) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      required
                      value={newMilestoneWeight}
                      onChange={(e) => setNewMilestoneWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tranche (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={newMilestoneTranche}
                      onChange={(e) => setNewMilestoneTranche(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={newMilestoneDueDate}
                      onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddMilestoneModalOpen(false)}
                    disabled={isProcessing}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gov"
                    size="sm"
                    disabled={isProcessing || !newMilestoneTitle.trim()}
                    className="text-xs font-bold gap-1.5"
                  >
                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Add Milestone
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Milestone Review (Accept / Reject) */}
        {reviewMilestoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Review Milestone 0{reviewMilestoneModal.sequence_number}
                  </h3>
                </div>
                <button
                  onClick={() => setReviewMilestoneModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 block">{reviewMilestoneModal.title}</span>
                <span className="text-slate-500">Weight: {reviewMilestoneModal.weight}% • Current Status: {reviewMilestoneModal.status}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Official Department Decision *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMilestoneReviewAction("ACCEPT")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        milestoneReviewAction === "ACCEPT"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-600" /> Accept Milestone
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilestoneReviewAction("REJECT")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        milestoneReviewAction === "REJECT"
                          ? "bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <X className="w-4 h-4 text-rose-600" /> Reject / Rework
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Remarks / Justification
                  </label>
                  <textarea
                    rows={3}
                    value={milestoneReviewRemarks}
                    onChange={(e) => setMilestoneReviewRemarks(e.target.value)}
                    placeholder="Enter official remarks or rework specifications..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewMilestoneModal(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handleReviewMilestone}
                  className="text-xs font-bold gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Submit Review Decision
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Deliverable Review (Accept / Reject) */}
        {reviewDeliverableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#0B2545]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Review Technical Deliverable Evidence
                  </h3>
                </div>
                <button
                  onClick={() => setReviewDeliverableModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 block">{reviewDeliverableModal.title}</span>
                <span className="text-slate-500">
                  Version {reviewDeliverableModal.submission_version} • File: {reviewDeliverableModal.file_name}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Review Determination *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliverableReviewAction("ACCEPT")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        deliverableReviewAction === "ACCEPT"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-600" /> Accept Evidence
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverableReviewAction("REJECT")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        deliverableReviewAction === "REJECT"
                          ? "bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-400"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <X className="w-4 h-4 text-rose-600" /> Reject / Rework
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Review Remarks / Comments
                  </label>
                  <textarea
                    rows={3}
                    value={deliverableReviewRemarks}
                    onChange={(e) => setDeliverableReviewRemarks(e.target.value)}
                    placeholder="State technical compliance feedback or deficiencies..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewDeliverableModal(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handleReviewDeliverable}
                  className="text-xs font-bold gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Deliverable Review
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
