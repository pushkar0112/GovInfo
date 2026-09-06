"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/auth";
import {
  CheckCheck,
  ClipboardCheck,
  History,
  LogOut,
  User,
  FolderOpen,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Scale,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface AssignmentItem {
  id: string;
  pilot_id: string;
  pilot_code?: string;
  pilot_title?: string;
  pilot_status?: string;
  department_name?: string;
  startup_name?: string;
  assigned_at: string;
  scope?: string;
  terms_of_reference?: string;
  status: string;
  coi_declared: boolean;
  coi_status: string;
  deadline?: string;
}

export default function ValidatorDashboardPage() {
  const { currentUser, logout } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "history">("pending");

  // COI Modal State
  const [coiModalOpen, setCoiModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [coiDeclaration, setCoiDeclaration] = useState<"NO_CONFLICT" | "CONFLICT_DECLARED">("NO_CONFLICT");
  const [hasFinancialInterest, setHasFinancialInterest] = useState(false);
  const [hasPastEmployment, setHasPastEmployment] = useState(false);
  const [hasPersonalRelationship, setHasPersonalRelationship] = useState(false);
  const [hasCompetitiveInterest, setHasCompetitiveInterest] = useState(false);
  const [coiDetails, setCoiDetails] = useState("");
  const [mitigationNotes, setMitigationNotes] = useState("");
  const [submittingCOI, setSubmittingCOI] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<AssignmentItem[]>("/api/v1/validator/assignments");
      setAssignments(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load validator assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleRespond = async (assignmentId: string, action: "ACCEPT" | "DECLINE") => {
    try {
      setError(null);
      await apiRequest(`/api/v1/validator/assignments/${assignmentId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setSuccessMsg(
        action === "ACCEPT"
          ? "Assignment accepted. Please declare Conflict of Interest before starting validation."
          : "Assignment declined."
      );
      await loadAssignments();
    } catch (err: any) {
      setError(err?.message || "Failed to respond to assignment.");
    }
  };

  const openCOIModal = (assignment: AssignmentItem) => {
    setSelectedAssignment(assignment);
    setCoiDeclaration("NO_CONFLICT");
    setHasFinancialInterest(false);
    setHasPastEmployment(false);
    setHasPersonalRelationship(false);
    setHasCompetitiveInterest(false);
    setCoiDetails("");
    setMitigationNotes("");
    setCoiModalOpen(true);
  };

  const submitCOI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      setSubmittingCOI(true);
      setError(null);
      await apiRequest(`/api/v1/validator/assignments/${selectedAssignment.id}/coi`, {
        method: "POST",
        body: JSON.stringify({
          declaration: coiDeclaration,
          has_financial_interest: hasFinancialInterest,
          has_past_employment: hasPastEmployment,
          has_personal_relationship: hasPersonalRelationship,
          has_competitive_interest: hasCompetitiveInterest,
          declaration_details: coiDetails || null,
          mitigation_notes: mitigationNotes || null,
        }),
      });

      setSuccessMsg(
        coiDeclaration === "NO_CONFLICT"
          ? "Clean Conflict of Interest certified. Full validation workspace unlocked."
          : "Conflict of interest declared and registered. Assignment is locked."
      );
      setCoiModalOpen(false);
      await loadAssignments();
    } catch (err: any) {
      setError(err?.message || "Failed to submit COI declaration.");
    } finally {
      setSubmittingCOI(false);
    }
  };

  const pendingItems = assignments.filter(
    (a) => a.status === "ASSIGNED" || (a.status === "ACCEPTED" && !a.coi_declared)
  );
  const activeItems = assignments.filter(
    (a) => (a.status === "ACCEPTED" || a.status === "IN_PROGRESS") && a.coi_status === "NO_CONFLICT"
  );
  const completedItems = assignments.filter(
    (a) => a.status === "COMPLETED" || a.status === "DECLINED" || a.coi_status === "CONFLICT_DECLARED"
  );

  return (
    <ProtectedRoute allowedRoles={["VALIDATOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Government Navigation Banner */}
        <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base sm:text-lg tracking-tight">
                    Independent Testing & Validation Agency Portal
                  </h1>
                  <Badge variant="gov" className="text-[10px] bg-cyan-400/20 text-cyan-200 border-cyan-400/30">
                    Step 7: Quality Assurance
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  {currentUser?.organization_name || "Accredited Testing Authority"} • Empirical Outcome Auditing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5">
                  <User className="w-3.5 h-3.5" /> Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
          {/* Feedback messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
            </div>
          )}

          {/* Welcome Card & High-Level Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">
                Independent Quality Auditor Desk
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
                Welcome, {currentUser?.full_name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Agency: <strong>{currentUser?.organization_name || "Testing Laboratory"}</strong> • GFR 2017 Outcome Certification
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <span className="text-[11px] text-blue-900 block font-semibold">Action Required</span>
                <span className="text-xl font-bold text-blue-950">{pendingItems.length}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="text-[11px] text-amber-900 block font-semibold">Active Audits</span>
                <span className="text-xl font-bold text-amber-950">{activeItems.length}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-[11px] text-emerald-900 block font-semibold">Certified</span>
                <span className="text-xl font-bold text-emerald-950">{completedItems.length}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
            {[
              { id: "pending", label: `Pending Actions (${pendingItems.length})`, icon: Clock },
              { id: "active", label: `Active Scorecards (${activeItems.length})`, icon: ClipboardCheck },
              { id: "history", label: `Completed & Archived (${completedItems.length})`, icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? "border-[#0B2545] text-[#0B2545] font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {loading ? (
            <div className="p-16 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === "pending" && (
                pendingItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No Pending Nominations</h4>
                    <p className="text-xs text-slate-500">You have no pending assignments or COI declarations awaiting action.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pendingItems.map((a) => (
                      <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] font-mono text-blue-900 font-bold block">{a.pilot_code}</span>
                            <h3 className="text-base font-bold text-slate-900">{a.pilot_title}</h3>
                            <span className="text-xs text-slate-500">
                              {a.department_name} • Deploying Startup: {a.startup_name}
                            </span>
                          </div>
                          <Badge variant="gov" className="text-xs">
                            {a.status === "ASSIGNED" ? "Nominated" : "Accepted — COI Pending"}
                          </Badge>
                        </div>

                        {a.scope && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <strong>Validation Scope:</strong> {a.scope}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="text-xs text-slate-500">
                            Assigned on: {new Date(a.assigned_at).toLocaleDateString()}
                          </div>

                          <div className="flex items-center gap-2">
                            {a.status === "ASSIGNED" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRespond(a.id, "DECLINE")}
                                  className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRespond(a.id, "ACCEPT")}
                                  className="bg-[#0B2545] text-white text-xs gap-1.5"
                                >
                                  <CheckCheck className="w-4 h-4 text-emerald-400" /> Accept Nomination
                                </Button>
                              </>
                            )}

                            {a.status === "ACCEPTED" && !a.coi_declared && (
                              <Button
                                size="sm"
                                onClick={() => openCOIModal(a)}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                              >
                                <Scale className="w-4 h-4 text-white" />
                                Declare Conflict of Interest (COI)
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === "active" && (
                activeItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
                    <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No Active Audits</h4>
                    <p className="text-xs text-slate-500">Accept a pending nomination and declare a clean COI to unlock the validation workspace.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {activeItems.map((a) => (
                      <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-blue-200 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] font-mono text-blue-900 font-bold block">{a.pilot_code}</span>
                            <h3 className="text-base font-bold text-slate-900">{a.pilot_title}</h3>
                            <span className="text-xs text-slate-500">
                              {a.department_name} • Startup: {a.startup_name}
                            </span>
                          </div>
                          <Badge variant="success" className="text-xs">
                            COI Certified Clean
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          Field evidence repository is accessible. Inspect telemetry readings, download verified dataset logs, evaluate individual KPIs, and generate the final outcome report.
                        </p>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-slate-400">
                            Status: <strong className="text-blue-900">{a.status}</strong>
                          </span>
                          <Link href={`/validator/assignments/${a.id}/workspace`}>
                            <Button size="sm" className="bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs gap-1.5 shadow-sm">
                              Enter Validation Workspace <ArrowRight className="w-4 h-4 text-amber-400" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === "history" && (
                completedItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
                    <History className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No Past Records</h4>
                    <p className="text-xs text-slate-500">Submitted validation reports and archived pilots will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {completedItems.map((a) => (
                      <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block">{a.pilot_code}</span>
                            <h3 className="text-sm font-bold text-slate-800">{a.pilot_title}</h3>
                          </div>
                          <Badge variant={a.status === "COMPLETED" ? "success" : "secondary"}>
                            {a.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-4">
                          <span>Nodal Department: {a.department_name}</span>
                          <span>COI: {a.coi_status}</span>
                        </div>

                        {a.status === "COMPLETED" && (
                          <div className="pt-2 flex justify-end">
                            <Link href={`/validator/assignments/${a.id}/workspace`}>
                              <Button variant="outline" size="sm" className="text-xs gap-1">
                                View Submitted Report
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </main>

        {/* Modal: Conflict of Interest (COI) Declaration */}
        {coiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-900" />
                  <h3 className="text-base font-bold text-slate-900">
                    Statutory Conflict of Interest (COI) Declaration
                  </h3>
                </div>
                <button onClick={() => setCoiModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitCOI} className="space-y-4">
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Under GFR 2017 and independent quality audit governance, you must certify that neither you nor your institution possess financial, personal, or competitive conflicts with the deploying startup (<strong>{selectedAssignment?.startup_name}</strong>).
                </p>

                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="font-bold text-slate-800 block text-xs">Integrity Declaration *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="coi"
                        value="NO_CONFLICT"
                        checked={coiDeclaration === "NO_CONFLICT"}
                        onChange={() => setCoiDeclaration("NO_CONFLICT")}
                        className="text-blue-900 focus:ring-blue-900"
                      />
                      <span className="font-semibold text-slate-800">
                        I declare NO CONFLICT of interest (Clean Certificate)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="coi"
                        value="CONFLICT_DECLARED"
                        checked={coiDeclaration === "CONFLICT_DECLARED"}
                        onChange={() => setCoiDeclaration("CONFLICT_DECLARED")}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-700">
                        I DECLARE A POTENTIAL CONFLICT of interest (Disclose details)
                      </span>
                    </label>
                  </div>
                </div>

                {coiDeclaration === "CONFLICT_DECLARED" && (
                  <div className="space-y-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="font-bold text-rose-900 block text-xs">Nature of Conflict</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hasFinancialInterest}
                          onChange={(e) => setHasFinancialInterest(e.target.checked)}
                        />
                        <span>Financial Interest / Equity</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hasPastEmployment}
                          onChange={(e) => setHasPastEmployment(e.target.checked)}
                        />
                        <span>Past Employment / Consulting</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hasPersonalRelationship}
                          onChange={(e) => setHasPersonalRelationship(e.target.checked)}
                        />
                        <span>Personal / Family Ties</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hasCompetitiveInterest}
                          onChange={(e) => setHasCompetitiveInterest(e.target.checked)}
                        />
                        <span>Competitive Commercial Conflict</span>
                      </label>
                    </div>

                    <div className="space-y-1 pt-2">
                      <label className="font-semibold text-slate-700 text-[11px]">Disclosure Details *</label>
                      <textarea
                        rows={2}
                        value={coiDetails}
                        onChange={(e) => setCoiDetails(e.target.value)}
                        placeholder="Detail the conflict parameters for departmental review..."
                        className="w-full rounded-lg border border-rose-300 bg-white p-2 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    Falsification of conflict disclosures is punishable under Indian Penal Code provisions regarding official public records.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCoiModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingCOI} size="sm" className="bg-[#0B2545] text-white">
                    {submittingCOI && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                    Certify & Submit Declaration
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
