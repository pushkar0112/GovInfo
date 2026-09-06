"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  FileCheck2,
  Scale,
  Building2,
  Rocket,
  Check,
  Award,
  Layers,
  FileText,
  CreditCard,
  AlertCircle,
  TrendingUp,
  MapPin,
  Activity,
} from "lucide-react";

export interface TraceabilityStageItem {
  stage_id: string;
  stage_name: string;
  code?: string | null;
  title?: string | null;
  status: string;
  completed: boolean;
  url?: string | null;
  timestamp?: string | null;
  details?: Record<string, any>;
}

interface ProcurementTraceabilityProps {
  stages?: TraceabilityStageItem[];
  traceability?: { stages?: TraceabilityStageItem[]; [key: string]: any } | null;
  currentStageId?: string;
  title?: string;
}

const STAGE_ICONS: Record<string, any> = {
  CHALLENGE: Building2,
  APPLICATION: Rocket,
  EVALUATION: Award,
  PILOT: Layers,
  VALIDATION: Shield,
  DECISION: Scale,
  PROCUREMENT: FileCheck2,
  CONTRACT: FileText,
  MILESTONES: CheckCircle2,
  PAYMENTS: CreditCard,
  SCALE_DECISION: Scale,
  SCALE_PLAN: TrendingUp,
  DEPLOYMENT: MapPin,
  IMPACT: Activity,
};

export function ProcurementTraceability({
  stages: propStages,
  traceability,
  currentStageId,
  title = "GovInnovate End-to-End Audit & Traceability Chain",
}: ProcurementTraceabilityProps) {
  const stages = propStages || traceability?.stages || [];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Statutory Evidence & Audit Lineage
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">{title}</h3>
          <p className="text-xs text-slate-500">
            Immutable trace from Challenge Inception through Pilot Validation to Contract Settlement
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 self-start sm:self-auto">
          GFR 2017 Audit Compliant
        </Badge>
      </div>

      {/* Interactive Horizontal / Responsive Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-13 gap-2.5">
        {stages.map((st, idx) => {
          const Icon = STAGE_ICONS[st.stage_id] || CheckCircle2;
          const isCurrent = currentStageId === st.stage_id;
          const isDone = st.completed;

          const cardContent = (
            <div
              className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all h-full ${
                isCurrent
                  ? "bg-blue-50/70 border-[#0B2545] shadow-xs ring-1 ring-[#0B2545]/20"
                  : isDone
                  ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300"
                  : "bg-slate-50/60 border-slate-200 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-400">
                    Step {idx + 1}
                  </span>
                  {isDone ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-1 text-slate-800 font-semibold text-xs leading-tight">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isDone ? "text-emerald-600" : isCurrent ? "text-blue-700" : "text-slate-400"}`} />
                  <span className="truncate">{st.stage_name}</span>
                </div>

                {st.code && (
                  <div className="font-mono text-[10px] text-slate-600 truncate mb-1">
                    {st.code}
                  </div>
                )}

                {st.title && (
                  <div className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                    {st.title}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <Badge
                  variant={isDone ? "success" : isCurrent ? "default" : "secondary"}
                  className="text-[9px] px-1.5 py-0 capitalize"
                >
                  {st.status.toLowerCase().replace(/_/g, " ")}
                </Badge>
                {st.url && (
                  <ExternalLink className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                )}
              </div>
            </div>
          );

          return st.url ? (
            <Link key={st.stage_id} href={st.url} className="group">
              {cardContent}
            </Link>
          ) : (
            <div key={st.stage_id}>{cardContent}</div>
          );
        })}
      </div>
    </div>
  );
}
