"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";
import {
  ShieldCheck,
  Search,
  Building2,
  Award,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Star,
  Loader2,
} from "lucide-react";

interface ValidatorProfile {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  organization: string;
  domain_expertise?: string;
  qualifications?: string;
  accreditations?: string;
  years_of_experience: number;
  validation_count: number;
  rating?: number;
  availability: string;
  contact_phone?: string;
  is_verified: boolean;
  created_at: string;
}

export default function ValidatorDirectoryPage() {
  const [validators, setValidators] = useState<ValidatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [availFilter, setAvailFilter] = useState("ALL");

  useEffect(() => {
    async function loadValidators() {
      try {
        setLoading(true);
        const res = await apiRequest<ValidatorProfile[]>("/api/v1/government/validators");
        setValidators(res);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadValidators();
  }, []);

  const filtered = validators.filter((v) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      v.organization?.toLowerCase().includes(term) ||
      v.user_name?.toLowerCase().includes(term) ||
      v.domain_expertise?.toLowerCase().includes(term) ||
      v.accreditations?.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (availFilter === "ALL") return true;
    return v.availability === availFilter;
  });

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/government/validation" className="hover:text-slate-800">
                Validation Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800">Accredited Validator Directory</span>
            </div>

            <Link href="/government/validation">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gov" className="text-[10px] bg-cyan-100 text-cyan-900">
                Independent Quality Assurance
              </Badge>
              <span className="text-xs text-slate-500 font-medium">GFR 2017 Testing Agencies</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Accredited Independent Validator Directory
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Empanelled third-party research institutions, NABL accredited laboratories, and statutory testing centers authorized to conduct empirical audits on public innovation sandboxes.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agency, auditor, accreditation (NABL, STQC, ISO)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Availability:</span>
              {["ALL", "AVAILABLE", "ASSIGNED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setAvailFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    availFilter === st
                      ? "bg-[#0B2545] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Validator Grid */}
          {loading ? (
            <div className="p-16 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Validators Match</h4>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or availability filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider block">
                          Testing Authority
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {v.organization}
                        </h3>
                      </div>
                      <Badge
                        variant={v.availability === "AVAILABLE" ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {v.availability}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-900" />
                        {v.user_name || "Lead Verification Officer"}
                      </div>
                      {v.user_email && (
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {v.user_email}
                        </div>
                      )}
                    </div>

                    {v.domain_expertise && (
                      <div className="text-xs">
                        <span className="text-slate-400 block text-[11px]">Domain Expertise</span>
                        <span className="font-medium text-slate-700">{v.domain_expertise}</span>
                      </div>
                    )}

                    {v.accreditations && (
                      <div className="text-xs">
                        <span className="text-slate-400 block text-[11px]">Statutory Accreditations</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.accreditations.split(",").map((acc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 text-[10px] font-medium border border-blue-200"
                            >
                              {acc.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Experience</span>
                      <span className="font-bold text-slate-800">{v.years_of_experience} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Audits Completed</span>
                      <span className="font-bold text-emerald-700">{v.validation_count} Pilots</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
