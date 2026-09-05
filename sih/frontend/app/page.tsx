import React from "react";
import { Hero } from "@/components/landing/Hero";
import { LifecycleFlow } from "@/components/landing/LifecycleFlow";
import { PortalsSection } from "@/components/landing/PortalsSection";
import { GovernanceSection } from "@/components/landing/GovernanceSection";
import { ArchitectureOverview } from "@/components/landing/ArchitectureOverview";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <Hero />
      <LifecycleFlow />
      <PortalsSection />
      <GovernanceSection />
      <ArchitectureOverview />
    </div>
  );
}
