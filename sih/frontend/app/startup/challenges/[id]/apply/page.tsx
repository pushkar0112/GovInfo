"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
  FileText,
  UploadCloud,
  Trash2,
  FileCheck,
  Lock,
} from "lucide-react";

interface ChallengeDetail {
  id: string;
  challenge_code: string;
  title: string;
  domain: string;
  department_name?: string;
  ministry?: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  pilot_duration_days: number;
  application_deadline?: string;
  problem_statement?: string;
  kpis?: {
    id: string;
    name: string;
    target_value: number;
    measurement_unit: string;
  }[];
}

interface SupportingDoc {
  document_id: string;
  original_filename: string;
  document_type: string;
  file_size_bytes: number;
  upload_timestamp: string;
}

const STEPS = [
  { id: 1, label: "Title & Summary", short: "Overview" },
  { id: 2, label: "Problem Alignment", short: "Alignment" },
  { id: 3, label: "Technical Architecture", short: "Architecture" },
  { id: 4, label: "Target Outcomes & KPIs", short: "Outcomes" },
  { id: 5, label: "90-Day Pilot Sandbox Plan", short: "Pilot Plan" },
  { id: 6, label: "Team & Past Deployments", short: "Track Record" },
  { id: 7, label: "Budget & Commercials", short: "Budget" },
  { id: 8, label: "Security, Privacy & IP", short: "Compliance" },
  { id: 9, label: "Review, Attachments & Submit", short: "Final Submit" },
];

export default function StartupChallengeApplyPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // Application Record ID (if draft exists or has been created)
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationCode, setApplicationCode] = useState<string | null>(null);

  // Form State across the 9 Steps
  const [formData, setFormData] = useState({
    proposal_title: "",
    executive_summary: "",
    problem_understanding: "",
    proposed_solution: "",
    technical_approach: "",
    expected_outcomes: "",
    implementation_plan: "",
    pilot_plan: "",
    timeline_days: 90,
    team_capabilities: "",
    previous_deployments: "",
    requested_budget: 1500000,
    estimated_cost: 1500000,
    data_requirements: "",
    security_approach: "",
    ip_approach: "",
    supporting_documents: [] as SupportingDoc[],
    declaration_agreed: false,
  });

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("TECHNICAL_PROPOSAL");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const chData = await apiRequest<ChallengeDetail>(`/api/v1/challenges/${challengeId}`);
        setChallenge(chData);

        // Check if there is an existing draft for this challenge
        const existingApps = await apiRequest<any[]>(`/api/v1/applications?challenge_id=${challengeId}`);
        if (existingApps && existingApps.length > 0) {
          const app = existingApps[0];
          if (app.status !== "DRAFT") {
            // Already submitted, redirect to application tracker
            router.push(`/startup/applications/${app.id}`);
            return;
          }
          setApplicationId(app.id);
          setApplicationCode(app.application_code);
          setFormData((prev) => ({
            ...prev,
            proposal_title: app.proposal_title || "",
            executive_summary: app.executive_summary || app.proposal_summary || "",
            problem_understanding: app.problem_understanding || "",
            proposed_solution: app.proposed_solution || "",
            technical_approach: app.technical_approach || "",
            expected_outcomes: app.expected_outcomes || "",
            implementation_plan: app.implementation_plan || "",
            pilot_plan: app.pilot_plan || "",
            timeline_days: app.timeline_days || chData.pilot_duration_days || 90,
            team_capabilities: app.team_capabilities || "",
            previous_deployments: app.previous_deployments || "",
            requested_budget: app.requested_budget || chData.budget_max || 1500000,
            estimated_cost: app.estimated_cost || chData.budget_max || 1500000,
            data_requirements: app.data_requirements || "",
            security_approach: app.security_approach || "",
            ip_approach: app.ip_approach || "",
            supporting_documents: app.supporting_documents || [],
          }));
        } else {
          // Pre-populate defaults from challenge
          setFormData((prev) => ({
            ...prev,
            timeline_days: chData.pilot_duration_days || 90,
            requested_budget: chData.budget_max ? Number(chData.budget_max) : 1500000,
            estimated_cost: chData.budget_max ? Number(chData.budget_max) : 1500000,
          }));
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load challenge specifications.");
      } finally {
        setLoading(false);
      }
    }

    if (challengeId) {
      loadData();
    }
  }, [challengeId, router]);

  // Save Draft to PostgreSQL
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorMessage(null);
    try {
      const payload = {
        challenge_id: challengeId,
        ...formData,
      };

      let res: any;
      if (applicationId) {
        res = await apiRequest(`/api/v1/applications/${applicationId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest("/api/v1/applications", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setApplicationId(res.id);
        setApplicationCode(res.application_code);
      }
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save application draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Upload Document Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds the maximum allowable size of 10MB.");
      return;
    }

    setUploadingDoc(true);
    setErrorMessage(null);

    const data = new FormData();
    data.append("file", file);
    data.append("document_type", selectedDocType);
    if (applicationId) data.append("application_id", applicationId);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("govinnovate_token");
      const res = await fetch(`${apiUrl}/api/v1/applications/upload-document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to upload document.");
      }

      const uploadResult = await res.json();
      setFormData((prev) => ({
        ...prev,
        supporting_documents: [...prev.supporting_documents, uploadResult],
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Error uploading document.");
    } finally {
      setUploadingDoc(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const removeDocument = (docId: string) => {
    setFormData((prev) => ({
      ...prev,
      supporting_documents: prev.supporting_documents.filter((d) => d.document_id !== docId),
    }));
  };

  // Final Official Submission
  const handleSubmit = async () => {
    if (!formData.declaration_agreed) {
      setErrorMessage("You must agree to the statutory declaration before final submission.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // First ensure draft is saved
      let targetAppId = applicationId;
      if (!targetAppId) {
        const draftRes: any = await apiRequest("/api/v1/applications", {
          method: "POST",
          body: JSON.stringify({ challenge_id: challengeId, ...formData }),
        });
        targetAppId = draftRes.id;
        setApplicationId(draftRes.id);
      }

      // Submit
      const submitRes: any = await apiRequest(`/api/v1/applications/${targetAppId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          challenge_id: challengeId,
          ...formData,
        }),
      });

      // Redirect to tracker page
      router.push(`/startup/applications/${submitRes.id}?submitted=true`);
    } catch (err: any) {
      setErrorMessage(err.message || "Submission failed. Please verify all mandatory sections.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.proposal_title.trim().length >= 5 && formData.executive_summary.trim().length >= 20;
      case 2:
        return formData.problem_understanding.trim().length >= 20;
      case 3:
        return formData.proposed_solution.trim().length >= 20 && formData.technical_approach.trim().length >= 20;
      case 4:
        return formData.expected_outcomes.trim().length >= 20;
      case 5:
        return formData.implementation_plan.trim().length >= 20 && formData.pilot_plan.trim().length >= 20;
      case 6:
        return true; // Optional but recommended
      case 7:
        return formData.requested_budget > 0 && formData.timeline_days > 0;
      case 8:
        return true; // Optional but recommended
      case 9:
        return formData.declaration_agreed;
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs text-slate-500 mt-2">Loading proposal application workspace...</span>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Link
                href={`/startup/challenges/${challengeId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Challenge Specs
              </Link>
              <h1 className="text-xl font-bold text-slate-900">
                Grant Application & Pilot Proposal Wizard
              </h1>
              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                <span className="font-mono text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {challenge?.challenge_code}
                </span>
                <span className="font-medium text-slate-700 truncate">{challenge?.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {applicationCode && (
                <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-bold">
                  {applicationCode}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="text-xs font-semibold gap-1.5"
              >
                {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </Button>
            </div>
          </div>

          {/* Toast / Alerts */}
          {draftSavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Draft autosaved to PostgreSQL. You can safely navigate away and resume anytime.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Stepper Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px] gap-2">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isPassed = currentStep > step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : isPassed
                        ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? "bg-white text-[#0B2545]"
                          : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isPassed ? "✓" : step.id}
                    </span>
                    <span className="whitespace-nowrap">{step.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Workspace Form Container */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Step 1: Solution Title & Executive Summary */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 1: Proposal Title & Executive Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define a distinctive technical solution name and a crisp executive briefing for evaluation officers.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Proposed Solution Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.proposal_title}
                      onChange={(e) => setFormData({ ...formData, proposal_title: e.target.value })}
                      placeholder="e.g. HydroAcoustic IoT Telemetry for Municipal Pipeline Burst Detection"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Minimum 5 characters. Must clearly denote your technology.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Executive Summary & Value Proposition <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.executive_summary}
                      onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
                      placeholder="Provide a concise 3-paragraph summary: (1) Core technology, (2) Problem tackled, (3) Measurable outcome delivered to the sponsoring department..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Minimum 20 characters required.</span>
                      <span>{formData.executive_summary.length} characters</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Problem Understanding & Alignment */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 2: Problem Understanding & Alignment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Demonstrate direct alignment with the government department&apos;s published problem statement.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800">Sponsoring Department&apos;s Challenge Statement:</span>
                  <p className="text-slate-600 line-clamp-3">{challenge?.problem_statement}</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Detailed Problem Analysis & Root-Cause Understanding <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={formData.problem_understanding}
                      onChange={(e) => setFormData({ ...formData, problem_understanding: e.target.value })}
                      placeholder="Explain why current legacy municipal solutions fail, what root causes your team identified, and how your technological approach is tailored to Indian public sector constraints..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Minimum 20 characters required.</span>
                      <span>{formData.problem_understanding.length} characters</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Technical Architecture & Innovation */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 3: Proposed Architecture & Deep-Tech Innovation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detail the end-to-end architecture, algorithms, and deep-tech innovations powering your solution.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Proposed Solution Architecture <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.proposed_solution}
                      onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                      placeholder="Describe high-level architecture: Edge hardware, IoT telemetry stack, backend pipelines, cloud hosting, and dashboard integration..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Technical Approach & Algorithmic Innovation <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.technical_approach}
                      onChange={(e) => setFormData({ ...formData, technical_approach: e.target.value })}
                      placeholder="Describe proprietary algorithms, AI models, hardware IP, sensor calibration, or patented approaches that provide competitive accuracy and reliability..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Expected Outcomes & KPIs */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 4: Expected Outcomes & Quantitative KPI Commitments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Commit to measurable improvements and explain how outcomes will be verified during sandbox trials.
                  </p>
                </div>

                {challenge?.kpis && challenge.kpis.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-800">Target Indicators Mandated by Department:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {challenge.kpis.map((k) => (
                        <li key={k.id}>
                          <strong>{k.name}:</strong> Target {k.target_value} {k.measurement_unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Outcome Delivery & KPI Attainment Commitments <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={formData.expected_outcomes}
                      onChange={(e) => setFormData({ ...formData, expected_outcomes: e.target.value })}
                      placeholder="Outline specific percentage improvements, reduction in turnaround times, cost savings, or public service enhancements your pilot guarantees to achieve..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Implementation & Pilot Sandbox Plan */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 5: 90-Day Pilot Sandbox & Implementation Plan</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure the deployment timeline, field test geography, and milestone delivery roadmap.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Implementation Roadmap & Milestones <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.implementation_plan}
                      onChange={(e) => setFormData({ ...formData, implementation_plan: e.target.value })}
                      placeholder="Milestone 1 (Days 1-30): Site survey & hardware install. Milestone 2 (Days 31-60): Integration & baseline telemetry. Milestone 3 (Days 61-90): Live audit & report..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pilot Sandbox Field Plan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.pilot_plan}
                      onChange={(e) => setFormData({ ...formData, pilot_plan: e.target.value })}
                      placeholder="Specify test locations (wards/junctions), sample size, sensor quantities, civic officer coordination, and backup protocols during trial..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>

                <div className="max-w-xs text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">Proposed Pilot Duration (Days)</label>
                  <input
                    type="number"
                    min={30}
                    max={180}
                    value={formData.timeline_days}
                    onChange={(e) => setFormData({ ...formData, timeline_days: parseInt(e.target.value) || 90 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default standard sandbox window is 90 days.</span>
                </div>
              </div>
            )}

            {/* Step 6: Team Capabilities & Track Record */}
            {currentStep === 6 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 6: Team Expertise & Prior Field Deployments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Demonstrate that your engineering and operations team possesses the capability to execute this public sector pilot.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Key Team Capabilities & Domain Experience</label>
                    <textarea
                      rows={4}
                      value={formData.team_capabilities}
                      onChange={(e) => setFormData({ ...formData, team_capabilities: e.target.value })}
                      placeholder="Highlight principal investigators, lead hardware/software engineers, domain advisors, and academic collaborations..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Previous Deployments & Case Studies</label>
                    <textarea
                      rows={4}
                      value={formData.previous_deployments}
                      onChange={(e) => setFormData({ ...formData, previous_deployments: e.target.value })}
                      placeholder="Detail previous pilots, commercial customer testimonials, or smart city deployments conducted by your team..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Budget Breakdown & Commercials */}
            {currentStep === 7 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 7: Pilot Grant Budget & Cost Estimation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide your funding request. The grant amount must stay within the challenge&apos;s allocated ceiling.
                  </p>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs space-y-1 text-blue-900">
                  <span className="font-bold">Challenge Financial Benchmark:</span>
                  <div>
                    Maximum Pilot Grant: <strong>₹{challenge?.budget_max ? challenge.budget_max.toLocaleString("en-IN") : "20,00,000"}</strong>
                  </div>
                  <span className="text-[10px] text-blue-700">Grant disbursements are released upon verified milestone KPI achievements.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Requested Pilot Sandbox Grant (₹ INR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={100000}
                      step={10000}
                      required
                      value={formData.requested_budget}
                      onChange={(e) => setFormData({ ...formData, requested_budget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] font-bold text-[#0B2545]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      ₹{(formData.requested_budget / 100000).toFixed(2)} Lakhs
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Estimated Full Commercial Rollout Cost (₹ INR)</label>
                    <input
                      type="number"
                      min={100000}
                      step={10000}
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Estimated unit cost at city-wide or district scale.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Security, Privacy & IP Framework */}
            {currentStep === 8 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 8: Cybersecurity, Data Privacy & Intellectual Property</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Address data localization, encryption, vulnerability scanning, and licensing terms.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data Requirements & Civic Integration Needs
                    </label>
                    <textarea
                      rows={3}
                      value={formData.data_requirements}
                      onChange={(e) => setFormData({ ...formData, data_requirements: e.target.value })}
                      placeholder="What GIS layers, municipal sensor feeds, or API access points will your team require from the sponsoring department?"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cybersecurity Architecture & Encryption Protocols
                    </label>
                    <textarea
                      rows={3}
                      value={formData.security_approach}
                      onChange={(e) => setFormData({ ...formData, security_approach: e.target.value })}
                      placeholder="Specify India cloud hosting (e.g. MeitY empaneled cloud), encryption at rest/in-transit, penetration testing compliance..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Intellectual Property & Government Licensing Framework
                    </label>
                    <textarea
                      rows={3}
                      value={formData.ip_approach}
                      onChange={(e) => setFormData({ ...formData, ip_approach: e.target.value })}
                      placeholder="Confirm patent ownership, proprietary algorithms, and confirm non-exclusive pilot licensing terms..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Review, Attachments & Submit */}
            {currentStep === 9 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Step 9: Document Attachments, Review & Final Submission</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attach pitch decks or technical whitepapers, certify statutory claims, and submit for evaluation.
                  </p>
                </div>

                {/* Proposal Summary Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 text-sm">{formData.proposal_title || "Untitled Proposal"}</span>
                    <Badge variant="gov" className="text-[10px]">
                      Ready for Submission
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Requested Grant:</span>
                      <strong className="text-slate-900">₹{(formData.requested_budget / 100000).toFixed(2)}L</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pilot Duration:</span>
                      <strong className="text-slate-900">{formData.timeline_days} Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department:</span>
                      <strong className="text-slate-900 truncate block">{challenge?.department_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sector:</span>
                      <strong className="text-slate-900">{challenge?.domain}</strong>
                    </div>
                  </div>
                </div>

                {/* Supporting Documents Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Supporting Technical Documents (PDF, DOCX, XLSX - Max 10MB)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formData.supporting_documents.length} attached
                    </span>
                  </div>

                  {formData.supporting_documents.length > 0 && (
                    <div className="space-y-2">
                      {formData.supporting_documents.map((doc) => (
                        <div
                          key={doc.document_id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-900 shrink-0" />
                            <div>
                              <div className="font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                                {doc.original_filename}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {doc.document_type} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.document_id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                    >
                      <option value="TECHNICAL_PROPOSAL">Technical Architecture Whitepaper</option>
                      <option value="PITCH_DECK">Pitch Deck / Solution Deck</option>
                      <option value="SECURITY_AUDIT">CERT-In / Security Audit Report</option>
                      <option value="DPIIT_CERTIFICATE">DPIIT Recognition Certificate</option>
                      <option value="BUDGET_BREAKDOWN">Detailed Cost & BoQ Sheet</option>
                    </select>

                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
                      {uploadingDoc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-blue-900" />
                      )}
                      <span>{uploadingDoc ? "Uploading..." : "Select File (PDF/DOCX/XLSX)"}</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.xlsx,.png,.jpg"
                        onChange={handleFileUpload}
                        disabled={uploadingDoc}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Statutory Certification & Declaration */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="statutory-declaration"
                      checked={formData.declaration_agreed}
                      onChange={(e) => setFormData({ ...formData, declaration_agreed: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-[#0B2545] rounded border-slate-300 focus:ring-[#0B2545]"
                    />
                    <label htmlFor="statutory-declaration" className="text-xs text-amber-900 leading-relaxed">
                      <strong>Statutory Declaration & Integrity Pact:</strong> We formally certify that our entity satisfies all published eligibility criteria, does not face debarment under Rule 151 of GFR 2017, and commits to deliver the quantitative pilot milestones specified herein upon contract sanction.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-xs font-semibold gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="text-xs font-semibold gap-1.5"
                >
                  {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Draft
                </Button>

                {currentStep < 9 ? (
                  <Button
                    type="button"
                    variant="gov"
                    size="sm"
                    onClick={() => {
                      if (validateStep(currentStep)) {
                        setCurrentStep(currentStep + 1);
                      } else {
                        setErrorMessage("Please complete the required fields in this step before advancing.");
                      }
                    }}
                    className="text-xs font-bold gap-1.5 shadow-xs"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gov"
                    size="sm"
                    disabled={submitting || !formData.declaration_agreed}
                    onClick={handleSubmit}
                    className="text-xs font-bold gap-2 shadow-md bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" /> Submit Proposal to Government
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
