"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Rocket,
  X,
  Lock,
  Mail,
  User,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardPathForRole } from "@/lib/auth";
import { useAuth, RegisterPayload } from "@/lib/auth-context";
import { StakeholderRole } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: StakeholderRole;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultRole = "GOVERNMENT",
}: AuthModalProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [role, setRole] = useState<StakeholderRole>(defaultRole);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [ministry, setMinistry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [dpiitNumber, setDpiitNumber] = useState("");
  const [sector, setSector] = useState("CivicTech");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isRegister) {
        // Register API call
        const payload: RegisterPayload = {
          email,
          password,
          full_name: fullName,
          role,
        };

        if (role === "GOVERNMENT") {
          payload.department_name = departmentName;
          payload.department_code = departmentCode;
          payload.ministry = ministry || "Ministry of Electronics and IT";
        } else if (role === "STARTUP") {
          payload.company_name = companyName;
          payload.dpiit_number = dpiitNumber;
          payload.sector = sector;
        }

        const user = await register(payload);
        onClose();
        router.push(getDashboardPathForRole(user.role));
      } else {
        const user = await login(email, password);
        onClose();
        router.push(getDashboardPathForRole(user.role));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed. Please check inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-[#0B2545] text-white p-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-base tracking-tight">
                GovInnovate Portal Access
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Secure, role-based gateway for Government Departments and DPIIT Startups.
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-blue-950/60 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setRole("GOVERNMENT");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                role === "GOVERNMENT"
                  ? "bg-white text-[#0B2545] font-semibold shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Government Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("STARTUP");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md transition-all ${
                role === "STARTUP"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-amber-600" />
              Startup Portal
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Action toggle: Login vs Register */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isRegister
                  ? role === "GOVERNMENT"
                    ? "Register Government Department"
                    : "Register DPIIT Startup"
                  : role === "GOVERNMENT"
                  ? "Government Official Sign In"
                  : "Startup Innovator Sign In"}
              </h3>
              <span className="text-xs text-slate-500">
                {isRegister
                  ? "Provide verified entity details"
                  : "Enter your registered credentials"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage(null);
              }}
              className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
            >
              {isRegister ? "Already registered? Sign In" : "New entity? Register"}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Additional Fields */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {role === "GOVERNMENT" ? "Nodal Officer Full Name" : "Founder / Representative Name"}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === "GOVERNMENT" ? "e.g., Dr. Rajesh Kumar" : "e.g., Ananya Sharma"}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>

                {role === "GOVERNMENT" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Ministry
                        </label>
                        <input
                          type="text"
                          required
                          value={ministry}
                          onChange={(e) => setMinistry(e.target.value)}
                          placeholder="e.g., Ministry of Health"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Department Code
                        </label>
                        <input
                          type="text"
                          required
                          value={departmentCode}
                          onChange={(e) => setDepartmentCode(e.target.value)}
                          placeholder="e.g., MOHFW-01"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Department / Bureau Name
                      </label>
                      <input
                        type="text"
                        required
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        placeholder="e.g., National Health Authority"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Startup / Company Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., InnovateTech AI Private Limited"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          DPIIT Recognition Number
                        </label>
                        <input
                          type="text"
                          value={dpiitNumber}
                          onChange={(e) => setDpiitNumber(e.target.value)}
                          placeholder="e.g., DPIIT-89210"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Focus Sector
                        </label>
                        <select
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none bg-white"
                        >
                          <option value="CivicTech">CivicTech</option>
                          <option value="HealthTech">HealthTech</option>
                          <option value="AgriTech">AgriTech</option>
                          <option value="DefenceTech">DefenceTech</option>
                          <option value="CleanTech">CleanTech</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Common Credentials */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {role === "GOVERNMENT" ? "Government Email (.gov.in / nic.in preferred)" : "Official Startup Email"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "GOVERNMENT" ? "officer@nic.in" : "contact@startup.io"}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant={role === "GOVERNMENT" ? "gov" : "secondary"}
                disabled={isLoading}
                className="w-full justify-center py-2.5 text-xs font-semibold gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRegister
                  ? `Complete Registration (${role})`
                  : `Sign In to ${role === "GOVERNMENT" ? "Government Portal" : "Startup Portal"}`}
              </Button>
            </div>
          </form>
        </div>

        {/* Modal Footer Note */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Encrypted with SHA-256 / Bcrypt</span>
          <span className="text-slate-400">SIH 2024–2026</span>
        </div>
      </div>
    </div>
  );
}
