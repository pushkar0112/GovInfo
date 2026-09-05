"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Mail,
  Building2,
  Briefcase,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Save,
  Lock,
} from "lucide-react";

function ProfileContent() {
  const { currentUser, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [designation, setDesignation] = useState("");
  const [domainExpertise, setDomainExpertise] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || "");
      setPhoneNumber(currentUser.phone_number || "");
      setOrganizationName(
        currentUser.organization_name ||
          currentUser.department_name ||
          currentUser.company_name ||
          ""
      );
      setDesignation(currentUser.designation || "");
      setDomainExpertise(currentUser.domain_expertise || "");
    }
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateProfile({
        full_name: fullName,
        phone_number: phoneNumber,
        organization_name: organizationName,
        designation: designation,
        domain_expertise: domainExpertise,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0B2545] text-white flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-blue-900/10">
              {currentUser.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{currentUser.full_name}</h1>
                <Badge variant="gov" className="text-xs">
                  {currentUser.role}
                </Badge>
                {currentUser.is_verified ? (
                  <Badge variant="success" className="text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                    Verification Pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>{currentUser.email}</span>
                <span>•</span>
                <span>
                  {currentUser.organization_name ||
                    currentUser.department_name ||
                    currentUser.company_name ||
                    "Institutional Member"}
                </span>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
            <div className="flex sm:justify-end items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Member since:{" "}
                <strong className="text-slate-700">
                  {currentUser.created_at
                    ? new Date(currentUser.created_at).toLocaleDateString()
                    : "Active"}
                </strong>
              </span>
            </div>
            {currentUser.last_login && (
              <div className="text-[11px] text-slate-400">
                Last session: {new Date(currentUser.last_login).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Edit Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-bold text-slate-900">Manage Stakeholder Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your institutional contact details and designations accurate for public audit trails.
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile information successfully updated and recorded in audit log.</span>
            </div>
          )}

          {saveError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Read-Only Governance Attributes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Assigned Platform Role</label>
                  <Lock className="w-3 h-3 text-slate-400" />
                </div>
                <input
                  type="text"
                  disabled
                  value={currentUser.role}
                  className="w-full px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Role elevations require nodal officer authorization.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Registered Email</label>
                  <Lock className="w-3 h-3 text-slate-400" />
                </div>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Primary identifier linked to immutable audit trails.
                </span>
              </div>
            </div>

            {/* Editable Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="full-name">
                  Full Name / Official Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="phone-number">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="org-name">
                  Organization / Department / Startup Name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="org-name"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="designation">
                  Designation / Role in Entity
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g., Joint Director / Founder / Evaluator"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="domain-expertise">
                  Domain Expertise / Specialization Focus
                </label>
                <textarea
                  id="domain-expertise"
                  rows={3}
                  value={domainExpertise}
                  onChange={(e) => setDomainExpertise(e.target.value)}
                  placeholder="e.g., Computer Vision, Public Health Informatics, GFR 2017 Procurement, Smart Water Grid Sensors"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="submit"
                variant="gov"
                size="md"
                disabled={isSaving}
                className="gap-2 text-xs font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
