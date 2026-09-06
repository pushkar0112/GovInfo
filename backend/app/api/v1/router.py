from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    portal,
    challenges,
    pilots,
    procurements,
    startups,
    applications,
    government_applications,
    evaluation_criteria,
    expert_management,
    expert_portal,
    government_pilots,
    startup_pilots,
    kpi_management,
    validator_portal,
    government_validation,
    government_procurement,
    contracts_management,
    payments_management,
    startup_procurement,
    procurement_pathways,
    procurement_officer_portal,
    government_scale_up,
    startup_scale_up,
    portfolio_impact,
)

api_router = APIRouter()

# Health and diagnostics
api_router.include_router(health.router, tags=["Health"])

# Authentication & RBAC
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Portal Dashboards (Protected by Role Guards)
api_router.include_router(portal.router, prefix="/portal", tags=["Portals"])

# Challenges & Challenge Management
api_router.include_router(challenges.router, prefix="/challenges", tags=["Challenges & Applications"])

# Startup Profile, Discovery, and Eligibility Screening
api_router.include_router(startups.router, prefix="/startups", tags=["Startups & Discovery"])

# Application Submission & Management
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])

# Government Application Inbox & Review
api_router.include_router(government_applications.router, prefix="/government/applications", tags=["Government Applications"])

# Step 5: Evaluation Criteria & Transparent Scoring
api_router.include_router(evaluation_criteria.router, tags=["Evaluation Criteria"])

# Step 5: Expert Management, Assignment & Rankings
api_router.include_router(expert_management.router, tags=["Expert Management & Government Scoring"])

# Step 5: Independent Expert Evaluation Portal
api_router.include_router(expert_portal.router, tags=["Expert Evaluation Portal"])

# Step 6: Operational Pilot Management & Milestone Tracking (Government)
api_router.include_router(government_pilots.router, prefix="/government/pilots", tags=["Government Pilot Management"])

# Step 6: Operational Pilot Management & Milestone Tracking (Startup)
api_router.include_router(startup_pilots.router, prefix="/startup/pilots", tags=["Startup Pilot Management"])

# Step 7: KPI Measurement & Telemetry Tracking
api_router.include_router(kpi_management.router, tags=["KPI Measurement & Telemetry"])

# Step 7: Independent Validator Portal
api_router.include_router(validator_portal.router, tags=["Independent Validator Portal"])

# Step 7: Government Validation & Pilot Outcome Assessment
api_router.include_router(government_validation.router, tags=["Government Validation & Pilot Outcome Assessment"])

# Step 8: Government Procurement Transitions & Decisions
api_router.include_router(government_procurement.router, prefix="/government", tags=["Government Procurement Transitions"])

# Step 8: Government Contracts & Milestones Management
api_router.include_router(contracts_management.router, prefix="", tags=["Contracts Management"])
api_router.include_router(contracts_management.router, prefix="/government", tags=["Government Contracts Management"])

# Step 8: Government Payment Tranches & Invoices Review
api_router.include_router(payments_management.router, prefix="/government", tags=["Government Payments & Invoices"])

# Step 8: Startup Procurement, Contracts & Invoicing
api_router.include_router(startup_procurement.router, prefix="/startup", tags=["Startup Procurement & Invoicing"])

# Step 8: Procurement Pathways Configuration
api_router.include_router(procurement_pathways.router, prefix="/procurement", tags=["Procurement Pathways"])

# Step 8: Procurement Officer Portal Command Center
api_router.include_router(procurement_officer_portal.router, prefix="/procurement-officer", tags=["Procurement Officer Portal"])

# Expert Evaluation & Pilot Sandbox Tranches (Legacy)
api_router.include_router(pilots.router, prefix="/pilots", tags=["Pilots & Evaluations"])

# Independent Validation & GeM Procurement Scale-up
api_router.include_router(procurements.router, prefix="", tags=["Validation & Procurement"])

# Step 9: Scale-Up, Replication & Impact Management (Government)
api_router.include_router(government_scale_up.router, prefix="/government", tags=["Government Scale-Up & Replication"])

# Step 9: Scale-Up Operations & Deployment Updates (Startup)
api_router.include_router(startup_scale_up.router, prefix="/startup", tags=["Startup Scale-Up Operations"])

# Step 9: Portfolio Impact & Executive Innovation Funnel
api_router.include_router(portfolio_impact.router, prefix="/government", tags=["Portfolio Impact & Innovation Funnel"])
api_router.include_router(portfolio_impact.router, prefix="", tags=["Portfolio Impact & Innovation Funnel (Root)"])


