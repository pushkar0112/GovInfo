export type StakeholderRole =
  | "GOVERNMENT"
  | "STARTUP"
  | "EXPERT"
  | "VALIDATOR"
  | "PROCUREMENT_OFFICER"
  | "ADMIN"
  | "EXPERT_EVALUATOR"
  | "INDEPENDENT_VALIDATOR";

export interface LifecycleStep {
  id: string;
  stepNumber: number;
  name: string;
  shortDesc: string;
  fullDesc: string;
  stakeholder: string;
  legalBasis: string;
}

export interface PortalCard {
  role: StakeholderRole;
  title: string;
  badge: string;
  description: string;
  actionLabel: string;
  href: string;
  features: string[];
}
