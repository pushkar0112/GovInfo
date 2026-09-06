import React from "react";
import { Badge } from "@/components/ui/badge";
import { Server, Layout, Database, Layers, Lock, ShieldCheck } from "lucide-react";

export function ArchitectureOverview() {
  return (
    <section id="architecture" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="gov" className="mb-3">
            System Architecture
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise Architecture & Tech Stack
          </h2>
          <p className="mt-3 text-base text-slate-600">
            A modular monorepo engineered for high-security public sector workflows, role-based authorization, and containerized deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Layer */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-900/10 text-[#0B2545] flex items-center justify-center mb-4">
              <Layout className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900">Frontend Tier</h3>
              <Badge variant="secondary" className="text-[10px]">Port 3000</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Next.js 16 (App Router) + TypeScript + Tailwind CSS with government-grade design, accessible components, and TanStack Query state hydration.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Next.js 16</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">TypeScript</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Tailwind CSS</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Zod</span>
            </div>
          </div>

          {/* Backend Layer */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/10 text-emerald-800 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900">Backend API Tier</h3>
              <Badge variant="secondary" className="text-[10px]">Port 8000</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              FastAPI REST architecture with Pydantic validation, structured settings, API versioning (/api/v1), and comprehensive RBAC middleware.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">FastAPI</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Pydantic v2</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">SQLAlchemy 2.0</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Uvicorn</span>
            </div>
          </div>

          {/* Database Layer */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-amber-900/10 text-amber-800 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900">Database Tier</h3>
              <Badge variant="secondary" className="text-[10px]">Port 5432</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              PostgreSQL 16 with UUID primary keys across 12 lifecycle entities, immutable audit logging, and Alembic version migration tracking.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">PostgreSQL 16</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Alembic</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">UUIDv4 PKs</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Audit Logs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
