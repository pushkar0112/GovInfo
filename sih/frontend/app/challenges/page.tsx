"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Coins,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";

interface ChallengeItem {
  id: string;
  title: string;
  problem_statement: string;
  outcome_definition: string;
  target_sector: string;
  budget_estimate?: number;
  pilot_duration_months: number;
  status: string;
  department_name?: string;
  ministry?: string;
  applications_count: number;
  created_at: string;
}

const DEFAULT_CHALLENGES: ChallengeItem[] = [
  {
    id: "ch-001",
    title: "AI-Assisted Rural Triage & Diagnostic Telemetry for Primary Health Centres",
    problem_statement:
      "Remote primary healthcare centres face acute specialist shortages, causing delayed critical triage and high avoidable patient mortality during emergency transfers.",
    outcome_definition:
      "Demonstrate at least 60% reduction in average triage wait time and greater than 90% concordance with district hospital emergency diagnostics.",
    target_sector: "HealthTech",
    budget_estimate: 1500000,
    pilot_duration_months: 3.0,
    status: "PUBLISHED",
    department_name: "National Health Authority",
    ministry: "Ministry of Health & Family Welfare",
    applications_count: 8,
    created_at: "2024-08-15T10:00:00Z",
  },
  {
    id: "ch-002",
    title: "Acoustic Non-Revenue Water (NRW) Leakage Detection in City Supply Grids",
    problem_statement:
      "Municipal water boards lose up to 42% of treated potable water due to undetected subsurface pipe bursts and illegal tapping without destructive road digging.",
    outcome_definition:
      "Pinpoint pipeline leak locations within 3-meter spatial accuracy and under 4 hours detection time across a 50 km feeder network.",
    target_sector: "CivicTech",
    budget_estimate: 2500000,
    pilot_duration_months: 4.0,
    status: "PUBLISHED",
    department_name: "Urban Infrastructure Development Board",
    ministry: "Ministry of Housing and Urban Affairs",
    applications_count: 5,
    created_at: "2024-08-20T10:00:00Z",
  },
  {
    id: "ch-003",
    title: "Autonomous Thermal UAV Drone Surveillance for Forest Fire Early-Warning",
    problem_statement:
      "Dry deciduous sanctuary belts suffer catastrophic canopy wildfires before satellite thermal alerts refresh, exceeding ground ranger response capabilities.",
    outcome_definition:
      "Autonomous beyond-visual-line-of-sight (BVLOS) patrol detecting ember flare-ups under 1 meter diameter within 8 minutes of ignition.",
    target_sector: "CleanTech",
    budget_estimate: 3000000,
    pilot_duration_months: 3.0,
    status: "PUBLISHED",
    department_name: "Wildlife & Forest Conservation Directorate",
    ministry: "Ministry of Environment, Forest & Climate Change",
    applications_count: 6,
    created_at: "2024-08-25T10:00:00Z",
  },
];

export default function ChallengesDirectoryPage() {
  const [challenges, setChallenges] = useState<ChallengeItem[]>(DEFAULT_CHALLENGES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const sectorParam = selectedSector !== "ALL" ? `?sector=${selectedSector}` : "";
        const data = await apiRequest<ChallengeItem[]>(`/api/v1/challenges${sectorParam}`);
        if (data && data.length > 0) {
          // Merge API results with default illustrative challenges so users always see rich content
          const merged = [...data];
          DEFAULT_CHALLENGES.forEach((d) => {
            if (!merged.find((m) => m.id === d.id)) {
              merged.push(d);
            }
          });
          setChallenges(merged);
        }
      } catch {
        // Keep default challenges
      }
    }

    fetchChallenges();
  }, [selectedSector]);

  const sectors = ["ALL", "CivicTech", "HealthTech", "CleanTech", "AgriTech", "DefenceTech"];

  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.problem_statement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ministry && c.ministry.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSector =
      selectedSector === "ALL" ||
      c.target_sector.toLowerCase() === selectedSector.toLowerCase();

    return matchesSearch && matchesSector;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <div className="max-w-3xl">
            <Badge variant="gov" className="mb-3">
              Open Public Sector Challenges
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Outcome-Based Innovation Challenges
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Explore unresolved operational problems published by Indian ministries and municipal bodies. Apply directly with your technology solution to receive milestone-funded sandbox grants and a verified procurement pathway.
            </p>
          </div>

          {/* Search and Sector Filters */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search challenges by keyword, ministry, or outcome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
              />
            </div>

            {/* Sector filter tabs */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {sectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedSector === sec
                      ? "bg-[#0B2545] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Challenge Cards Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {filteredChallenges.length} Open Challenges</span>
            <span>All Challenges Align with GFR 2017 & Startup India Exemptions</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-2xs hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 max-w-3xl">
                  {/* Ministry & Sector Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="gov" className="text-[11px]">
                      <Building2 className="w-3 h-3 mr-1 text-amber-500" />
                      {challenge.ministry || "Central Ministry"}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {challenge.target_sector}
                    </Badge>
                    <Badge variant="success" className="text-[11px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Open for Proposals
                    </Badge>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {challenge.title}
                  </h2>

                  {/* Problem Statement Preview */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">Problem: </span>
                    {challenge.problem_statement}
                  </p>

                  {/* Outcome Definition */}
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-blue-950">
                    <span className="font-bold text-blue-900 block mb-0.5">
                      Target Outcome Required:
                    </span>
                    {challenge.outcome_definition}
                  </div>
                </div>

                {/* Metrics & Action Column */}
                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 lg:min-w-[220px] pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right space-y-1">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                      Pilot Sandbox Grant
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 block">
                      ₹{challenge.budget_estimate?.toLocaleString("en-IN") || "15,00,000"}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Duration: {challenge.pilot_duration_months} Months
                    </span>
                  </div>

                  <Link href={`/challenges/${challenge.id}`} className="w-full lg:w-auto">
                    <Button
                      variant="gov"
                      size="md"
                      className="w-full lg:w-auto text-xs font-semibold gap-2 shadow-2xs"
                    >
                      View Specs & Apply
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
