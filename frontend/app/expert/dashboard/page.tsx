"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  ClipboardList,
  History,
  LogOut,
  User,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  Star,
  Check,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface AssignmentItem {
  id: string;
  application_id: string;
  application_code: string;
  proposal_title: string;
  challenge_id: string;
  challenge_title: string;
  expert_id: string;
  expert_name: string;
  expert_email: string;
  assignment_status: "ASSIGNED" | "ACCEPTED" | "DECLINED" | "IN_PROGRESS" | "COMPLETED" | "REASSIGNED";
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
  due_at?: string;
  notes?: string;
  conflict_declaration?: "NO_CONFLICT" | "CONFLICT_DECLARED" | null;
  conflict_reason?: string | null;
  overall_score?: number | null;
  recommendation?: string | null;
}

interface ExpertProfileData {
  id: string;
  full_name: string;
  email: string;
  organization?: string;
  designation?: string;
  expertise_domains: string[];
  years_of_experience?: number;
  availability_status: string;
}

type ExpertTab = "assigned" | "history";

function ExpertDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ExpertTab>("assigned");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [profile, setProfile] = useState<ExpertProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, profileRes] = await Promise.all([
        apiRequest<AssignmentItem[]>("/api/v1/expert/assignments"),
        apiRequest<ExpertProfileData>("/api/v1/experts/profile").catch(() => null),
      ]);
      setAssignments(assignmentsRes || []);
      if (profileRes) {
        setProfile(profileRes);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load expert evaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (assignmentId: string) => {
    setActionLoading(assignmentId);
    try {
      await apiRequest(`/api/v1/expert/assignments/${assignmentId}/accept`, {
        method: "POST",
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to accept assignment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (assignmentId: string) => {
    const reason = prompt("Please provide a reason for declining this evaluation assignment:");
    if (reason === null) return;
    setActionLoading(assignmentId);
    try {
      await apiRequest(`/api/v1/expert/assignments/${assignmentId}/decline`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to decline assignment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAvailability = async (newStatus: "AVAILABLE" | "BUSY" | "INACTIVE") => {
    setAvailabilityUpdating(true);
    try {
      const updated = await apiRequest<ExpertProfileData>("/api/v1/experts/profile", {
        method: "PUT",
        body: JSON.stringify({ availability_status: newStatus }),
      });
      setProfile(updated);
    } catch (err: any) {
      alert(err.message || "Failed to update availability status.");
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  if (!currentUser) return null;

  const activeAssignments = assignments.filter(
    (a) => a.assignment_status !== "COMPLETED" && a.assignment_status !== "DECLINED"
  );
  const completedAssignments = assignments.filter(
    (a) => a.assignment_status === "COMPLETED"
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  Expert Evaluator Portal
                </h1>
                <Badge variant="gov" className="text-[10px] bg-purple-400/20 text-purple-200 border-purple-400/30">
                  Technical Panel
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {profile?.organization || currentUser.organization_name || "Academic & Research Institution"} • Objective Scoring Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5">
                <User className="w-3.5 h-3.5" />
                Profile
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
        {/* Welcome & Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Empaneled Technical Specialist
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Welcome, {currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span>Account: <strong>{currentUser.email}</strong></span>
              <span>•</span>
              <Badge variant="gov" className="text-[10px]">
                {profile?.designation || currentUser.designation || "Senior Technical Advisor"}
              </Badge>
              {profile?.years_of_experience && (
                <>
                  <span>•</span>
                  <span>{profile.years_of_experience}+ Years Experience</span>
                </>
              )}
            </div>

            {profile?.expertise_domains && profile.expertise_domains.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold mr-1">Evaluation Domains:</span>
                {profile.expertise_domains.map((dom, i) => (
                  <span
                    key={i}
                    className="inline-block text-[11px] font-medium bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Availability Status Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 min-w-[240px] space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Panel Availability Status:</span>
            <div className="flex items-center gap-1.5">
              {(["AVAILABLE", "BUSY", "INACTIVE"] as const).map((st) => {
                const isSelected = (profile?.availability_status || "AVAILABLE") === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleToggleAvailability(st)}
                    disabled={availabilityUpdating}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? st === "AVAILABLE"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : st === "BUSY"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-slate-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st === "AVAILABLE" ? "Available" : st === "BUSY" ? "Busy" : "Inactive"}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              Government officers filter by availability when routing new proposals.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Active Assignments</span>
              <ClipboardList className="w-4 h-4 text-blue-900" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {activeAssignments.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending review or scoring</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Completed Reviews</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {completedAssignments.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Finalized scoring dossiers</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>CVC COI Compliance</span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">
              100%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">No-conflict audit verified</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "assigned", label: `Assigned Evaluations (${activeAssignments.length})`, icon: ClipboardList },
            { id: "history", label: `Evaluation History (${completedAssignments.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ExpertTab)}
                className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#0B2545] text-[#0B2545] font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0B2545]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading expert evaluation assignments...</p>
          </div>
        ) : activeTab === "assigned" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pending Technical Evaluations</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proposals allocated for multi-criteria assessment and objective transparent scoring.
                </p>
              </div>
            </div>

            {activeAssignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center shadow-xs">
                <FolderOpen className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No proposals pending evaluation.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  When government nodal officers allocate startup applications to your domain panel, they will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeAssignments.map((assignment) => {
                  const isDeclined = assignment.assignment_status === "DECLINED";
                  const hasConflict = assignment.conflict_declaration === "CONFLICT_DECLARED";
                  const hasNoConflict = assignment.conflict_declaration === "NO_CONFLICT";

                  return (
                    <div
                      key={assignment.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {assignment.application_code}
                          </span>
                          <Badge
                            variant={
                              assignment.assignment_status === "COMPLETED"
                                ? "success"
                                : assignment.assignment_status === "ACCEPTED" || assignment.assignment_status === "IN_PROGRESS"
                                ? "gov"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {assignment.assignment_status}
                          </Badge>

                          {hasConflict ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3" /> Conflict Declared
                            </Badge>
                          ) : hasNoConflict ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3" /> No Conflict Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                              COI Pending
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-slate-900">
                          {assignment.proposal_title}
                        </h4>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-500">Challenge:</span>
                          <strong>{assignment.challenge_title}</strong>
                          <span>•</span>
                          <span>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                          {assignment.due_at && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due: {new Date(assignment.due_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </p>

                        {assignment.notes && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <strong>Official Instructions:</strong> {assignment.notes}
                          </div>
                        )}
                      </div>

                      {/* Action Button Section */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        {assignment.assignment_status === "ASSIGNED" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === assignment.id}
                              onClick={() => handleAccept(assignment.id)}
                              className="text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === assignment.id}
                              onClick={() => handleDecline(assignment.id)}
                              className="text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" /> Decline
                            </Button>
                          </>
                        )}

                        <Link href={`/expert/assignments/${assignment.id}`}>
                          <Button
                            variant="gov"
                            size="sm"
                            className="w-full sm:w-auto text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                          >
                            <span>Open Scoring Workspace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Completed History Tab */
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Completed Evaluation Archive</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent record of completed scoring assessments, recommendations, and audit logs.
              </p>
            </div>

            {completedAssignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center shadow-xs">
                <History className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No completed evaluations found.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Completed assessments will be permanently archived here for public procurement transparency.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {completedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {assignment.application_code}
                        </span>
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Evaluation Finalized
                        </Badge>
                        {assignment.recommendation && (
                          <Badge variant="outline" className="text-[10px] font-bold border-purple-300 text-purple-900 bg-purple-50">
                            {assignment.recommendation.replace("_", " ")}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {assignment.proposal_title}
                      </h4>

                      <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500">Challenge:</span>
                        <strong>{assignment.challenge_title}</strong>
                        <span>•</span>
                        <span>Completed: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : "—"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {assignment.overall_score !== null && assignment.overall_score !== undefined && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Overall Score</span>
                          <div className="text-2xl font-black text-[#0B2545]">
                            {assignment.overall_score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
                          </div>
                        </div>
                      )}

                      <Link href={`/expert/assignments/${assignment.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          View Dossier
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ExpertDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["EXPERT", "EXPERT_EVALUATOR", "ADMIN"]}>
      <ExpertDashboardContent />
    </ProtectedRoute>
  );
}
