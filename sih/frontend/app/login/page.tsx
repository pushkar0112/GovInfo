"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPathForRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Rocket,
  Award,
  CheckCheck,
  Scale,
  Settings,
} from "lucide-react";

const DEMO_PERSONAS = [
  {
    role: "GOVERNMENT",
    label: "Government",
    email: "government@govinnovate.gov.in",
    password: "GovInnovate2025!",
    icon: Building2,
    org: "MeitY Nodal Officer",
  },
  {
    role: "STARTUP",
    label: "Startup",
    email: "startup@govinnovate.dev",
    password: "GovInnovate2025!",
    icon: Rocket,
    org: "InnovateTech AI",
  },
  {
    role: "EXPERT",
    label: "Expert",
    email: "expert@govinnovate.gov.in",
    password: "GovInnovate2025!",
    icon: Award,
    org: "IIT Delhi Evaluator",
  },
  {
    role: "VALIDATOR",
    label: "Validator",
    email: "validator@govinnovate.org",
    password: "GovInnovate2025!",
    icon: CheckCheck,
    org: "STQC Testing Lab",
  },
  {
    role: "PROCUREMENT_OFFICER",
    label: "Procurement",
    email: "procurement@govinnovate.gov.in",
    password: "GovInnovate2025!",
    icon: Scale,
    org: "GeM Sanction Officer",
  },
  {
    role: "ADMIN",
    label: "Admin",
    email: "admin@govinnovate.gov.in",
    password: "GovInnovate2025!",
    icon: Settings,
    org: "Platform Administrator",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password, rememberMe);
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        const targetDashboard = getDashboardPathForRole(user.role);
        router.push(targetDashboard);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
      setLoading(false);
    }
  };

  const handleQuickFill = (persona: typeof DEMO_PERSONAS[0]) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Emblem & Branding */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0B2545] flex items-center justify-center text-white shadow-lg ring-4 ring-blue-900/10">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Sign In to GovInnovate
        </h1>
        <p className="mt-1 text-center text-xs text-slate-600">
          Public Sector Innovation Procurement Gateway • Single Sign-On
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email-input">
                Official Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@department.gov.in or founder@startup.io"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="password-input">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <span>Remember this workstation</span>
              </label>
              <span className="text-slate-400 hover:text-blue-900 cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="gov"
              size="lg"
              disabled={loading}
              className="w-full justify-center shadow-md font-semibold tracking-wide"
              id="btn-submit-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating Stakeholder...
                </>
              ) : (
                "Sign In to Platform"
              )}
            </Button>
          </form>

          {/* Development Quick-Fill Personas */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Dev Personas (Quick Fill)
              </span>
              <Badge variant="gov" className="text-[9px] py-0 px-1">Dev Mode</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_PERSONAS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleQuickFill(p)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-blue-900 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
                    title={`${p.label}: ${p.org}`}
                  >
                    <IconComponent className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-900 mb-1" />
                    <span className="text-[10px] font-medium text-slate-700 group-hover:text-blue-900 text-center leading-tight">
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-blue-900 hover:underline">
              Register New Stakeholder
            </Link>
          </div>
        </div>

        {/* Security & Compliance Footer Note */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protected by 256-bit TLS encryption • GFR 2017 & GeM Certified</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
