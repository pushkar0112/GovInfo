"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  UserPlus,
  Check,
  X,
  Clock,
  Layers,
  Sparkles,
  Trophy,
  Sliders,
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface CriterionItem {
  id: string;
  name: string;
  title?: string;
  description?: string;
  weight: number;
  max_score: number;
  min_score: number;
  mandatory: boolean;
  is_mandatory?: boolean;
  display_order: number;
}

interface RankingItem {
  rank: number;
  application_id: string;
  application_code: string;
  startup_id: string;
  startup_name: string;
  dpiit_number?: string;
  proposal_title: string;
  status: string;
  submitted_at?: string;
  average_score?: number | null;
  highest_score?: number | null;
  lowest_score?: number | null;
  evaluations_completed: number;
  evaluations_count?: number;
  evaluations_assigned: number;
}

interface ExpertDirectoryItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  organization?: string;
  designation?: string;
  expertise_domains: string[];
  years_of_experience?: number;
  availability_status: string;
}

interface ChallengeBasic {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  status: string;
}

export default function GovernmentChallengeEvaluationsPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const { currentUser } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeBasic | null>(null);
  const [criteria, setCriteria] = useState<CriterionItem[]>([]);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [experts, setExperts] = useState<ExpertDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"ranking" | "criteria">("ranking");

  // Add/Edit Criterion Modal State
  const [showCriterionModal, setShowCriterionModal] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<CriterionItem | null>(null);
  const [critName, setCritName] = useState("");
  const [critDesc, setCritDesc] = useState("");
  const [critWeight, setCritWeight] = useState(25.0);
  const [critMax, setCritMax] = useState(10.0);
  const [critMandatory, setCritMandatory] = useState(true);
  const [savingCriterion, setSavingCriterion] = useState(false);

  // Assign Expert Modal State
  const [assignModalApp, setAssignModalApp] = useState<RankingItem | null>(null);
  const [selectedExpertId, setSelectedExpertId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [expertSearch, setExpertSearch] = useState("");

  // Decision Modal State
  const [decisionModalApp, setDecisionModalApp] = useState<RankingItem | null>(null);
  const [decisionType, setDecisionType] = useState<"SHORTLISTED" | "REJECTED">("SHORTLISTED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [recordingDecision, setRecordingDecision] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [chRes, critRes, rankRes, expRes] = await Promise.all([
        apiRequest<ChallengeBasic>(`/api/v1/challenges/${challengeId}`),
        apiRequest<{ items: CriterionItem[]; total_weight: number; is_valid: boolean }>(
          `/api/v1/challenges/${challengeId}/evaluation-criteria`
        ).catch(() => ({ items: [], total_weight: 0, is_valid: false })),
        apiRequest<any>(`/api/v1/challenges/${challengeId}/evaluations/rankings`).catch(() => []),
        apiRequest<ExpertDirectoryItem[]>("/api/v1/government/experts").catch(() => []),
      ]);

      setChallenge(chRes);
      setCriteria(critRes.items || []);
      setRankings(Array.isArray(rankRes) ? rankRes : (rankRes.ranking || []));
      setExperts(expRes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load evaluation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [challengeId]);

  const totalCriteriaWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
  const isWeightsValid = Math.abs(totalCriteriaWeight - 100.0) < 0.01;

  const handleOpenAddCriterion = () => {
    setEditingCriterion(null);
    setCritName("");
    setCritDesc("");
    setCritWeight(25.0);
    setCritMax(10.0);
    setCritMandatory(true);
    setShowCriterionModal(true);
  };

  const handleOpenEditCriterion = (c: CriterionItem) => {
    setEditingCriterion(c);
    setCritName(c.name || c.title || "");
    setCritDesc(c.description || "");
    setCritWeight(c.weight);
    setCritMax(c.max_score);
    setCritMandatory(c.mandatory || c.is_mandatory || true);
    setShowCriterionModal(true);
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCriterion(true);
    try {
      if (editingCriterion) {
        await apiRequest(`/api/v1/evaluation-criteria/${editingCriterion.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: critName,
            description: critDesc,
            weight: Number(critWeight),
            max_score: Number(critMax),
            mandatory: critMandatory,
          }),
        });
      } else {
        await apiRequest(`/api/v1/challenges/${challengeId}/criteria`, {
          method: "POST",
          body: JSON.stringify({
            name: critName,
            description: critDesc,
            weight: Number(critWeight),
            max_score: Number(critMax),
            min_score: 0.0,
            mandatory: critMandatory,
          }),
        });
      }
      setShowCriterionModal(false);
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || "Failed to save evaluation criterion.");
    } finally {
      setSavingCriterion(false);
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this criterion?")) return;
    try {
      await apiRequest(`/api/v1/evaluation-criteria/${id}`, { method: "DELETE" });
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || "Failed to delete criterion.");
    }
  };

  const handleAssignExpert = async () => {
    if (!assignModalApp || !selectedExpertId) return;
    setAssigning(true);
    try {
      await apiRequest(
        `/api/v1/challenges/${challengeId}/applications/${assignModalApp.application_id}/assign-expert`,
        {
          method: "POST",
          body: JSON.stringify({
            expert_id: selectedExpertId,
            notes: assignNotes,
          }),
        }
      );
      setAssignModalApp(null);
      setSelectedExpertId("");
      setAssignNotes("");
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || "Failed to assign expert.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRecordDecision = async () => {
    if (!decisionModalApp) return;
    setRecordingDecision(true);
    try {
      await apiRequest(
        `/api/v1/challenges/${challengeId}/applications/${decisionModalApp.application_id}/decision`,
        {
          method: "POST",
          body: JSON.stringify({
            decision: decisionType,
            notes: decisionNotes,
          }),
        }
      );
      setDecisionModalApp(null);
      setDecisionNotes("");
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || "Failed to record decision.");
    } finally {
      setRecordingDecision(false);
    }
  };

  const filteredExperts = experts.filter((exp) => {
    const q = expertSearch.toLowerCase();
    return (
      exp.full_name.toLowerCase().includes(q) ||
      (exp.organization && exp.organization.toLowerCase().includes(q)) ||
      exp.expertise_domains.some((d) => d.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0B2545] animate-spin" />
          <p className="text-xs text-slate-600 font-medium">Loading evaluation matrix and rankings...</p>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Evaluation Matrix Unavailable</h2>
          <p className="text-xs text-slate-600">{error || "Could not retrieve challenge evaluation data."}</p>
          <Link href="/government/dashboard">
            <Button variant="gov" size="sm" className="w-full text-xs">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Header */}
        <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={`/government/challenges/${challengeId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 p-2 h-9 w-9"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
                    {challenge.challenge_code}
                  </span>
                  <Badge variant="gov" className="text-[10px]">
                    {challenge.domain}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {challenge.status}
                  </Badge>
                </div>
                <h1 className="font-bold text-base sm:text-lg tracking-tight mt-0.5 truncate max-w-2xl">
                  {challenge.title} — Expert Evaluation & Transparent Scoring
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/government/challenges/${challengeId}`}>
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                  View Specifications
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Criteria Weights Validation</span>
                <Sliders className="w-4 h-4 text-blue-900" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-2xl font-black ${isWeightsValid ? "text-emerald-700" : "text-rose-600"}`}>
                  {totalCriteriaWeight.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 100.0%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isWeightsValid ? "✓ Standard 100% total weight fulfilled" : "⚠ Must sum to exactly 100%"}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Evaluated Applications</span>
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {rankings.filter((r) => r.evaluations_completed > 0).length} / {rankings.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Ranked proposals receiving scores</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Available Technical Experts</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {experts.filter((e) => e.availability_status === "AVAILABLE").length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Empaneled specialists ready for assignment</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("ranking")}
              className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "ranking"
                  ? "border-[#0B2545] text-[#0B2545] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Ranked Leaderboard & Scoring Matrix ({rankings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("criteria")}
              className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "criteria"
                  ? "border-[#0B2545] text-[#0B2545] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="w-4 h-4 text-blue-900" />
              <span>Evaluation Criteria Weights ({criteria.length})</span>
            </button>
          </div>

          {/* TAB 1: RANKED LEADERBOARD */}
          {activeTab === "ranking" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Evaluated Startup Leaderboard
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deterministic ranking sorted by multi-expert average composite score. Sponsoring officers can shortlist or reject.
                    </p>
                  </div>
                </div>

                {rankings.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <Award className="w-12 h-12 text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No applications received yet.</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      As startups submit proposals and experts evaluate them, ranked scores will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <th className="py-3 px-4 w-12 text-center">Rank</th>
                          <th className="py-3 px-4">Applicant Startup & Code</th>
                          <th className="py-3 px-4">Proposal Title</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Experts</th>
                          <th className="py-3 px-4 text-right">Average Score</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rankings.map((item) => {
                          const isTop = item.rank === 1 && item.average_score !== null;
                          return (
                            <tr
                              key={item.application_id}
                              className={`hover:bg-slate-50/60 transition-colors ${
                                isTop ? "bg-amber-50/30 font-medium" : ""
                              }`}
                            >
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center">
                                  {isTop ? (
                                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                                      <Trophy className="w-4 h-4 text-amber-600" />
                                    </div>
                                  ) : (
                                    <span className="font-mono text-xs font-bold text-slate-600">
                                      #{item.rank}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-bold text-slate-900">{item.startup_name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                    {item.application_code}
                                  </span>
                                  {item.dpiit_number && (
                                    <Badge variant="gov" className="text-[9px] px-1 py-0">
                                      {item.dpiit_number}
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-4 max-w-xs truncate text-slate-700">
                                {item.proposal_title}
                              </td>

                              <td className="py-4 px-4">
                                <Badge
                                  variant={
                                    item.status === "SHORTLISTED"
                                      ? "success"
                                      : item.status === "REJECTED"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  className="text-[10px]"
                                >
                                  {item.status}
                                </Badge>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className="font-medium text-slate-700">
                                  {item.evaluations_completed} / {item.evaluations_assigned}
                                </span>
                                <span className="text-[10px] text-slate-400 block">reviews</span>
                              </td>

                              <td className="py-4 px-4 text-right">
                                {item.average_score !== null && item.average_score !== undefined ? (
                                  <div>
                                    <span className="text-base font-black text-[#0B2545]">
                                      {item.average_score.toFixed(1)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal"> / 100</span>
                                    {typeof item.lowest_score === "number" && typeof item.highest_score === "number" && (
                                      <span className="text-[10px] text-slate-400 block">
                                        Range: {item.lowest_score.toFixed(0)} – {item.highest_score.toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Pending scores</span>
                                )}
                              </td>

                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAssignModalApp(item);
                                      setSelectedExpertId("");
                                      setAssignNotes("");
                                    }}
                                    className="text-xs h-7 px-2 font-medium gap-1 text-blue-900 border-blue-200 hover:bg-blue-50"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Assign
                                  </Button>

                                  {item.status !== "SHORTLISTED" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setDecisionModalApp(item);
                                        setDecisionType("SHORTLISTED");
                                        setDecisionNotes("");
                                      }}
                                      className="text-xs h-7 px-2 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    >
                                      Shortlist
                                    </Button>
                                  )}

                                  {item.status !== "REJECTED" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setDecisionModalApp(item);
                                        setDecisionType("REJECTED");
                                        setDecisionNotes("");
                                      }}
                                      className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50"
                                    >
                                      Reject
                                    </Button>
                                  )}

                                  <Link href={`/government/applications/${item.application_id}`}>
                                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                                      View
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CRITERIA WEIGHTS CONFIGURATION */}
          {activeTab === "criteria" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Multi-Criteria Evaluation Matrix
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure evaluation dimensions. Total weights across all criteria must sum to 100%.
                    </p>
                  </div>

                  <Button
                    variant="gov"
                    size="sm"
                    onClick={handleOpenAddCriterion}
                    className="text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Evaluation Criterion
                  </Button>
                </div>

                {/* Weights Alert Banner */}
                {!isWeightsValid && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Current criteria weights total <strong>{totalCriteriaWeight.toFixed(1)}%</strong>. Please adjust so the sum equals exactly 100.0%.
                      </span>
                    </div>
                  </div>
                )}

                {criteria.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center border border-dashed border-slate-200 rounded-xl">
                    <Sliders className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No criteria defined yet.</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Click &ldquo;Add Evaluation Criterion&rdquo; to establish the scoring dimensions for this challenge.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {criteria.map((c, i) => (
                      <div key={c.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {i + 1}. {c.name || c.title}
                            </span>
                            <Badge variant="gov" className="text-[10px]">
                              Weight: {c.weight}%
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Max Score: {c.max_score}
                            </Badge>
                            {(c.mandatory || c.is_mandatory) && (
                              <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-slate-500 max-w-2xl">{c.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditCriterion(c)}
                            className="p-1.5 h-8 w-8 text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCriterion(c.id)}
                            className="p-1.5 h-8 w-8 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Add / Edit Criterion Modal */}
        {showCriterionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingCriterion ? "Edit Evaluation Criterion" : "Add Evaluation Criterion"}
                </h3>
                <button
                  onClick={() => setShowCriterionModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCriterion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Criterion Title / Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={critName}
                    onChange={(e) => setCritName(e.target.value)}
                    placeholder="e.g. Technical Feasibility & Innovation Rigor"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guidance Description for Evaluators:
                  </label>
                  <textarea
                    rows={2}
                    value={critDesc}
                    onChange={(e) => setCritDesc(e.target.value)}
                    placeholder="Explain what specific metrics or evidence experts should evaluate..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Percentage Weight (%):
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      step={0.5}
                      value={critWeight}
                      onChange={(e) => setCritWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Score:
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={critMax}
                      onChange={(e) => setCritMax(parseFloat(e.target.value) || 10)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={critMandatory}
                    onChange={(e) => setCritMandatory(e.target.checked)}
                    className="rounded text-[#0B2545] focus:ring-[#0B2545]"
                  />
                  <span>Mandatory criterion (cannot be skipped by experts)</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCriterionModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gov"
                    size="sm"
                    disabled={savingCriterion}
                    className="text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                  >
                    {savingCriterion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Criterion
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Expert Dialog */}
        {assignModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0B2545]">
                  <UserPlus className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Expert Evaluator
                  </h3>
                </div>
                <button
                  onClick={() => setAssignModalApp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposal:</span>
                  <strong className="text-slate-800">{assignModalApp.proposal_title}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <strong className="text-slate-800">{assignModalApp.startup_name}</strong>
                </div>
              </div>

              {/* Search Expert */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Empaneled Technical Specialist:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by expert name, institution, or domain..."
                    value={expertSearch}
                    onChange={(e) => setExpertSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                  {filteredExperts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching experts found in directory.
                    </div>
                  ) : (
                    filteredExperts.map((exp) => (
                      <label
                        key={exp.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          selectedExpertId === exp.user_id
                            ? "border-[#0B2545] bg-blue-50/50"
                            : "border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="expert"
                          checked={selectedExpertId === exp.user_id}
                          onChange={() => setSelectedExpertId(exp.user_id)}
                          className="mt-0.5 text-[#0B2545] focus:ring-[#0B2545]"
                        />
                        <div className="text-xs space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{exp.full_name}</strong>
                            <Badge variant={exp.availability_status === "AVAILABLE" ? "success" : "outline"} className="text-[9px]">
                              {exp.availability_status}
                            </Badge>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            {exp.designation || "Specialist"} • {exp.organization || "Empaneled Panel"}
                          </p>
                          {exp.expertise_domains.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {exp.expertise_domains.slice(0, 3).map((d, i) => (
                                <span key={i} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Instructions / Focus Notes:
                </label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please scrutinize IoT battery life and edge model latency..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignModalApp(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="gov"
                  size="sm"
                  disabled={!selectedExpertId || assigning}
                  onClick={handleAssignExpert}
                  className="text-xs font-bold gap-1.5 bg-[#0B2545] hover:bg-[#133A6B]"
                >
                  {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Assignment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Decision Modal (Shortlist / Reject) */}
        {decisionModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {decisionType === "SHORTLISTED" ? "Shortlist for Pilot Sandbox" : "Reject Application"}
                </h3>
                <button
                  onClick={() => setDecisionModalApp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are recording an official procurement status decision for proposal{" "}
                <strong>{decisionModalApp.proposal_title}</strong> ({decisionModalApp.startup_name}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Decision Remarks / Committee Rationale:
                </label>
                <textarea
                  rows={3}
                  required
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Provide justifying technical remarks or committee approval notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0B2545]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDecisionModalApp(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant={decisionType === "SHORTLISTED" ? "gov" : "outline"}
                  size="sm"
                  disabled={recordingDecision}
                  onClick={handleRecordDecision}
                  className={`text-xs font-bold gap-1.5 ${
                    decisionType === "SHORTLISTED"
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "border-rose-200 text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  {recordingDecision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm {decisionType === "SHORTLISTED" ? "Shortlist" : "Rejection"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
