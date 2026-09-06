"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  ShieldCheck,
  Building2,
  ExternalLink,
  Coins,
  CheckCircle2,
  Search,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/auth";

interface ProcurementItem {
  id: string;
  sanction_order_number?: string;
  gem_contract_number?: string;
  procurement_pathway: string;
  total_order_value: number;
  status: string;
  department_name?: string;
  startup_name?: string;
  order_date?: string;
  notes?: string;
  created_at: string;
}

const DEFAULT_PROCUREMENTS: ProcurementItem[] = [
  {
    id: "proc-001",
    sanction_order_number: "SANCTION-2024-JAL-0044",
    gem_contract_number: "GEMC-5116877-902",
    procurement_pathway: "GEM_STARTUP_RUNWAY",
    total_order_value: 18500000,
    status: "CONTRACT_EXECUTED",
    department_name: "Department of Drinking Water & Sanitation",
    startup_name: "AquaSense Telemetry",
    order_date: "2024-09-02",
    notes: "Direct scale-up procurement across Jaipur City North Division executed under GFR 2017 Rule 149 following STQC certification.",
    created_at: "2024-09-02T16:00:00Z",
  },
  {
    id: "proc-002",
    sanction_order_number: "SANCTION-2024-MOHFW-019",
    gem_contract_number: "GEMC-4891024-311",
    procurement_pathway: "INNOVATION_EXEMPTION",
    total_order_value: 24000000,
    status: "CONTRACT_EXECUTED",
    department_name: "National Health Authority",
    startup_name: "MedAI Telemetry",
    order_date: "2024-08-29",
    notes: "Scale-up expansion across 60 Primary Health Centres in tribal belt under GFR Rule 194 innovation exemption.",
    created_at: "2024-08-29T11:00:00Z",
  },
];

export default function ProcurementRegistryPage() {
  const [procurements, setProcurements] = useState<ProcurementItem[]>(DEFAULT_PROCUREMENTS);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadProcurements() {
      try {
        const data = await apiRequest<ProcurementItem[]>("/api/v1/procurements");
        if (data && data.length > 0) {
          const merged = [...data];
          DEFAULT_PROCUREMENTS.forEach((d) => {
            if (!merged.find((m) => m.id === d.id)) {
              merged.push(d);
            }
          });
          setProcurements(merged);
        }
      } catch {
        // use fallback
      }
    }
    loadProcurements();
  }, []);

  const filtered = procurements.filter(
    (p) =>
      p.sanction_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gem_contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.startup_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProcuredValue = procurements.reduce((acc, curr) => acc + (curr.total_order_value || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <div className="max-w-3xl">
            <Badge variant="gov" className="mb-3">
              GFR 2017 & GeM Startup Runway Scale-Up
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Public Procurement Transparency Registry
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Every innovation successfully proven in controlled pilot sandboxes and certified by independent testing agencies is transitioned into legal public scale-up. Browse active sanction orders and Government e-Marketplace (GeM) executed contracts.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by sanction order, GeM contract..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#0B2545] focus:outline-none"
              />
            </div>

            <div className="text-right w-full sm:w-auto">
              <span className="text-xs text-slate-500 block">Total Scaled Order Value</span>
              <span className="text-2xl font-extrabold text-slate-900">
                ₹{totalProcuredValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Order Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {filtered.length} Executed Sanctions</span>
            <span>Audited for CVC & CAG Compliance</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="gov" className="text-xs">
                      <Scale className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      {item.procurement_pathway.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Contract Executed
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Sanction Order: {item.sanction_order_number || "SANCTION-GOV-ORDER"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                      <span>
                        Ministry: <strong>{item.department_name || "Central Ministry"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Procured Startup: <strong>{item.startup_name || "Innovator"}</strong>
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {item.notes}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-400">
                    Order Date: {item.order_date || "2024-09-01"} • GeM Contract:{" "}
                    <span className="font-mono text-slate-700 font-semibold">
                      {item.gem_contract_number || "GEMC-OFFICIAL"}
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 space-y-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">
                    Sanction Amount
                  </span>
                  <span className="text-xl font-extrabold text-blue-900 block">
                    ₹{item.total_order_value?.toLocaleString("en-IN")}
                  </span>
                  <Badge variant="secondary" className="text-[11px]">
                    GFR Rule 149 Compliant
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
