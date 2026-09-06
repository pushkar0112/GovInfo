"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { StakeholderRole } from "@/types";
import { getDashboardPathForRole } from "@/lib/auth";
import { Shield, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: StakeholderRole[];
}

function isRoleAllowed(userRole: string, allowedRoles?: StakeholderRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const roleUpper = userRole.toUpperCase();
  const normalizedUser =
    roleUpper === "EXPERT_EVALUATOR"
      ? "EXPERT"
      : roleUpper === "INDEPENDENT_VALIDATOR"
      ? "VALIDATOR"
      : roleUpper;

  if (normalizedUser === "ADMIN") return true;

  return allowedRoles.some((r) => {
    const allowedUpper = (r as string).toUpperCase();
    const normalizedAllowed =
      allowedUpper === "EXPERT_EVALUATOR"
        ? "EXPERT"
        : allowedUpper === "INDEPENDENT_VALIDATOR"
        ? "VALIDATOR"
        : allowedUpper;
    return normalizedUser === normalizedAllowed;
  });
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !currentUser) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const allowed = isRoleAllowed(currentUser.role, allowedRoles);
      if (!allowed) {
        const fallbackDashboard = getDashboardPathForRole(currentUser.role);
        router.replace(fallbackDashboard);
      }
    }
  }, [isLoading, isAuthenticated, currentUser, allowedRoles, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0B2545] text-amber-400 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">GovInnovate Security Gateway</h3>
          <p className="text-xs text-slate-500">Verifying session credentials and RBAC clearance...</p>
          <Loader2 className="w-5 h-5 text-blue-900 animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !isRoleAllowed(currentUser.role, allowedRoles)) {
    return null;
  }

  return <>{children}</>;
}
