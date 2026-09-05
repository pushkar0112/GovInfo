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

# Expert Evaluation & Pilot Sandbox Tranches
api_router.include_router(pilots.router, prefix="/pilots", tags=["Pilots & Evaluations"])

# Independent Validation & GeM Procurement Scale-up
api_router.include_router(procurements.router, prefix="", tags=["Validation & Procurement"])

