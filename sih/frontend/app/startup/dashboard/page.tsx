"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Compass,
  FileText,
  FlaskConical,
  Milestone,
  CreditCard,
  LogOut,
  User,
  ArrowUpRight,
  FolderOpen,
  CheckCircle2,
  Loader2,
  Building2,
  Target,
  Eye,
  ShieldCheck,
  AlertCircle,
  Coins,
  Clock,
  Edit,
} from "lucide-react";

type StartupTab =
  | "overview"
  | "challenges"
  | "applications"
  | "pilots"
  | "milestones"
  | "payments";

interface StartupChallengeRecord {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  budget_min?: number;
  budget_max?: number;
  application_deadline?: string;
  kpis?: any[];
  published_at?: string;
}

interface StartupApplicationRecord {
  id: string;
  application_code: string;
  challenge_id: string;
  challenge_title: string;
  department_name?: string;
  proposal_title: string;
  status: string;
  requested_budget?: number;
  timeline_days?: number;
  submitted_at?: string;
  created_at: string;
}

interface StartupProfileRecord {
  startup_name: string;
  dpiit_recognition_number?: string;
  recognition_status: string;
  product_stage: string;
  completeness_percentage: number;
}

function StartupDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<StartupTab>("overview");
  const [challenges, setChallenges] = useState<StartupChallengeRecord[]>([]);
  const [applications, setApplications] = useState<StartupApplicationRecord[]>([]);
  const [profile, setProfile] = useState<StartupProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [chData, appData, profData] = await Promise.all([
          apiRequest<any>("/api/v1/challenges").catch(() => []),
          apiRequest<any>("/api/v1/applications").catch(() => []),
          apiRequest<StartupProfileRecord>("/api/v1/startups/profile").catch(() => null),
        ]);
        setChallenges(Array.isArray(chData) ? chData : (chData?.items || []));
        setApplications(Array.isArray(appData) ? appData : (appData?.items || []));
        setProfile(profData);
      } catch (err) {
        console.error("Failed to load startup dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (!currentUser) return null;

  const completeness = profile?.completeness_percentage || 0;
  const submittedCount = applications.filter((a) => a.status !== "DRAFT").length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
            Draft
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Submitted
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Under Review
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Shortlisted
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  Startup Innovator Portal
                </h1>
                {profile?.recognition_status === "VERIFIED" ? (
                  <Badge variant="success" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> DPIIT Recognized
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] gap-1">
                    <Clock className="w-3 h-3" /> Verification Pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {profile?.startup_name || currentUser.organization_name || currentUser.company_name || "InnovateTech AI"} • Stage: {profile?.product_stage || "MVP"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/startup/profile">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Profile ({completeness}%)
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
        {/* Startup Welcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              Startup Command Center
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Welcome, {currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span>Organization: <strong>{profile?.startup_name || currentUser.company_name || "Startup Entity"}</strong></span>
              <span>•</span>
              <Badge variant="gov" className="text-[10px]">
                {currentUser.role}
              </Badge>
              <span>•</span>
              <span>DPIIT Status: <strong>{profile?.recognition_status || "PENDING"}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/startup/challenges">
              <Button variant="gov" size="sm" className="text-xs gap-1.5 font-semibold">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Discover Challenges
              </Button>
            </Link>
            <Link href="/startup/applications">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold border-slate-300">
                <FileText className="w-3.5 h-3.5 text-blue-900" />
                My Proposals ({applications.length})
              </Button>
            </Link>
            <Link href="/startup/profile">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold border-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Edit Credentials
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "challenges", label: `Open Challenges (${challenges.length})`, icon: Compass },
            { id: "applications", label: `Applications (${applications.length})`, icon: FileText },
            { id: "pilots", label: "Active Sandboxes", icon: FlaskConical },
            { id: "milestones", label: "Milestones", icon: Milestone },
            { id: "payments", label: "Grants & Payments", icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StartupTab)}
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

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-bold text-slate-900">Startup Innovation Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your government pilot discovery, application pipeline, and sandbox milestones.
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Available Challenges</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{challenges.length}</div>
                  <span className="text-[10px] text-blue-600 font-medium">Ready for application intake</span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Proposals Submitted</span>
                  <div className="text-2xl font-bold text-[#0B2545] mt-1">{submittedCount}</div>
                  <span className="text-[10px] text-slate-500">Under departmental review</span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Shortlisted for Pilot</span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{shortlistedCount}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Pilot sandbox qualification</span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Profile Strength</span>
                    <span className="text-xs font-bold text-[#0B2545]">{completeness}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        completeness >= 80 ? "bg-emerald-500" : completeness >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <Link href="/startup/profile" className="text-[10px] text-blue-900 hover:underline font-semibold mt-2 block">
                    Update profile to qualify →
                  </Link>
                </div>
              </div>

              {/* Discover banner */}
              <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-white">Explore Government Innovation Challenges</h4>
                  <p className="text-xs text-blue-200 mt-1 max-w-xl">
                    Central ministries and municipal bodies have published outcome-based challenges with funded sandbox pilot budgets and guaranteed scale-up pathways.
                  </p>
                </div>
                <Link href="/startup/challenges">
                  <Button variant="default" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-sm whitespace-nowrap">
                    <Compass className="w-3.5 h-3.5" /> View Challenge Catalog
                  </Button>
                </Link>
              </div>

              {/* Open Challenges Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Featured Government Problem Statements</h4>
                  {challenges.length > 0 && (
                    <Link href="/startup/challenges" className="text-xs text-blue-900 hover:underline font-semibold flex items-center gap-1">
                      View all {challenges.length} challenges <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
                    <span className="text-xs">Loading open challenges...</span>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                    <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No Open Challenges Available</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Department innovation challenges will appear here as soon as they are published by government nodal officers.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {challenges.slice(0, 5).map((c) => (
                      <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {c.challenge_code}
                            </span>
                            <Badge variant="gov" className="text-[10px]">
                              {c.domain}
                            </Badge>
                            {c.department_name && (
                              <span className="text-xs text-slate-500">• {c.department_name}</span>
                            )}
                          </div>
                          <Link href={`/startup/challenges/${c.id}`} className="font-bold text-sm text-slate-900 hover:text-blue-900 line-clamp-1 block">
                            {c.title}
                          </Link>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>KPI Targets: <strong>{c.kpis ? c.kpis.length : 0} metrics</strong></span>
                            {c.budget_max && (
                              <span>Pilot Budget: <strong>₹{(c.budget_max / 100000).toFixed(1)} Lakhs</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/startup/challenges/${c.id}`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1 font-medium">
                              <Eye className="w-3 h-3 text-slate-500" /> View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "challenges" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Discover Department Challenges</h3>
                  <p className="text-xs text-slate-500">
                    Explore published problem statements seeking innovative technology solutions.
                  </p>
                </div>
                <Link href="/startup/challenges">
                  <Button variant="gov" size="sm" className="text-xs gap-1 font-semibold">
                    Full Catalog View <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
                  <span className="text-xs">Loading challenges...</span>
                </div>
              ) : challenges.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                  <Compass className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No open challenges at this moment.</h4>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {challenges.map((c) => (
                    <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {c.challenge_code}
                          </span>
                          <Badge variant="gov" className="text-[10px]">
                            {c.domain}
                          </Badge>
                        </div>
                        <Link href={`/startup/challenges/${c.id}`} className="font-bold text-sm text-slate-900 hover:text-blue-900 line-clamp-1 block">
                          {c.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/startup/challenges/${c.id}`}>
                          <Button variant="outline" size="sm" className="text-xs font-medium">
                            Details
                          </Button>
                        </Link>
                        <Link href={`/startup/challenges/${c.id}/apply`}>
                          <Button variant="gov" size="sm" className="text-xs font-bold">
                            Apply
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Challenge Applications</h3>
                  <p className="text-xs text-slate-500">
                    Track the lifecycle of your submitted technical proposals and sandbox grants.
                  </p>
                </div>
                <Link href="/startup/applications">
                  <Button variant="gov" size="sm" className="text-xs gap-1 font-semibold">
                    Full Applications Tracker <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mb-2" />
                  <span className="text-xs">Loading applications...</span>
                </div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No applications submitted yet.</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Discover published challenges and submit technical proposals for pilot grants.
                  </p>
                  <Link href="/startup/challenges">
                    <Button variant="gov" size="sm" className="mt-4 text-xs">
                      Discover Challenges
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {app.application_code || "DRAFT"}
                          </span>
                          {getStatusBadge(app.status)}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{app.proposal_title || "Untitled Proposal"}</h4>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Challenge: <strong>{app.challenge_title}</strong></span>
                          {app.requested_budget && (
                            <span>• Grant: <strong>₹{(app.requested_budget / 100000).toFixed(2)}L</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {app.status === "DRAFT" ? (
                          <Link href={`/startup/challenges/${app.challenge_id}/apply`}>
                            <Button variant="gov" size="sm" className="text-xs font-bold">
                              Continue Draft
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/startup/applications/${app.id}`}>
                            <Button variant="outline" size="sm" className="text-xs font-semibold">
                              Track Status
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "pilots" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Field Sandbox Pilots</h3>
              <p className="text-xs text-slate-500">Track controlled departmental sandbox trials, tranches, and delivery timelines.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <FlaskConical className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No active sandbox pilots yet.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Approved pilot sandbox projects with staged tranche disbursements will be monitored here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "milestones" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Sandbox Milestones & Telemetry</h3>
              <p className="text-xs text-slate-500">Submit empirical proof of target metric achievement.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Milestone className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No milestone schedules active.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Milestone schedules unlock once a challenge proposal receives departmental sanction order.
                </p>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">PFMS Milestone Grants & Invoicing</h3>
              <p className="text-xs text-slate-500">Escrow-backed pilot funding and procurement sanctions.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <CreditCard className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No pending disbursements.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Direct benefit grants disbursed through the Public Financial Management System (PFMS) will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StartupDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <StartupDashboardContent />
    </ProtectedRoute>
  );
}
