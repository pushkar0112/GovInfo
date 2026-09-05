"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPathForRole } from "@/lib/auth";
import { StakeholderRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Lock,
  Mail,
  User,
  Building2,
  Rocket,
  Award,
  CheckCheck,
  Scale,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

// Strictly EXCLUDES "ADMIN" from public registration dropdown
const PUBLIC_ROLES = [
  {
    role: "GOVERNMENT" as StakeholderRole,
    title: "Government Department",
    badge: "Public Buyer",
    icon: Building2,
    description: "Post problem statements, review sandbox pilots & lead public procurement.",
  },
  {
    role: "STARTUP" as StakeholderRole,
    title: "DPIIT Startup",
    badge: "Innovator",
    icon: Rocket,
    description: "Submit technical proposals, pilot in government testbeds & scale on GeM.",
  },
  {
    role: "EXPERT" as StakeholderRole,
    title: "Expert Evaluator",
    badge: "Technical Panel",
    icon: Award,
    description: "Independent multi-criteria scoring of startup proposals & milestones.",
  },
  {
    role: "VALIDATOR" as StakeholderRole,
    title: "Independent Validator",
    badge: "Testing Agency",
    icon: CheckCheck,
    description: "Verify technical KPIs, cybersecurity standards & certify pilot outcomes.",
  },
  {
    role: "PROCUREMENT_OFFICER" as StakeholderRole,
    title: "Procurement Officer",
    badge: "Finance & Sanction",
    icon: Scale,
    description: "Review testbed certificates, swiss challenges & sanction direct purchase.",
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role")?.toUpperCase();
  const initialRole = PUBLIC_ROLES.some((r) => r.role === initialRoleParam)
    ? (initialRoleParam as StakeholderRole)
    : "STARTUP";

  const { register } = useAuth();

  const [selectedRole, setSelectedRole] = useState<StakeholderRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Common & Role-Specific Fields
  const [organizationName, setOrganizationName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [domainExpertise, setDomainExpertise] = useState("");

  // Government specifics
  const [departmentCode, setDepartmentCode] = useState("");
  const [ministry, setMinistry] = useState("");

  // Startup specifics
  const [dpiitNumber, setDpiitNumber] = useState("");
  const [sector, setSector] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        email,
        password,
        full_name: fullName,
        role: selectedRole,
        phone_number: phoneNumber || undefined,
        organization_name: organizationName || undefined,
        designation: designation || undefined,
        domain_expertise: domainExpertise || undefined,
      };

      if (selectedRole === "GOVERNMENT") {
        payload.department_name = organizationName;
        payload.department_code = departmentCode || undefined;
        payload.ministry = ministry || undefined;
      } else if (selectedRole === "STARTUP") {
        payload.company_name = organizationName;
        payload.dpiit_number = dpiitNumber || undefined;
        payload.sector = sector || domainExpertise || undefined;
      }

      const user = await register(payload);
      const targetDashboard = getDashboardPathForRole(user.role);
      router.push(targetDashboard);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check the form data.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0B2545] text-amber-400 shadow-md mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Create Your Stakeholder Account
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Join India&apos;s National Innovation Procurement Ecosystem
          </p>
        </div>

        {/* Card */}
        <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-10 border border-slate-200">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Issue</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Your Stakeholder Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PUBLIC_ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setSelectedRole(r.role)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-900 bg-blue-50/50 ring-1 ring-blue-900 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900">{r.title}</p>
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            {r.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {r.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Credentials */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Stakeholder Identity & Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="fullname-input">
                    {selectedRole === "STARTUP" ? "Founder / Representative Name" : "Full Name"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="fullname-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Dr. Rajesh Kumar"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-email-input">
                    Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="reg-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        selectedRole === "GOVERNMENT"
                          ? "officer@department.gov.in"
                          : "contact@organization.in"
                      }
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-pwd-input">
                    Password (min. 8 characters) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="reg-pwd-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="confirm-pwd-input">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="confirm-pwd-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role-Specific Profile Information */}
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                2. {selectedRole.replace("_", " ")} Institutional Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Government Role Fields */}
                {selectedRole === "GOVERNMENT" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ministry / Department Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g., Ministry of Electronics and Information Technology"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g., Joint Director / Nodal Officer"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={departmentCode}
                        onChange={(e) => setDepartmentCode(e.target.value)}
                        placeholder="e.g., MEITY-01"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                  </>
                )}

                {/* Startup Role Fields */}
                {selectedRole === "STARTUP" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Startup / Legal Entity Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g., InnovateTech AI Solutions Pvt Ltd"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        DPIIT Recognition Number
                      </label>
                      <input
                        type="text"
                        value={dpiitNumber}
                        onChange={(e) => setDpiitNumber(e.target.value)}
                        placeholder="e.g., DPIIT-89210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Technology Domain / Sector <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        placeholder="e.g., CivicTech, AgriTech, CleanTech"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                  </>
                )}

                {/* Expert Evaluator Fields */}
                {selectedRole === "EXPERT" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic / Research Institution or Firm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g., IIT Delhi / IISc Bangalore"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Domain Expertise & Specialization <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={domainExpertise}
                        onChange={(e) => setDomainExpertise(e.target.value)}
                        placeholder="e.g., Autonomous Systems, Distributed Systems, AI Ethics"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                  </>
                )}

                {/* Validator Fields */}
                {selectedRole === "VALIDATOR" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Accredited Testing Agency / Lab Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g., STQC Directorate / NABL Accredited Lab"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Validation Scope & Testing Accreditation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={domainExpertise}
                        onChange={(e) => setDomainExpertise(e.target.value)}
                        placeholder="e.g., Cybersecurity Certifications, Load/Stress Testing, GFR 2017 Compliance"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                  </>
                )}

                {/* Procurement Officer Fields */}
                {selectedRole === "PROCUREMENT_OFFICER" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Procurement Department / Platform <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g., GeM / Ministry Finance Division"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g., Senior Sanction Officer"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>
                  </>
                )}

                {/* Contact Phone */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="gov"
              size="lg"
              disabled={loading}
              className="w-full justify-center shadow-md font-semibold tracking-wide"
              id="btn-submit-register"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Secure Account...
                </>
              ) : (
                `Complete ${selectedRole.replace("_", " ")} Registration`
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-900 hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>

        {/* Security & Legal Notice */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>All submissions audited under Public Procurement Order (Make in India) & GFR 2017</span>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
