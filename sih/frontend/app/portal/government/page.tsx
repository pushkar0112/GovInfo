"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FilePlus,
  CheckCircle2,
  Clock,
  FlaskConical,
  ShieldCheck,
  TrendingUp,
  LogOut,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoredAuth, clearStoredAuth, apiRequest } from "@/lib/auth";

export default function GovernmentPortalPage() {
  const router = useRouter();
  const [auth, setAuth] = useState(getStoredAuth());
  const [overview, setOverview] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Challenge Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newOutcome, setNewOutcome] = useState("");
  const [newSector, setNewSector] = useState("CivicTech");
  const [newBudget, setNewBudget] = useState("2000000");
  const [newDuration, setNewDuration] = useState("3.0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    const currentAuth = getStoredAuth();
    setAuth(currentAuth);

    async function loadData() {
      try {
        const ov = await apiRequest<any>("/api/v1/portal/government-overview");
        setOverview(ov);
      } catch {
        setOverview({
          portal: "Government Portal",
          user_name: currentAuth.user?.full_name || "Nodal Officer",
          department: currentAuth.user?.department_name || "Ministry of Electronics & IT",
          role: "GOVERNMENT",
          metrics: {
            active_challenges: 3,
            proposals_under_review: 12,
            active_pilots: 2,
            completed_validations: 1,
          },
        });
      }

      try {
        const chList = await apiRequest<any[]>("/api/v1/challenges");
        if (chList && chList.length > 0) {
          setChallenges(chList);
        } else {
          setChallenges([
            {
              id: "CH-001",
              title: "AI-Assisted Rural Triage & Diagnostic Telemetry",
              outcome_definition: "Reduce patient wait time by 60% and improve triage diagnostic accuracy in remote primary healthcare centres.",
              budget_estimate: 1500000,
              status: "PUBLISHED",
              applications_count: 8,
            },
            {
              id: "CH-002",
              title: "Low-Cost Non-Revenue Water Leakage Detection via IoT",
              outcome_definition: "Pinpoint acoustic pipeline leaks within 5-meter resolution without road trenching in municipal networks.",
              budget_estimate: 2500000,
              status: "PUBLISHED",
              applications_count: 5,
            },
          ]);
        }
      } catch {
        // keep fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPostError(null);

    try {
      const created = await apiRequest<any>("/api/v1/challenges", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          problem_statement: newProblem,
          outcome_definition: newOutcome,
          target_sector: newSector,
          budget_estimate: parseFloat(newBudget) || 1000000,
          pilot_duration_months: parseFloat(newDuration) || 3.0,
        }),
      });

      setChallenges([created, ...challenges]);
      setCreateModalOpen(false);
      // Reset form
      setNewTitle("");
      setNewProblem("");
      setNewOutcome("");
    } catch (err: any) {
      setPostError(err.message || "Failed to publish challenge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    clearStoredAuth();
    router.push("/");
  };

  const user = auth.user;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Government Portal Bar */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">
                  Government Nodal Officer Portal
                </h1>
                <Badge variant="secondary" className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">
                  Official Access
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {overview?.department || user?.department_name || "Department of Public Administration"} • Central Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Public Gateway
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Officer Welcome Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Department Innovation Desk
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Welcome, {overview?.user_name || user?.full_name || "Nodal Officer"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Logged in as <span className="font-semibold text-slate-800">{user?.email || "officer@gov.in"}</span> • Role: <Badge variant="gov" className="ml-1 text-[10px]">GOVERNMENT</Badge>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="gov"
              size="md"
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 text-xs font-semibold cursor-pointer"
            >
              <FilePlus className="w-4 h-4 text-amber-400" />
              Post New Challenge
            </Button>
            <Link href="/challenges">
              <Button variant="outline" size="md" className="text-xs">
                View Public Catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Stat Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Published Challenges</span>
              <Building2 className="w-4 h-4 text-blue-900" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {challenges.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active problem statements
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Received Proposals</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.proposals_under_review ?? 13}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Startup solutions awaiting evaluation
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Pilots</span>
              <FlaskConical className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.active_pilots ?? 2}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Controlled field sandboxes deployed
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">GeM Scale Ready</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {overview?.metrics?.completed_validations ?? 1}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              3rd-party verified proof of concept
            </p>
          </div>
        </div>

        {/* Active Department Challenges */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Department Challenges & Outcome Statements
              </h3>
              <p className="text-xs text-slate-500">
                Open challenges driving innovation procurement for this department
              </p>
            </div>
            <Button
              variant="gov"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <FilePlus className="w-3.5 h-3.5" />
              New Problem Statement
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {challenges.map((c) => (
              <div
                key={c.id}
                className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">{c.id.slice(0, 8)}</span>
                    <Badge variant="success" className="text-[10px]">Open for Submissions</Badge>
                    <span className="text-xs text-slate-400">• {c.applications_count || 0} Proposals Received</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {c.outcome_definition}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-slate-500 block">Pilot Grant</span>
                    <span className="font-bold text-slate-900">
                      ₹{c.budget_estimate?.toLocaleString("en-IN") || "15,00,000"}
                    </span>
                  </div>
                  <Link href={`/challenges/${c.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Inspect Proposals <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Post Challenge Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0B2545] text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Publish New Outcome-Based Challenge</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Define an operational public problem and quantifiable target outcomes.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-md text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="p-6 overflow-y-auto space-y-4">
              {postError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{postError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Challenge Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Automated IoT Groundwater Level Telemetry and Contamination Warning"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Problem Statement (Unmet Civic / Operational Pain Point)
                </label>
                <textarea
                  required
                  rows={3}
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  placeholder="Describe the operational bottleneck without specifying technology brand names..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Outcome Definition & Measurable KPIs Required
                </label>
                <textarea
                  required
                  rows={3}
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="e.g., Achieve 99% telemetry reliability and detect arsenic contamination within 15 minutes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Sector
                  </label>
                  <select
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none bg-white"
                  >
                    <option value="CivicTech">CivicTech</option>
                    <option value="HealthTech">HealthTech</option>
                    <option value="AgriTech">AgriTech</option>
                    <option value="CleanTech">CleanTech</option>
                    <option value="DefenceTech">DefenceTech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pilot Budget (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pilot Duration (Months)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gov"
                  size="md"
                  disabled={isSubmitting}
                  className="text-xs gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publish Challenge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
