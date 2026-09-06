from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.models.challenge import Challenge
from app.models.application import Application
from app.models.pilot import Pilot

router = APIRouter()


@router.get(
    "/government-overview",
    summary="Government Portal Dashboard Overview",
    description="Protected endpoint for Government Officials to view department stats and active challenges.",
)
def government_overview(
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    dept_id = current_user.department_id
    challenges_count = (
        db.query(Challenge).filter(Challenge.department_id == dept_id).count()
        if dept_id
        else 0
    )

    return {
        "portal": "Government Portal",
        "user_name": current_user.full_name,
        "department": current_user.department.name if current_user.department else None,
        "role": current_user.role.value,
        "metrics": {
            "active_challenges": challenges_count,
            "proposals_under_review": 0,
            "active_pilots": 0,
            "completed_validations": 0,
        },
    }


@router.get(
    "/startup-overview",
    summary="Startup Portal Dashboard Overview",
    description="Protected endpoint for DPIIT Startups to view sandbox pilots and applications.",
)
def startup_overview(
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    startup_id = current_user.startup_id
    apps_count = (
        db.query(Application).filter(Application.startup_id == startup_id).count()
        if startup_id
        else 0
    )

    return {
        "portal": "Startup Portal",
        "user_name": current_user.full_name,
        "company": current_user.startup.company_name if current_user.startup else None,
        "dpiit_status": "RECOGNIZED" if current_user.startup and current_user.startup.dpiit_recognized else "PENDING",
        "role": current_user.role.value,
        "metrics": {
            "submitted_applications": apps_count,
            "shortlisted_for_pilot": 0,
            "active_sandbox_pilots": 0,
            "verified_kpis": 0,
        },
    }
