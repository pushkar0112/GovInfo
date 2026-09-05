"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, AuthUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Users,
  Building2,
  Sliders,
  FileSpreadsheet,
  LogOut,
  User,
  Shield,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type AdminTab = "users" | "organizations" | "config" | "audit";

interface AuditLogItem {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  metadata?: string;
  created_at?: string;
}

function AdminDashboardContent() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      const [users, logs] = await Promise.all([
        apiRequest<AuthUser[]>("/api/v1/auth/admin/users").catch(() => []),
        apiRequest<AuditLogItem[]>("/api/v1/auth/admin/audit-logs").catch(() => []),
      ]);
      setUsersList(users);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <header className="bg-[#0B2545] text-white py-4 px-4 sm:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight">
                  System Administration Console
                </h1>
                <Badge variant="gov" className="text-[10px] bg-rose-400/20 text-rose-200 border-rose-400/30">
                  Superadmin Security Guard
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                National Innovation Procurement Platform • Core Infrastructure Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5">
                <User className="w-3.5 h-3.5" />
                Profile
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-rose-900/30 text-rose-200 border-rose-500/30 hover:bg-rose-900/50 text-xs gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              System Control & Audit Desk
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Welcome, {currentUser.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
              <span>Account: <strong>{currentUser.email}</strong></span>
              <span>•</span>
              <Badge variant="gov" className="text-[10px] bg-rose-100 text-rose-800 border-rose-200">
                ADMINISTRATOR
              </Badge>
              <span>•</span>
              <span>Full System Clearance</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdminData}
              disabled={loadingData}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              Refresh Telemetry
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "users", label: "Users Management", icon: Users },
            { id: "organizations", label: "Organizations", icon: Building2 },
            { id: "config", label: "System Configuration", icon: Sliders },
            { id: "audit", label: "Audit Logs", icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#0B2545] text-[#0B2545] font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0B2545]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registered Platform Stakeholders</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live directory of accounts registered across government, startups, and evaluation panels.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {usersList.length} Accounts Registered
                </Badge>
              </div>

              {loadingData ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                </div>
              ) : usersList.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="py-3 px-4">Name & Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Organization</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{u.full_name}</div>
                              <div className="text-[11px] text-slate-500">{u.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="gov" className="text-[10px]">
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {u.organization_name || u.department_name || u.company_name || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="text-rose-600 font-medium">Disabled</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No users registered yet.</h4>
                </div>
              )}
            </div>
          )}

          {activeTab === "organizations" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Partner Ministries, Labs & Enterprises</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional directories for verified central ministries, state departments, and testing laboratories.
                </p>
              </div>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Building2 className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No custom organization structures configured.</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Ministry hierarchies, DPIIT startup linkages, and STQC lab accreditations will be managed here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Platform System Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Security rules, token TTL, Swiss challenge evaluation thresholds, and GFR 2017 parameters.
                </p>
              </div>
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl flex flex-col items-center">
                <Sliders className="w-10 h-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Default Configuration Active</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  JWT Access TTL: 60 mins • Refresh TTL: 7 days • Bcrypt rounds: 12 • Audit Trails: Enabled
                </p>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time security log tracking registrations, logins, token renewals, and authorization events.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {auditLogs.length} Events Logged
                </Badge>
              </div>

              {loadingData ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Entity</th>
                          <th className="py-3 px-4">IP Address</th>
                          <th className="py-3 px-4">Audit Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="gov" className="text-[10px]">
                                {log.action}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ""}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                              {log.ip_address || "127.0.0.1"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[10px] max-w-xs truncate">
                              {log.metadata || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No audit events recorded yet.</h4>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
