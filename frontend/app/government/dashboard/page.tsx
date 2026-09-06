"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FileText,
  Users,
  FlaskConical,
  Target,
  ShieldCheck,
  Scale,
  PlusCircle,
  FolderOpen,
  LogOut,
  User,
  ArrowUpRight,
  Clock,
  Coins,
  Eye,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type GovTab =
  | "overview"
  | "challenges"
  | "applications"
  | "pilots"
  | "kpis"
  | "validations"
  | "procurement";

interface DashboardChallenge {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED" | "ARCHIVED";
  budget_min?: number;
  budget_max?: number;
  created_at: string;
  kpis?: any[];
  applications_count?: number;
}

interface GovAppRecord {
  id: string;
  application_code: string;
  challenge_title: string;
  startup_name: string;
  status: string;
  requested_budget?: number;
  submitted_at?: string;
}

function GovernmentDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<GovTab>("overview");
  const [challenges, setChallenges] = useState<DashboardChallenge[]>([]);
  const [applications, setApplications] = useState<GovAppRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [chData, appData] = await Promise.all([
          apiRequest<any>("/api/v1/challenges").catch(() => []),
          apiRequest<any>("/api/v1/government/applications").catch(() => []),
        ]);
        setChallenges(Array.isArray(chData) ? chData : (chData?.items || []));
        setApplications(Array.isArray(appData) ? appData : (appData?.items || []));
      } catch (err) {
        console.error("Failed to load department dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!currentUser) return null;

  const publishedCount = challenges.filter((c) => c.status === "PUBLISHED").length;
  const draftCount = challenges.filter((c) => c.status === "DRAFT").length;
  const applicationsCount = applications.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Ministry Banner */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  Government Nodal Officer Portal
                </h1>
                <Badge variant="gov" className="text-[10px] bg-amber-400/20 text-amber-300 border-amber-400/30">
                  Official RBAC
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {currentUser.organization_name || currentUser.department_name || "Ministry Innovation Cell"} • National Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {/* Officer Welcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              Department Innovation Desk
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Welcome, {currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span>Logged in as <strong>{currentUser.email}</strong></span>
              <span>•</span>
              <Badge variant="gov" className="text-[10px]">
                {currentUser.role}
              </Badge>
              <span>•</span>
              <span>Designation: {currentUser.designation || "Nodal Officer"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/government/challenges/create">
              <Button variant="gov" size="sm" className="text-xs gap-1.5 font-semibold">
                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                Create Challenge
              </Button>
            </Link>
            <Link href="/government/challenges">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold border-slate-300">
                <FileText className="w-3.5 h-3.5 text-blue-900" />
                Department Portfolio
              </Button>
            </Link>
            <Link href="/challenges">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-slate-600 hover:text-slate-900">
                Public Gateway <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "challenges", label: `Challenges (${challenges.length})`, icon: FileText },
            { id: "applications", label: `Applications (${applications.length})`, icon: Users },
            { id: "pilots", label: "Pilots", icon: FlaskConical },
            { id: "kpis", label: "KPIs", icon: Target },
            { id: "validations", label: "Validations", icon: ShieldCheck },
            { id: "procurement", label: "Procurement", icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as GovTab)}
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
                <h3 className="text-base font-bold text-slate-900">Government Innovation Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track departmental problem statements through the statutory GFR 2017 pilot-to-procurement lifecycle.
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Challenges</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{publishedCount}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Published & receiving proposals</span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Draft Challenges</span>
                  <div className="text-2xl font-bold text-amber-700 mt-1">{draftCount}</div>
                  <span className="text-[10px] text-slate-500">Under outcome formulation</span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Proposals Received</span>
                  <div className="text-2xl font-bold text-[#0B2545] mt-1">{applicationsCount}</div>
                  <Link href="/government/applications" className="text-[10px] text-blue-900 hover:underline font-semibold block mt-0.5">
                    View Inbox ({applicationsCount}) →
                  </Link>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Portfolio</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{challenges.length}</div>
                  <span className="text-[10px] text-slate-400">Department statements</span>
                </div>
              </div>

              {/* Department Innovation Actions banner */}
              <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-white">Define an Outcome-Based Challenge</h4>
                  <p className="text-xs text-blue-200 mt-1 max-w-xl">
                    Draft a civic problem statement with quantitative KPI benchmarks, pilot budget, and operational constraints under statutory guidelines.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/government/challenges/create">
                    <Button variant="default" size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-sm">
                      <PlusCircle className="w-3.5 h-3.5" /> Start Creation Wizard
                    </Button>
                  </Link>
                  <Link href="/government/challenges">
                    <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                      View Portfolio
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Recent Challenges Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Recent Department Challenges</h4>
                  {challenges.length > 0 && (
                    <Link href="/government/challenges" className="text-xs text-blue-900 hover:underline font-semibold flex items-center gap-1">
                      View all {challenges.length} challenges <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
                    <span className="text-xs">Loading department challenges...</span>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                    <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No Challenges Defined Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Your department has not created any innovation challenges yet. Define an outcome-based problem statement with KPI benchmarks to invite DPIIT startup solutions.
                    </p>
                    <Link href="/government/challenges/create">
                      <Button variant="gov" size="sm" className="mt-4 text-xs gap-1.5 font-semibold">
                        <PlusCircle className="w-3.5 h-3.5 text-amber-400" /> Define Problem Statement
                      </Button>
                    </Link>
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
                            <Badge
                              variant={
                                c.status === "PUBLISHED"
                                  ? "success"
                                  : c.status === "DRAFT"
                                  ? "warning"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">{c.domain}</span>
                          </div>
                          <Link href={`/government/challenges/${c.id}`} className="font-bold text-sm text-slate-900 hover:text-blue-900 line-clamp-1 block">
                            {c.title}
                          </Link>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>KPIs: <strong>{c.kpis ? c.kpis.length : 0} defined</strong></span>
                            {c.budget_max && (
                              <span>Max Budget: <strong>₹{(c.budget_max / 100000).toFixed(1)} Lakhs</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/government/challenges/${c.id}`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1">
                              <Eye className="w-3 h-3 text-slate-500" /> View Dossier
                            </Button>
                          </Link>
                          {c.status === "DRAFT" && (
                            <Link href={`/government/challenges/create?edit=${c.id}`}>
                              <Button variant="gov" size="sm" className="text-xs gap-1">
                                <Edit className="w-3 h-3 text-amber-400" /> Edit Draft
                              </Button>
                            </Link>
                          )}
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
                  <h3 className="text-base font-bold text-slate-900">Challenges & Problem Statements</h3>
                  <p className="text-xs text-slate-500">
                    Outcome-based problem statements defined with measurable KPIs, operational constraints, and sandbox budgets.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/government/challenges/create">
                    <Button variant="gov" size="sm" className="text-xs gap-1.5 font-semibold">
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      Create New Challenge
                    </Button>
                  </Link>
                  <Link href="/government/challenges">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold border-slate-300">
                      Full Portfolio View <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
                  <span className="text-xs">Loading challenges...</span>
                </div>
              ) : challenges.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No active challenges yet.</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Outcome-based challenges published by your department will appear here for applicant intake and lifecycle tracking.
                  </p>
                  <Link href="/government/challenges/create">
                    <Button variant="gov" size="sm" className="mt-4 text-xs gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" /> Create Innovation Challenge
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {challenges.map((c) => (
                      <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {c.challenge_code}
                            </span>
                            <Badge
                              variant={
                                c.status === "PUBLISHED"
                                  ? "success"
                                  : c.status === "DRAFT"
                                  ? "warning"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-600 font-medium">{c.domain}</span>
                          </div>
                          <Link href={`/government/challenges/${c.id}`} className="font-bold text-sm text-slate-900 hover:text-blue-900 line-clamp-1 block">
                            {c.title}
                          </Link>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>KPIs: <strong>{c.kpis ? c.kpis.length : 0} quantitative targets</strong></span>
                            {c.budget_max && (
                              <span>Pilot Grant: <strong>₹{(c.budget_max / 100000).toFixed(1)} Lakhs</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/government/challenges/${c.id}`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1">
                              <Eye className="w-3 h-3 text-slate-500" /> View Details
                            </Button>
                          </Link>
                          {c.status === "DRAFT" && (
                            <Link href={`/government/challenges/create?edit=${c.id}`}>
                              <Button variant="gov" size="sm" className="text-xs gap-1">
                                <Edit className="w-3 h-3 text-amber-400" /> Edit Draft
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submitted Startup Proposals</h3>
                  <p className="text-xs text-slate-500">Technical proposals submitted by recognized startups for your department.</p>
                </div>
                <Link href="/government/applications">
                  <Button variant="gov" size="sm" className="text-xs gap-1.5 font-semibold">
                    Open Full Inbox View <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                  <Users className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No startup proposals submitted yet.</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    As startups submit technical proposals against your published challenges, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {app.application_code}
                          </span>
                          <Badge variant="gov" className="text-[10px]">
                            {app.status}
                          </Badge>
                          <span className="text-xs text-slate-600 font-semibold">{app.startup_name}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{app.challenge_title}</h4>
                        {app.requested_budget && (
                          <div className="text-xs text-slate-500">
                            Requested Grant: <strong>₹{(app.requested_budget / 100000).toFixed(2)} Lakhs</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/government/applications/${app.id}`}>
                          <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                            <Eye className="w-3 h-3 text-blue-900" /> Review Dossier
                          </Button>
                        </Link>
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

          {activeTab === "kpis" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">KPI Telemetry & Milestones</h3>
              <p className="text-xs text-slate-500">Real-time outcome verification against pre-agreed benchmark thresholds.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Target className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No KPI metrics defined yet.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Outcome metrics tied to active pilot sandboxes will automatically show telemetry logs here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "validations" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Third-Party Validations</h3>
              <p className="text-xs text-slate-500">Standardisation testing (STQC/NABL) and certification reports.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No validation reports available yet.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Independent testing agencies will file audit certificates and compliance sign-offs here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "procurement" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Procurement & Scale-Up Gateway</h3>
              <p className="text-xs text-slate-500">GeM Direct Purchase sanction orders and Swiss challenge scaling.</p>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Scale className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No procurement scale-up cases yet.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Once pilots achieve 100% KPI certification, direct purchase dossiers under GFR Rule 149/194 will be generated here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GovernmentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <GovernmentDashboardContent />
    </ProtectedRoute>
  );
}
