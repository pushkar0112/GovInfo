"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPathForRole } from "@/lib/auth";
import { StakeholderRole } from "@/types";
import {
  Building2,
  Rocket,
  Shield,
  Menu,
  X,
  CheckCircle2,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Award,
  FlaskConical,
  ShieldCheck,
  Coins,
  FileText,
  CreditCard,
  TrendingUp,
  BarChart3,
  Globe,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<StakeholderRole>("GOVERNMENT");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const openAuth = (role: StakeholderRole) => {
    if (isAuthenticated && currentUser) {
      const targetDashboard = getDashboardPathForRole(currentUser.role);
      router.push(targetDashboard);
      return;
    }
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await logout();
  };

  const dashboardUrl = currentUser ? getDashboardPathForRole(currentUser.role) : "/login";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        {/* Official Government of India Top Banner */}
        <div className="bg-[#0B2545] text-slate-100 text-xs py-1.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold tracking-wide">
                GOVERNMENT OF INDIA
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300 hidden sm:inline">
                Smart India Hackathon • Innovation Procurement Platform
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                GFR 2017 & GeM Aligned
              </span>
              <span className="text-slate-400 hidden md:inline">|</span>
              <span className="hidden md:inline hover:text-white cursor-pointer transition-colors">
                English
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo and Identity */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-lg bg-[#0B2545] flex items-center justify-center text-white shadow-xs group-hover:bg-[#133A6B] transition-colors">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                      GovInnovate
                    </span>
                    <Badge variant="gov" className="text-[10px] px-2 py-0">
                      SIH 2024
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tracking-tight">
                    Public Sector Innovation Procurement Gateway
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
              <Link
                href="/challenges"
                className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
              >
                Challenges
                <Badge variant="gov" className="text-[9px] py-0 px-1">Open</Badge>
              </Link>
              <Link
                href="/validations"
                className="hover:text-blue-900 transition-colors py-1 flex items-center gap-1"
              >
                Validations
              </Link>
              <Link
                href="/procurement"
                className="hover:text-blue-900 transition-colors py-1 flex items-center gap-1"
              >
                Procurement
                <Badge variant="success" className="text-[9px] py-0 px-1">GeM</Badge>
              </Link>
              <a
                href="/#lifecycle"
                className="hover:text-blue-900 transition-colors py-1"
              >
                Lifecycle
              </a>
              <a
                href="/#governance"
                className="hover:text-blue-900 transition-colors py-1"
              >
                Procurement Law Alignment
              </a>
              {(currentUser?.role === "GOVERNMENT" || currentUser?.role === "ADMIN") && (
                <>
                  <Link
                    href="/government/pilots"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                    Pilots Sandbox
                  </Link>
                  <Link
                    href="/government/validation"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Validation
                  </Link>
                  <Link
                    href="/government/procurement"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Procurement
                  </Link>
                  <Link
                    href="/government/contracts"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    Contracts
                  </Link>
                  <Link
                    href="/government/payments"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    Payments
                  </Link>
                  <Link
                    href="/government/scale-up"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Scale-Up
                    <Badge variant="gov" className="text-[9px] py-0 px-1">Step 9</Badge>
                  </Link>
                  <Link
                    href="/government/impact"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                    Impact
                  </Link>
                  <Link
                    href="/government/innovation-portfolio"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5 text-purple-600" />
                    Portfolio
                  </Link>
                </>
              )}
              {currentUser?.role === "PROCUREMENT_OFFICER" && (
                <>
                  <Link
                    href="/government/procurement"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Procurement
                  </Link>
                  <Link
                    href="/government/contracts"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    Contracts
                  </Link>
                  <Link
                    href="/government/payments"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    Payments
                  </Link>
                  <Link
                    href="/government/scale-up"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Scale-Up
                  </Link>
                </>
              )}
              {currentUser?.role === "STARTUP" && (
                <>
                  <Link
                    href="/startup/pilots"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                    My Pilots
                  </Link>
                  <Link
                    href="/startup/contracts"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    Contracts
                  </Link>
                  <Link
                    href="/startup/invoices"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    Invoices
                  </Link>
                  <Link
                    href="/startup/scale-up"
                    className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Scale-Up
                  </Link>
                </>
              )}
              {(currentUser?.role === "EXPERT" || currentUser?.role === "EXPERT_EVALUATOR") && (
                <Link
                  href="/expert/dashboard"
                  className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Expert Desk
                  <Badge variant="gov" className="text-[9px] py-0 px-1">Active</Badge>
                </Link>
              )}
              {(currentUser?.role === "VALIDATOR" || currentUser?.role === "INDEPENDENT_VALIDATOR") && (
                <Link
                  href="/validator/dashboard"
                  className="hover:text-blue-900 text-blue-900 font-semibold transition-colors py-1 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                  Validator Portal
                  <Badge variant="gov" className="text-[9px] py-0 px-1">Audits</Badge>
                </Link>
              )}
            </nav>

            {/* Actions: Logged-in Menu or Logged-out Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <Link href={dashboardUrl}>
                    <Button
                      variant="gov"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                      Dashboard
                    </Button>
                  </Link>

                  <Link href="/profile">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <User className="w-3.5 h-3.5" />
                      Profile
                    </Button>
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-[10px] font-bold">
                        {currentUser.full_name?.charAt(0) || "U"}
                      </div>
                      <span className="max-w-[120px] truncate">{currentUser.full_name}</span>
                      <Badge variant="gov" className="text-[9px] py-0 px-1.5">
                        {currentUser.role}
                      </Badge>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-150">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="font-semibold text-slate-900 truncate">{currentUser.full_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                        <Link
                          href={dashboardUrl}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                          Dashboard
                        </Link>
                        {(currentUser.role === "GOVERNMENT" || currentUser.role === "ADMIN") && (
                          <>
                            <Link
                              href="/government/pilots"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                              Pilots Sandbox
                            </Link>
                            <Link
                              href="/government/validation"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Validation Dashboard
                            </Link>
                            <Link
                              href="/government/procurement"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              Procurement Dossiers
                            </Link>
                            <Link
                              href="/government/contracts"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <Coins className="w-3.5 h-3.5 text-emerald-600" />
                              Contracts Portfolio
                            </Link>
                            <Link
                              href="/government/payments"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                              Payments & Invoices
                            </Link>
                            <Link
                              href="/government/scale-up"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                              Scale-Up & Replication
                            </Link>
                            <Link
                              href="/government/impact"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                              Impact Intelligence
                            </Link>
                            <Link
                              href="/government/innovation-portfolio"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <Globe className="w-3.5 h-3.5 text-purple-600" />
                              Innovation Pipeline
                            </Link>
                          </>
                        )}
                        {currentUser.role === "PROCUREMENT_OFFICER" && (
                          <>
                            <Link
                              href="/government/procurement"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              Procurement Dossiers
                            </Link>
                            <Link
                              href="/government/contracts"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <Coins className="w-3.5 h-3.5 text-emerald-600" />
                              Contracts Portfolio
                            </Link>
                            <Link
                              href="/government/payments"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                              Payments & Invoices
                            </Link>
                            <Link
                              href="/government/scale-up"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                              Scale-Up & Replication
                            </Link>
                          </>
                        )}
                        {(currentUser.role === "STARTUP" || currentUser.role === "ADMIN") && (
                          <>
                            <Link
                              href="/startup/pilots"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                              My Sandbox Pilots
                            </Link>
                            <Link
                              href="/startup/contracts"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <Coins className="w-3.5 h-3.5 text-emerald-600" />
                              Awarded Contracts
                            </Link>
                            <Link
                              href="/startup/invoices"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                              My Invoices
                            </Link>
                            <Link
                              href="/startup/scale-up"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                              Scale-Up Deployments
                            </Link>
                          </>
                        )}
                        {(currentUser.role === "VALIDATOR" || currentUser.role === "INDEPENDENT_VALIDATOR" || currentUser.role === "ADMIN") && (
                          <Link
                            href="/validator/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                            Validator Portal
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          My Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer border-t border-slate-100 mt-1"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAuth("GOVERNMENT")}
                    className="gap-1.5 font-medium text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                    id="btn-gov-portal"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    Government Portal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAuth("STARTUP")}
                    className="gap-1.5 font-medium text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                    id="btn-startup-portal"
                  >
                    <Rocket className="w-3.5 h-3.5 text-amber-600" />
                    Startup Portal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAuth("EXPERT")}
                    className="gap-1.5 font-medium text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                    id="btn-expert-portal"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    Expert Portal
                  </Button>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 font-medium text-xs text-slate-700 hover:text-blue-900"
                      id="btn-login-nav"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      variant="gov"
                      size="sm"
                      className="gap-1.5 font-medium text-xs"
                      id="btn-register-nav"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
              <Link
                href="/challenges"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-100"
              >
                Challenges
              </Link>
              <Link
                href="/validations"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-100"
              >
                Validations
              </Link>
              <Link
                href="/procurement"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-100"
              >
                Procurement
              </Link>
              <a
                href="/#lifecycle"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-100"
              >
                Lifecycle
              </a>
              <a
                href="/#governance"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-slate-100"
              >
                Procurement Law Alignment
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <div className="px-3 py-1 text-xs text-slate-600 font-semibold">
                    Signed in as {currentUser.full_name} ({currentUser.role})
                  </div>
                  <Link
                    href={dashboardUrl}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="gov" size="md" className="w-full justify-center gap-2 text-xs">
                      <LayoutDashboard className="w-4 h-4 text-amber-400" />
                      Dashboard
                    </Button>
                  </Link>
                  {(currentUser?.role === "GOVERNMENT" || currentUser?.role === "ADMIN") && (
                    <Link
                      href="/government/pilots"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button variant="outline" size="md" className="w-full justify-center gap-2 text-xs text-blue-900 border-blue-200 bg-blue-50/50">
                        <FlaskConical className="w-4 h-4 text-cyan-600" />
                        Pilots Sandbox Portfolio
                      </Button>
                    </Link>
                  )}
                  {currentUser?.role === "STARTUP" && (
                    <Link
                      href="/startup/pilots"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button variant="outline" size="md" className="w-full justify-center gap-2 text-xs text-blue-900 border-blue-200 bg-blue-50/50">
                        <FlaskConical className="w-4 h-4 text-cyan-600" />
                        My Sandbox Pilots
                      </Button>
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="outline" size="md" className="w-full justify-center gap-2 text-xs">
                      <User className="w-4 h-4" />
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center gap-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      variant="outline"
                      size="md"
                      className="justify-center gap-1 text-[11px] font-medium px-1"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuth("GOVERNMENT");
                      }}
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      Government
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      className="justify-center gap-1 text-[11px] font-medium px-1"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuth("STARTUP");
                      }}
                    >
                      <Rocket className="w-3.5 h-3.5 text-amber-600" />
                      Startup
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      className="justify-center gap-1 text-[11px] font-medium px-1"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuth("EXPERT");
                      }}
                    >
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      Expert
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button variant="outline" size="md" className="w-full justify-center gap-1.5 text-xs">
                        <LogIn className="w-3.5 h-3.5" />
                        Login
                      </Button>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button variant="gov" size="md" className="w-full justify-center gap-1.5 text-xs">
                        <UserPlus className="w-3.5 h-3.5" />
                        Register
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal for Quick Access */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultRole={authModalRole}
      />
    </>
  );
}
