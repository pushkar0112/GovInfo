"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Rocket,
  XCircle,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  Ban,
} from "lucide-react";

interface ChallengeRecord {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED" | "ARCHIVED";
  budget_min?: number;
  budget_max?: number;
  application_deadline?: string;
  created_at: string;
  published_at?: string;
  kpis?: any[];
  applications_count: number;
}

export default function GovernmentChallengesPage() {
  const { currentUser } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchChallenges = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ChallengeRecord[]>("/api/v1/challenges");
      setChallenges(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load department challenges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handlePublish = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiRequest(`/api/v1/challenges/${id}/publish`, { method: "POST" });
      await fetchChallenges();
    } catch (err: any) {
      alert(err.message || "Failed to publish challenge. Please ensure at least 1 KPI and all required fields are filled.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("Are you sure you want to close this challenge for new applications?")) return;
    setActionLoadingId(id);
    try {
      await apiRequest(`/api/v1/challenges/${id}/close`, { method: "POST" });
      await fetchChallenges();
    } catch (err: any) {
      alert(err.message || "Failed to close challenge.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and withdraw this challenge?")) return;
    setActionLoadingId(id);
    try {
      await apiRequest(`/api/v1/challenges/${id}/cancel`, { method: "POST" });
      await fetchChallenges();
    } catch (err: any) {
      alert(err.message || "Failed to cancel challenge.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.challenge_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.department_name && c.department_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesDomain = domainFilter === "ALL" || c.domain.toLowerCase() === domainFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDomain;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge variant="success" className="text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> PUBLISHED
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
            DRAFT
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-700">
            CLOSED
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-[10px] bg-rose-100 text-rose-800 border-rose-200">
            CANCELLED
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="gov" className="text-[10px]">
                  Official Department Portal
                </Badge>
                <span className="text-xs text-slate-500">• Challenge Portfolio</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Innovation Challenges & Problem Statements
              </h1>
              <p className="text-xs text-slate-500">
                Manage, edit drafts, attach outcome KPIs, and track public pilot calls for your department.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/government/challenges/create">
                <Button variant="gov" size="md" className="gap-2 text-xs font-semibold shadow-xs">
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                  Create Innovation Challenge
                </Button>
              </Link>
            </div>
          </div>

          {/* Search, Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Domain:</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="ALL">All Domains</option>
                  <option value="CivicTech">CivicTech</option>
                  <option value="HealthTech">HealthTech</option>
                  <option value="CleanTech">CleanTech</option>
                  <option value="AgriTech">AgriTech</option>
                  <option value="DefenceTech">DefenceTech</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Challenge List Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                <span className="text-xs text-slate-500 mt-2">Loading department challenges...</span>
              </div>
            ) : filteredChallenges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Code & Title</th>
                      <th className="py-3.5 px-4">Domain & Dept</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Grant Budget</th>
                      <th className="py-3.5 px-4">Deadline</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChallenges.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {c.challenge_code}
                            </span>
                            {c.kpis && c.kpis.length > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-slate-500">
                                {c.kpis.length} KPIs
                              </Badge>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 mt-1 line-clamp-1">{c.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Created: {new Date(c.created_at).toLocaleDateString()}
                            {c.published_at && ` • Published: ${new Date(c.published_at).toLocaleDateString()}`}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="text-[10px]">
                            {c.domain}
                          </Badge>
                          <div className="text-[11px] text-slate-600 mt-1 truncate max-w-[180px]">
                            {c.department_name || "Department"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900">
                            {c.budget_max
                              ? `₹${(c.budget_max / 100000).toFixed(1)} Lakhs`
                              : "Unspecified"}
                          </span>
                          {c.budget_min && c.budget_max && (
                            <div className="text-[10px] text-slate-400">
                              ₹{(c.budget_min / 100000).toFixed(1)}L – ₹{(c.budget_max / 100000).toFixed(1)}L
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {c.application_deadline ? (
                            <span className="text-slate-700">
                              {new Date(c.application_deadline).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">Open</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/government/challenges/${c.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-7 px-2.5 gap-1 text-slate-700"
                              >
                                <Eye className="w-3 h-3" /> View
                              </Button>
                            </Link>

                            {c.status === "DRAFT" && (
                              <Button
                                variant="gov"
                                size="sm"
                                onClick={() => handlePublish(c.id)}
                                disabled={actionLoadingId === c.id}
                                className="text-[11px] h-7 px-2.5 gap-1 font-semibold"
                              >
                                <Rocket className="w-3 h-3 text-amber-400" /> Publish
                              </Button>
                            )}

                            {c.status === "PUBLISHED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClose(c.id)}
                                disabled={actionLoadingId === c.id}
                                className="text-[11px] h-7 px-2.5 gap-1 text-slate-600 hover:bg-slate-100"
                              >
                                <XCircle className="w-3 h-3 text-slate-500" /> Close
                              </Button>
                            )}

                            {c.status !== "CANCELLED" && c.status !== "CLOSED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(c.id)}
                                disabled={actionLoadingId === c.id}
                                className="text-[11px] h-7 px-2 text-rose-600 hover:bg-rose-50"
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No active challenges found.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Your department has not posted any innovation challenges matching these filters.
                </p>
                <Link href="/government/challenges/create">
                  <Button variant="gov" size="sm" className="mt-4 text-xs gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5" /> Define First Challenge
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
