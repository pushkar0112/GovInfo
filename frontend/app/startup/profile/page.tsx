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
  ShieldCheck,
  Award,
  Layers,
  MapPin,
  Globe,
  Users,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Save,
  FileCheck,
  TrendingUp,
  Cpu,
} from "lucide-react";

interface StartupProfileData {
  id: string;
  startup_name: string;
  legal_name?: string;
  founded_year?: number;
  website?: string;
  headquarters?: string;
  team_size?: string;
  dpiit_recognition_number?: string;
  recognition_status: string;
  cin_number?: string;
  description?: string;
  technology_domains: string[];
  solution_categories: string[];
  product_stage: string;
  operating_regions: string[];
  previous_deployments?: string;
  government_experience?: string;
  certifications?: string;
  cybersecurity_certifications?: string;
  contact_email?: string;
  contact_phone?: string;
  completeness_percentage: number;
}

const AVAILABLE_DOMAINS = [
  "WaterTech",
  "AI & Machine Learning",
  "IoT & Telemetry",
  "CleanTech",
  "AgriTech",
  "HealthTech",
  "GovTech",
  "Cybersecurity",
  "Smart Mobility",
  "Waste Management",
  "DefenceTech",
  "SpaceTech",
];

const AVAILABLE_STAGES = [
  { value: "IDEA", label: "Idea / Conceptual", desc: "Proof of concept in ideation" },
  { value: "PROTOTYPE", label: "Laboratory Prototype", desc: "Working lab prototype (TRL 4-5)" },
  { value: "MVP", label: "Minimum Viable Product", desc: "Tested in simulated field environment (TRL 6-7)" },
  { value: "PRODUCTION", label: "Commercial Production", desc: "Commercially available & deployable (TRL 8)" },
  { value: "SCALED", label: "Scaled Enterprise", desc: "Proven in multi-site production deployments (TRL 9)" },
];

const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function StartupProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<StartupProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<StartupProfileData>>({});
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newRegionInput, setNewRegionInput] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiRequest<StartupProfileData>("/api/v1/startups/profile");
      setProfile(data);
      setFormData({
        startup_name: data.startup_name || "",
        legal_name: data.legal_name || "",
        founded_year: data.founded_year || undefined,
        website: data.website || "",
        headquarters: data.headquarters || "",
        team_size: data.team_size || "1-10",
        dpiit_recognition_number: data.dpiit_recognition_number || "",
        recognition_status: data.recognition_status || "PENDING",
        cin_number: data.cin_number || "",
        description: data.description || "",
        technology_domains: data.technology_domains || [],
        solution_categories: data.solution_categories || [],
        product_stage: data.product_stage || "MVP",
        operating_regions: data.operating_regions || [],
        previous_deployments: data.previous_deployments || "",
        government_experience: data.government_experience || "",
        certifications: data.certifications || "",
        cybersecurity_certifications: data.cybersecurity_certifications || "",
        contact_email: data.contact_email || currentUser?.email || "",
        contact_phone: data.contact_phone || "",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load startup profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const updated = await apiRequest<StartupProfileData>("/api/v1/startups/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update profile. Please review the inputs.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDomain = (domain: string) => {
    const current = formData.technology_domains || [];
    if (current.includes(domain)) {
      setFormData({ ...formData, technology_domains: current.filter((d) => d !== domain) });
    } else {
      setFormData({ ...formData, technology_domains: [...current, domain] });
    }
  };

  const addCustomDomain = () => {
    if (!newDomainInput.trim()) return;
    const current = formData.technology_domains || [];
    if (!current.includes(newDomainInput.trim())) {
      setFormData({ ...formData, technology_domains: [...current, newDomainInput.trim()] });
    }
    setNewDomainInput("");
  };

  const addRegion = () => {
    if (!newRegionInput.trim()) return;
    const current = formData.operating_regions || [];
    if (!current.includes(newRegionInput.trim())) {
      setFormData({ ...formData, operating_regions: [...current, newRegionInput.trim()] });
    }
    setNewRegionInput("");
  };

  const removeRegion = (region: string) => {
    const current = formData.operating_regions || [];
    setFormData({ ...formData, operating_regions: current.filter((r) => r !== region) });
  };

  const completeness = profile?.completeness_percentage || 0;

  return (
    <ProtectedRoute allowedRoles={["STARTUP", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header & Completeness Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="gov" className="text-[10px]">
                    Startup Verification & Credentialing
                  </Badge>
                  {profile?.recognition_status === "VERIFIED" ? (
                    <Badge variant="success" className="text-[10px] gap-1">
                      <ShieldCheck className="w-3 h-3" /> DPIIT Recognized
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] gap-1">
                      <AlertCircle className="w-3 h-3" /> DPIIT Verification Pending
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Startup Entity Profile & Tech Readiness
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Maintain your official statutory credentials, technology domains, product readiness level, and municipal track record. This profile powers automated challenge eligibility screening and government application submissions.
                </p>
              </div>

              {/* Completeness Card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 lg:w-72 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Profile Completeness</span>
                  <span className="text-xs font-bold text-[#0B2545]">{completeness}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      completeness >= 80 ? "bg-emerald-500" : completeness >= 50 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {completeness >= 80
                    ? "✨ Ready to apply to all government innovation challenges!"
                    : "Complete DPIIT credentials and product stage to unlock direct applications."}
                </p>
              </div>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profile successfully updated and synchronized across challenge screening systems.</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading startup entity profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Section 1: Legal Entity & Organization */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Building2 className="w-5 h-5 text-[#0B2545]" />
                  <h2 className="text-base font-bold text-slate-900">Entity Details & Organization</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Startup / Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.startup_name || ""}
                      onChange={(e) => setFormData({ ...formData, startup_name: e.target.value })}
                      placeholder="e.g. AquaSense Technologies"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Legal Registered Name</label>
                    <input
                      type="text"
                      value={formData.legal_name || ""}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      placeholder="e.g. AquaSense Technologies Private Limited"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="url"
                        value={formData.website || ""}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://aquasense.io"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Headquarters City & State</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.headquarters || ""}
                        onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                        placeholder="e.g. Bengaluru, Karnataka"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Founded Year</label>
                    <input
                      type="number"
                      min={1990}
                      max={2026}
                      value={formData.founded_year || ""}
                      onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) || undefined })}
                      placeholder="e.g. 2022"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Team Size</label>
                    <select
                      value={formData.team_size || "1-10"}
                      onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] bg-white"
                    >
                      {TEAM_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size} members
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Executive Summary / Pitch</label>
                  <textarea
                    rows={3}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Briefly describe your company's core technological offering and public sector focus..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                  />
                </div>
              </div>

              {/* Section 2: Statutory Recognition & Compliance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-5 h-5 text-[#0B2545]" />
                  <h2 className="text-base font-bold text-slate-900">DPIIT & Statutory Recognition</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      DPIIT Recognition Number
                    </label>
                    <input
                      type="text"
                      value={formData.dpiit_recognition_number || ""}
                      onChange={(e) => setFormData({ ...formData, dpiit_recognition_number: e.target.value })}
                      placeholder="e.g. DIPP-98124 or DPIIT-89210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Found in your Startup India recognition certificate.</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Recognition Status</label>
                    <select
                      value={formData.recognition_status || "PENDING"}
                      onChange={(e) => setFormData({ ...formData, recognition_status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] bg-white font-medium"
                    >
                      <option value="VERIFIED">VERIFIED (DPIIT Certificate Validated)</option>
                      <option value="PENDING">PENDING (Application Under Review)</option>
                      <option value="NOT_VERIFIED">NOT_VERIFIED (Non-DPIIT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CIN / Registration No.</label>
                    <input
                      type="text"
                      value={formData.cin_number || ""}
                      onChange={(e) => setFormData({ ...formData, cin_number: e.target.value })}
                      placeholder="e.g. U72900KA2022PTC158912"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Technology Readiness & Domains */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Cpu className="w-5 h-5 text-[#0B2545]" />
                  <h2 className="text-base font-bold text-slate-900">Technology Domains & Product Stage</h2>
                </div>

                {/* Product Stage Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-2">
                    Current Product Readiness Level (TRL Alignment) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {AVAILABLE_STAGES.map((s) => {
                      const isSelected = formData.product_stage === s.value;
                      return (
                        <div
                          key={s.value}
                          onClick={() => setFormData({ ...formData, product_stage: s.value })}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50/70 border-[#0B2545] ring-1 ring-[#0B2545]"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{s.label}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0B2545]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Technology Domains Multi-Select */}
                <div>
                  <label className="block font-semibold text-slate-700 text-xs mb-2">
                    Technology & Problem Domains
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {AVAILABLE_DOMAINS.map((domain) => {
                      const isSelected = (formData.technology_domains || []).includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => toggleDomain(domain)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-[#0B2545] text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected ? `✓ ${domain}` : `+ ${domain}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      placeholder="Add custom domain (e.g. Edge AI)"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCustomDomain} className="text-xs">
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section 4: Operating Regions & Track Record */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Layers className="w-5 h-5 text-[#0B2545]" />
                  <h2 className="text-base font-bold text-slate-900">Track Record & Operating Regions</h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Operating Regions / Deployment States
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.operating_regions || []).map((region) => (
                        <span
                          key={region}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-800"
                        >
                          {region}
                          <button
                            type="button"
                            onClick={() => removeRegion(region)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="text"
                        value={newRegionInput}
                        onChange={(e) => setNewRegionInput(e.target.value)}
                        placeholder="e.g. Karnataka, Maharashtra, All-India"
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B2545]"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addRegion} className="text-xs">
                        Add Region
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Previous Deployments & Case Studies
                      </label>
                      <textarea
                        rows={3}
                        value={formData.previous_deployments || ""}
                        onChange={(e) => setFormData({ ...formData, previous_deployments: e.target.value })}
                        placeholder="List commercial pilots, municipal trials, or enterprise customer deployments..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Government & Public Sector Experience
                      </label>
                      <textarea
                        rows={3}
                        value={formData.government_experience || ""}
                        onChange={(e) => setFormData({ ...formData, government_experience: e.target.value })}
                        placeholder="Prior tenders won, GeM portal registrations, Smart City deployments, or MoU engagements..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        General Certifications (ISO, BIS, CE)
                      </label>
                      <input
                        type="text"
                        value={formData.certifications || ""}
                        onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                        placeholder="e.g. ISO 9001:2015, CE Marking"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Cybersecurity Audits & Certifications (CERT-In, ISO 27001)
                      </label>
                      <input
                        type="text"
                        value={formData.cybersecurity_certifications || ""}
                        onChange={(e) => setFormData({ ...formData, cybersecurity_certifications: e.target.value })}
                        placeholder="e.g. CERT-In empaneled audit 2025, ISO/IEC 27001"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Primary Contact Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Mail className="w-5 h-5 text-[#0B2545]" />
                  <h2 className="text-base font-bold text-slate-900">Official Point of Contact</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={formData.contact_email || ""}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="founder@aquasense.io"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Mobile / Direct Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={formData.contact_phone || ""}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Link
                  href="/startup/challenges"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Explore Government Innovation Challenges →
                </Link>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="gov"
                    disabled={saving}
                    className="gap-2 text-xs font-bold shadow-xs px-6 py-2.5"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Entity Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
