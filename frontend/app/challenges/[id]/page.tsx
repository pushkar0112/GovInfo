"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
  AlertCircle,
  FileCheck,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { apiRequest, getStoredAuth } from "@/lib/auth";

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Proposal Form states
  const [proposalSummary, setProposalSummary] = useState("");
  const [technicalApproach, setTechnicalApproach] = useState("");
  const [trl, setTrl] = useState("TRL 7");
  const [pitchDeckUrl, setPitchDeckUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadChallenge() {
      try {
        const data = await apiRequest<any>(`/api/v1/challenges/${challengeId}`);
        setChallenge(data);
      } catch {
        // Mock fallback for rich preview
        setChallenge({
          id: challengeId,
          title: "AI-Assisted Rural Triage & Diagnostic Telemetry for Primary Health Centres",
          problem_statement:
            "Remote primary healthcare centres (PHCs) in hilly and tribal districts face acute specialist physician shortages. Triage decisions currently rely on manual assessments, resulting in 4-6 hour transfer delays to tertiary civil hospitals, high avoidable patient mortality during transit, and overwhelming urban trauma centres with non-critical cases.",
          outcome_definition:
            "1. Achieve minimum 60% reduction in median patient triage wait time in pilot rural PHCs.\n2. Attain greater than 90% diagnostic concordance with senior emergency medicine consultants for top 5 critical presenting syndromes (Cardiovascular, Acute Respiratory, Maternal distress, Sepsis, Severe trauma).\n3. Operate stably on low-bandwidth intermittent 4G/2G GSM networks with edge-cached offline telemetry fallback.",
          target_sector: "HealthTech",
          budget_estimate: 1500000,
          pilot_duration_months: 3.0,
          status: "PUBLISHED",
          department_name: "National Health Authority",
          ministry: "Ministry of Health & Family Welfare",
          created_at: "2024-08-15T10:00:00Z",
        });
      } finally {
        setLoading(false);
      }
    }

    loadChallenge();
  }, [challengeId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const { token, user } = getStoredAuth();

    if (!token || !user) {
      setAuthModalOpen(true);
      return;
    }

    if (user.role !== "STARTUP") {
      setErrorMessage("Only registered DPIIT Startups can submit proposals to this challenge.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/api/v1/challenges/${challengeId}/apply`, {
        method: "POST",
        body: JSON.stringify({
          proposal_summary: proposalSummary,
          technical_approach: technicalApproach,
          proposed_solution_trl: trl,
          pitch_deck_url: pitchDeckUrl,
        }),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/portal/startup");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            href="/challenges"
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Challenges Directory
          </Link>

          {/* Top Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gov">
                <Building2 className="w-3 h-3 mr-1 text-amber-500" />
                {challenge?.ministry || "Ministry of Health & Family Welfare"}
              </Badge>
              <Badge variant="secondary">{challenge?.target_sector || "HealthTech"}</Badge>
              <Badge variant="success">Active Challenge</Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {challenge?.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">Sanctioned Pilot Budget</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{challenge?.budget_estimate?.toLocaleString("en-IN") || "15,00,000"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Pilot Sandbox Duration</span>
                <span className="font-bold text-slate-900 text-sm">
                  {challenge?.pilot_duration_months || 3.0} Months
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Department</span>
                <span className="font-bold text-slate-900 text-sm">
                  {challenge?.department_name || "National Health Authority"}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Problem Specs & Proposal Submission */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Detailed Specs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problem Statement Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Official Problem Statement
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {challenge?.problem_statement}
                </p>
              </div>

              {/* Quantifiable Outcome Targets Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
                <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-900" />
                  Target Outcomes & KPI Requirements
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  {challenge?.outcome_definition}
                </p>
              </div>

              {/* Legal Procurement Pathway Guidance */}
              <div className="bg-slate-100/80 rounded-xl border border-slate-200 p-6 space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Legal Procurement Alignment (GFR 2017)
                </h4>
                <p className="leading-relaxed">
                  Startups applying to this challenge are evaluated under Startup India exemptions from prior turnover and experience. Upon successful field completion and third-party STQC/IIT empirical validation, the department can procure the solution under <strong>GFR Rule 149</strong> direct purchase exemptions on the Government e-Marketplace (GeM).
                </p>
              </div>
            </div>

            {/* Right: Proposal Submission Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border-2 border-blue-900/20 p-6 shadow-md sticky top-24 space-y-5">
                <div>
                  <Badge variant="gov" className="mb-2">
                    Startup Sandbox Proposal
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-900">
                    Apply with Your Solution
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit your technical approach and TRL readiness.
                  </p>
                </div>

                {submitSuccess ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Proposal Submitted Successfully!
                    </div>
                    <p>
                      Your proposal has been logged with audit verification. Redirecting to your Startup Dashboard...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Executive Proposal Summary
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={proposalSummary}
                        onChange={(e) => setProposalSummary(e.target.value)}
                        placeholder="Briefly describe how your technology solves the specific problem statement..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white placeholder:text-slate-400 caret-slate-900 focus:text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Technical Approach & Architecture
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={technicalApproach}
                        onChange={(e) => setTechnicalApproach(e.target.value)}
                        placeholder="Describe system architecture, deployment requirements, and edge/offline handling..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white placeholder:text-slate-400 caret-slate-900 focus:text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Technology Readiness Level (TRL)
                      </label>
                      <select
                        value={trl}
                        onChange={(e) => setTrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="TRL 6" className="text-slate-900 bg-white">TRL 6 - Prototype validated in relevant environment</option>
                        <option value="TRL 7" className="text-slate-900 bg-white">TRL 7 - Demonstration in operational environment</option>
                        <option value="TRL 8" className="text-slate-900 bg-white">TRL 8 - System completed and qualified</option>
                        <option value="TRL 9" className="text-slate-900 bg-white">TRL 9 - Actual system proven in operational environment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Pitch Deck / Architecture URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={pitchDeckUrl}
                        onChange={(e) => setPitchDeckUrl(e.target.value)}
                        placeholder="https://drive.google.com/... or https://..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white placeholder:text-slate-400 caret-slate-900 focus:text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] focus:outline-none transition-colors"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full justify-center gap-2 text-xs font-semibold py-3 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit Startup Proposal
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultRole="STARTUP"
      />
    </>
  );
}
