"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  Target,
  BarChart3,
  Coins,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Rocket,
  Info,
  Lightbulb,
  Clock,
  Sparkles,
} from "lucide-react";

interface KPIItem {
  name: string;
  description: string;
  measurement_unit: string;
  baseline_value: string;
  target_value: string;
  measurement_method: string;
  weight: string;
}

const STEPS = [
  { id: 1, label: "Basic Info", icon: Building2 },
  { id: 2, label: "Problem", icon: FileText },
  { id: 3, label: "Desired Outcome", icon: Target },
  { id: 4, label: "Measurable KPIs", icon: BarChart3 },
  { id: 5, label: "Budget & Timeline", icon: Coins },
  { id: 6, label: "Compliance & Data", icon: ShieldAlert },
  { id: 7, label: "Review & Publish", icon: CheckCircle2 },
];

const SECTORS = [
  "CivicTech",
  "HealthTech",
  "CleanTech",
  "AgriTech",
  "DefenceTech",
  "EduTech",
  "FinTech",
  "Smart Cities & Mobility",
  "Water & Sanitation",
];

const SCOPES = ["National", "State-Level", "Municipal", "District-Level", "Pan-India"];

export default function CreateChallengePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  // Step 1: Basic Information
  const [title, setTitle] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [domain, setDomain] = useState("CivicTech");
  const [geographicalScope, setGeographicalScope] = useState("National");

  // Step 2: Problem
  const [problemStatement, setProblemStatement] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [challengeDescription, setChallengeDescription] = useState("");
  const [targetBeneficiaries, setTargetBeneficiaries] = useState("");
  const [techPreferences, setTechPreferences] = useState("");
  const [techRestrictions, setTechRestrictions] = useState("");

  // Step 3: Desired Outcome
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [outcomeTouched, setOutcomeTouched] = useState(false);

  // Step 4: KPIs
  const [kpis, setKpis] = useState<KPIItem[]>([
    {
      name: "Outcome Improvement Rate",
      description: "Measured baseline reduction against current operational data.",
      measurement_unit: "%",
      baseline_value: "30",
      target_value: "15",
      measurement_method: "Continuous telemetry data audit",
      weight: "50",
    },
  ]);

  const [newKpi, setNewKpi] = useState<KPIItem>({
    name: "",
    description: "",
    measurement_unit: "%",
    baseline_value: "",
    target_value: "",
    measurement_method: "",
    weight: "25",
  });

  // Step 5: Budget & Timeline
  const [budgetMin, setBudgetMin] = useState("1000000");
  const [budgetMax, setBudgetMax] = useState("2500000");
  const [currency] = useState("INR");
  const [pilotDurationDays, setPilotDurationDays] = useState("90");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [pilotStartDate, setPilotStartDate] = useState("");

  // Step 6: Data, Security & Compliance
  const [dataRequirements, setDataRequirements] = useState(
    "Departmental SCADA and flow sensor telemetry logs provided under standard bilateral NDA."
  );
  const [securityRequirements, setSecurityRequirements] = useState(
    "MeitY-empanelled cloud hosting, zero-retention edge processing, and TLS 1.3 encryption."
  );
  const [complianceRequirements, setComplianceRequirements] = useState(
    "Compliance with GFR 2017 Rule 149 and CPHEEO / BIS quality standards."
  );
  const [ipRequirements, setIpRequirements] = useState(
    "Startup retains 100% background and foreground intellectual property. Government receives perpetual departmental operational license."
  );
  const [eligibilityRequirements, setEligibilityRequirements] = useState(
    "DPIIT-recognized Indian startups with working prototype at TRL 6 or higher."
  );

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!title.trim()) return "Challenge title is required.";
        return null;
      case 2:
        if (!problemStatement.trim()) return "Problem statement is required.";
        return null;
      case 3:
        if (!desiredOutcome.trim() || desiredOutcome.trim().length < 10) {
          return "Desired outcome is required and must be at least 10 characters.";
        }
        return null;
      case 4:
        if (kpis.length === 0) return "At least one measurable KPI is required.";
        return null;
      case 5:
        if (!budgetMax || parseFloat(budgetMax) <= 0) return "Maximum grant budget is required.";
        if (!applicationDeadline) return "Application submission deadline is required.";
        return null;
      case 6:
        if (!eligibilityRequirements.trim()) return "Startup eligibility criteria is required.";
        return null;
      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      if (currentStep === 3) setOutcomeTouched(true);
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setErrorMessage(null);
      setCurrentStep(targetStep);
      return;
    }
    for (let s = 1; s < targetStep; s++) {
      const err = validateStep(s);
      if (err) {
        if (s === 3) setOutcomeTouched(true);
        setCurrentStep(s);
        setErrorMessage(err);
        return;
      }
    }
    setErrorMessage(null);
    setCurrentStep(targetStep);
  };

  useEffect(() => {
    if (currentUser) {
      setDepartmentName(
        currentUser.organization_name ||
          currentUser.department_name ||
          "Ministry of Electronics and Information Technology"
      );
    }
    // Set default deadline 45 days from today
    const d = new Date();
    d.setDate(d.getDate() + 45);
    setApplicationDeadline(d.toISOString().split("T")[0]);
  }, [currentUser]);

  const handleAddKpi = () => {
    if (!newKpi.name.trim() || !newKpi.target_value.trim()) {
      alert("Please provide at least a KPI Name and Target Value.");
      return;
    }
    setKpis([...kpis, { ...newKpi }]);
    setNewKpi({
      name: "",
      description: "",
      measurement_unit: "%",
      baseline_value: "",
      target_value: "",
      measurement_method: "",
      weight: "25",
    });
  };

  const handleRemoveKpi = (index: number) => {
    setKpis(kpis.filter((_, i) => i !== index));
  };

  const preparePayload = (targetStatus: "DRAFT" | "PUBLISHED") => {
    const formattedKpis = kpis.map((k) => ({
      name: k.name,
      description: k.description || undefined,
      measurement_unit: k.measurement_unit,
      baseline_value: k.baseline_value ? parseFloat(k.baseline_value) : undefined,
      target_value: parseFloat(k.target_value) || 0,
      measurement_method: k.measurement_method || undefined,
      weight: parseFloat(k.weight) || 1.0,
    }));

    return {
      title,
      problem_statement: problemStatement,
      desired_outcome: desiredOutcome,
      current_state: currentState || undefined,
      challenge_description: challengeDescription || undefined,
      target_beneficiaries: targetBeneficiaries || undefined,
      technology_preferences: techPreferences || undefined,
      technology_restrictions: techRestrictions || undefined,
      domain,
      geographical_scope: geographicalScope,
      budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
      budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
      currency,
      pilot_duration_days: parseInt(pilotDurationDays, 10) || 90,
      application_deadline: applicationDeadline
        ? new Date(applicationDeadline).toISOString()
        : undefined,
      pilot_start_date: pilotStartDate
        ? new Date(pilotStartDate).toISOString()
        : undefined,
      data_requirements: dataRequirements || undefined,
      security_requirements: securityRequirements || undefined,
      compliance_requirements: complianceRequirements || undefined,
      intellectual_property_requirements: ipRequirements || undefined,
      eligibility_requirements: eligibilityRequirements || undefined,
      status: targetStatus,
      kpis: formattedKpis,
    };
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !problemStatement.trim()) {
      setErrorMessage("Please fill at least a Title and Problem Statement to save a draft.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = preparePayload("DRAFT");
      await apiRequest("/api/v1/challenges", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/government/challenges");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save draft challenge.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    // Validate all steps first
    for (let s = 1; s <= 6; s++) {
      const err = validateStep(s);
      if (err) {
        if (s === 3) setOutcomeTouched(true);
        setCurrentStep(s);
        setErrorMessage(err);
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMissingRequirements([]);

    try {
      const payload = preparePayload("PUBLISHED");
      const created = await apiRequest<{ id: string }>("/api/v1/challenges", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Attempt explicit publish to trigger full validation rules
      await apiRequest(`/api/v1/challenges/${created.id}/publish`, {
        method: "POST",
      });
      router.push(`/government/challenges/${created.id}`);
    } catch (err: any) {
      if (err.data && err.data.missing_requirements) {
        setMissingRequirements(err.data.missing_requirements);
        setErrorMessage("Please complete all mandatory criteria before publishing:");
      } else {
        setErrorMessage(err.message || "Failed to publish challenge.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="gov" className="text-[10px]">
                  Government Innovation Intake
                </Badge>
                <span className="text-xs text-slate-500">• Outcome-First Procurement</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Define Innovation Problem Statement
              </h1>
              <p className="text-xs text-slate-500">
                Create an outcome-based challenge aligned with GFR 2017 Rule 149 sandbox provisions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </Button>
              <Link href="/government/challenges">
                <Button variant="ghost" size="sm" className="text-xs">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          {/* Contextual Guidance Panel: Why Outcome-based challenges? */}
          <div className="bg-gradient-to-r from-blue-900 to-[#0B2545] rounded-2xl text-white p-5 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Why Outcome-Based Procurement?</span>
                <Badge variant="success" className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  GFR 2017 Best Practice
                </Badge>
              </h2>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Rather than prescribing a specific technology (e.g. &ldquo;Buy 100 CCTV cameras&rdquo;), specify the measurable outcome you want to achieve (e.g. &ldquo;Reduce junction transit delay by 40%&rdquo;). This allows DPIIT startups to propose diverse, cost-effective innovations while keeping evaluation strictly tied to verifiable public impact.
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between min-w-[650px] gap-2">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0B2545] text-white shadow-xs"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        isActive
                          ? "bg-amber-400 text-slate-950 font-bold"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? "✓" : step.id}
                    </div>
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error / Validation Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {missingRequirements.length > 0 && (
                <ul className="list-disc list-inside space-y-1 pl-4 text-rose-700">
                  {missingRequirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Step Form Container */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 1 — Basic Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define the overarching identity, administrative department, and sector scope.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="challenge-title">
                      Challenge Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="challenge-title"
                      type="text"
                      required
                      placeholder="e.g., Autonomous Acoustic Leakage Detection in Urban Water Feeder Networks"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Choose a descriptive, problem-centric title.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="department-name">
                        Department / Ministry
                      </label>
                      <input
                        id="department-name"
                        type="text"
                        disabled
                        value={departmentName}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="domain-select">
                        Domain / Sector <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="domain-select"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      >
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="geographical-scope-select">
                        Geographical Scope
                      </label>
                      <select
                        id="geographical-scope-select"
                        value={geographicalScope}
                        onChange={(e) => setGeographicalScope(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      >
                        {SCOPES.map((sc) => (
                          <option key={sc} value={sc}>
                            {sc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Problem Definition */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 2 — Define Problem Statement</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Describe the operational bottleneck and current state. Avoid prescribing a specific technology unless strictly necessary.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="problem-statement">
                      Problem Statement <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="problem-statement"
                      rows={4}
                      required
                      placeholder="Describe the operational challenge, root cause, and civic impact..."
                      value={problemStatement}
                      onChange={(e) => setProblemStatement(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Helper: Describe the problem and current outcome. Avoid stating &ldquo;We need an AI tool&rdquo;; instead state &ldquo;We need to detect subsurface pipe leaks under 4 hours.&rdquo;
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="current-state">
                      Current Operational Baseline / As-Is State
                    </label>
                    <textarea
                      id="current-state"
                      rows={3}
                      placeholder="e.g., Manual acoustic ground listening sticks require 72 hours per reported leak; 42% non-revenue water loss currently recorded."
                      value={currentState}
                      onChange={(e) => setCurrentState(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="challenge-desc">
                        Challenge Background & Testbed Scope
                      </label>
                      <textarea
                        id="challenge-desc"
                        rows={3}
                        placeholder="Details of the field trial sandbox location and testbed size..."
                        value={challengeDescription}
                        onChange={(e) => setChallengeDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="target-beneficiaries">
                        Target Beneficiaries
                      </label>
                      <textarea
                        id="target-beneficiaries"
                        rows={3}
                        placeholder="e.g., Over 450,000 municipal water consumers across city zones 12 to 19."
                        value={targetBeneficiaries}
                        onChange={(e) => setTargetBeneficiaries(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="tech-prefs">
                        Technology Preferences (Optional)
                      </label>
                      <input
                        id="tech-prefs"
                        type="text"
                        placeholder="e.g., Non-invasive acoustic clamp sensors, NB-IoT"
                        value={techPreferences}
                        onChange={(e) => setTechPreferences(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="tech-restrictions">
                        Technology Restrictions / Guardrails (Optional)
                      </label>
                      <input
                        id="tech-restrictions"
                        type="text"
                        placeholder="e.g., Must not require daytime water pressure shut-off or road digging"
                        value={techRestrictions}
                        onChange={(e) => setTechRestrictions(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Desired Outcome */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 3 — Define Desired Outcome</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Describe what should improve and the target public impact, not which technology must be used.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="desired-outcome">
                      Target Outcome Required <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="desired-outcome"
                      rows={4}
                      required
                      placeholder="e.g., Reduce non-revenue water loss by 20% across the 50 km pilot grid with pinpoint leak location accuracy within 3 meters."
                      value={desiredOutcome}
                      onChange={(e) => {
                        setDesiredOutcome(e.target.value);
                        if (e.target.value.trim().length >= 10 && errorMessage?.includes("Desired outcome")) {
                          setErrorMessage(null);
                        }
                      }}
                      onBlur={() => setOutcomeTouched(true)}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 ${
                        (outcomeTouched && desiredOutcome.trim().length < 10)
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                          : "border-slate-300 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      }`}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <div>
                        {((outcomeTouched || desiredOutcome.trim().length > 0) && desiredOutcome.trim().length < 10) && (
                          <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Desired outcome is required and must be at least 10 characters.</span>
                          </p>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${desiredOutcome.trim().length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {desiredOutcome.trim().length}/10 min characters
                      </span>
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Outcome-Centric Guidance:</strong>
                        <span>
                          Focus on the quantifiable outcome: &ldquo;Demonstrate at least 60% reduction in average triage wait time and greater than 90% diagnostic concordance with district hospital emergency diagnostics.&rdquo;
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Measurable KPIs */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Step 4 — Measurable KPIs</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Define quantitative benchmarks. At least one KPI is mandatory for challenge publishing.
                    </p>
                  </div>
                  <Badge variant="gov" className="text-xs">
                    {kpis.length} KPIs Configured
                  </Badge>
                </div>

                {/* Existing KPI Cards */}
                <div className="space-y-3">
                  {kpis.map((kpi, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{kpi.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            Weight: {kpi.weight}%
                          </Badge>
                        </div>
                        {kpi.description && (
                          <p className="text-[11px] text-slate-500">{kpi.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                          <span>
                            Baseline:{" "}
                            <strong>
                              {kpi.baseline_value || "0"} {kpi.measurement_unit}
                            </strong>
                          </span>
                          <span>→</span>
                          <span>
                            Target:{" "}
                            <strong className="text-emerald-700">
                              {kpi.target_value} {kpi.measurement_unit}
                            </strong>
                          </span>
                          {kpi.measurement_method && (
                            <span className="text-[11px] text-slate-400">
                              Method: {kpi.measurement_method}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveKpi(idx)}
                        className="text-rose-600 hover:bg-rose-50 text-xs self-end sm:self-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add New KPI Form */}
                <div className="p-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 space-y-4">
                  <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-blue-700" /> Add Measurable Quantitative KPI
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        KPI Metric Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Water Leakage Volume Reduction"
                        value={newKpi.name}
                        onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Unit *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., %, hours, metres, ₹"
                        value={newKpi.measurement_unit}
                        onChange={(e) =>
                          setNewKpi({ ...newKpi, measurement_unit: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Current Baseline
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 30"
                        value={newKpi.baseline_value}
                        onChange={(e) =>
                          setNewKpi({ ...newKpi, baseline_value: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Target Value *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 20"
                        value={newKpi.target_value}
                        onChange={(e) =>
                          setNewKpi({ ...newKpi, target_value: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Weight (% or points)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 40"
                        value={newKpi.weight}
                        onChange={(e) => setNewKpi({ ...newKpi, weight: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Measurement Method / Protocol
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Independent ground survey validation and SCADA insertion flowmeter logs"
                        value={newKpi.measurement_method}
                        onChange={(e) =>
                          setNewKpi({ ...newKpi, measurement_method: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="gov"
                      size="sm"
                      onClick={handleAddKpi}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Append KPI
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Budget & Timeline */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 5 — Budget & Timeline</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specify pilot grant parameters and application submission timelines.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="budget-min">
                      Minimum Grant Budget (₹ INR)
                    </label>
                    <input
                      id="budget-min"
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="budget-max">
                      Maximum Grant Budget (₹ INR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="budget-max"
                      type="number"
                      required
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="pilot-duration-days">
                      Pilot Duration (Days) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="pilot-duration-days"
                      type="number"
                      value={pilotDurationDays}
                      onChange={(e) => setPilotDurationDays(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Typically 90–180 days for rapid municipal sandbox validation.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="app-deadline">
                      Application Submission Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="app-deadline"
                      type="date"
                      required
                      value={applicationDeadline}
                      onChange={(e) => setApplicationDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="pilot-start-date">
                      Expected Pilot Sandbox Commencement Date (Optional)
                    </label>
                    <input
                      id="pilot-start-date"
                      type="date"
                      value={pilotStartDate}
                      onChange={(e) => setPilotStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Data, Security & Compliance */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 6 — Governance, Security & Compliance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Outline data sharing policies, IP rights, and GFR 2017 legal safeguards.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="data-reqs">
                      Data Requirements & Bilateral Sharing Protocols
                    </label>
                    <textarea
                      id="data-reqs"
                      rows={2}
                      value={dataRequirements}
                      onChange={(e) => setDataRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="sec-reqs">
                      Cybersecurity & Cloud Empanelment Standards
                    </label>
                    <textarea
                      id="sec-reqs"
                      rows={2}
                      value={securityRequirements}
                      onChange={(e) => setSecurityRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="compliance-reqs">
                      Statutory Compliance & Standards (e.g. GFR 2017 Rule 149)
                    </label>
                    <textarea
                      id="compliance-reqs"
                      rows={2}
                      value={complianceRequirements}
                      onChange={(e) => setComplianceRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="ip-reqs">
                      Intellectual Property (IP) Rights Alignment
                    </label>
                    <textarea
                      id="ip-reqs"
                      rows={2}
                      value={ipRequirements}
                      onChange={(e) => setIpRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="eligibility-reqs">
                      Startup Eligibility Criteria <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="eligibility-reqs"
                      rows={2}
                      required
                      value={eligibilityRequirements}
                      onChange={(e) => setEligibilityRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: Review & Publish */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Step 7 — Dossier Review & Publishing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review all specifications before saving or publishing publicly to DPIIT innovators.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 uppercase">Challenge Identity</span>
                    <h4 className="text-base font-bold text-slate-900">{title || "Untitled Challenge"}</h4>
                    <div className="flex items-center gap-3 text-slate-600 flex-wrap">
                      <span>Department: <strong>{departmentName}</strong></span>
                      <span>•</span>
                      <span>Domain: <strong>{domain}</strong></span>
                      <span>•</span>
                      <span>Scope: <strong>{geographicalScope}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block">Problem Statement</span>
                      <p className="text-slate-600 leading-relaxed">{problemStatement || "—"}</p>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-1.5 ${
                      desiredOutcome.trim().length >= 10
                        ? "border-blue-100 bg-blue-50/50"
                        : "border-rose-200 bg-rose-50/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 block">Target Desired Outcome</span>
                        {desiredOutcome.trim().length < 10 && (
                          <Badge variant="destructive" className="text-[10px]">
                            Action Required (&ge; 10 chars)
                          </Badge>
                        )}
                      </div>
                      {desiredOutcome.trim().length >= 10 ? (
                        <p className="text-blue-900 leading-relaxed font-medium">{desiredOutcome}</p>
                      ) : (
                        <div className="text-rose-700 text-xs font-medium space-y-1.5">
                          <p>Desired outcome is required and must be at least 10 characters.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentStep(3)}
                            className="text-xs text-rose-700 border-rose-300 hover:bg-rose-100/70"
                          >
                            Edit Desired Outcome in Step 3 →
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-700 block">Configured Measurable KPIs ({kpis.length})</span>
                    <div className="divide-y divide-slate-100">
                      {kpis.map((k, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{k.name}</span>
                            <span className="text-slate-500 ml-2">
                              Baseline: {k.baseline_value || "0"} {k.measurement_unit} → Target:{" "}
                              <strong className="text-emerald-700">
                                {k.target_value} {k.measurement_unit}
                              </strong>
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            Weight: {k.weight}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <span className="text-slate-500 block">Grant Range</span>
                      <span className="font-bold text-slate-900">
                        ₹{parseFloat(budgetMin || "0").toLocaleString("en-IN")} – ₹
                        {parseFloat(budgetMax || "0").toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pilot Duration</span>
                      <span className="font-bold text-slate-900">{pilotDurationDays} Days</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Application Deadline</span>
                      <span className="font-bold text-slate-900">{applicationDeadline || "—"}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 block">Startup Eligibility</span>
                    <p className="text-slate-600">{eligibilityRequirements || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="text-xs gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save as Draft
                </Button>

                {currentStep < 7 ? (
                  <Button
                    type="button"
                    variant="gov"
                    size="sm"
                    onClick={handleNextStep}
                    className="text-xs gap-1.5 font-semibold"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gov"
                    size="sm"
                    onClick={handlePublish}
                    disabled={submitting}
                    className="text-xs gap-1.5 font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    {submitting ? "Publishing Challenge..." : "Publish Challenge"}
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
