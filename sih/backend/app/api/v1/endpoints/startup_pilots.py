from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.schemas.pilot import (
    PilotResponse,
    PilotStatsResponse,
    PilotLifecycleActionRequest,
    MilestoneResponse,
    MilestoneStatusUpdateRequest,
    DeliverableResponse,
)
from app.services.pilot_management_service import PilotManagementService

router = APIRouter()


@router.get(
    "/stats",
    response_model=PilotStatsResponse,
    summary="Startup Pilot Portfolio Statistics",
    description="Aggregate metrics on the startup's active, planning, and completed pilots.",
)
def get_startup_pilot_stats(
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotStatsResponse:
    return PilotManagementService.get_pilot_stats(db, current_user)


@router.get(
    "",
    response_model=List[PilotResponse],
    summary="List Startup Sandbox Pilots",
    description="Retrieve all operational pilots awarded to the authenticated startup.",
)
def list_startup_pilots(
    status: Optional[str] = Query(None, description="Filter by status (PLANNING, ACTIVE, PAUSED, COMPLETED)"),
    search: Optional[str] = Query(None, description="Search keyword in pilot code or title"),
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> List[PilotResponse]:
    return PilotManagementService.list_pilots(db, current_user, status_filter=status, search=search)


@router.get(
    "/{pilot_id}",
    response_model=PilotResponse,
    summary="Get Startup Pilot Overview",
    description="Detailed operational roadmap, milestone progress, and deliverable submission status.",
)
def get_startup_pilot_detail(
    pilot_id: str,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.get_pilot_by_id(db, current_user, pilot_id)


@router.post(
    "/{pilot_id}/actions",
    response_model=PilotResponse,
    summary="Propose Pilot for Department Approval",
    description="Allows startup to submit a draft pilot plan for government nodal review.",
)
def execute_startup_pilot_action(
    pilot_id: str,
    payload: PilotLifecycleActionRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.lifecycle_action(db, current_user, pilot_id, payload)


@router.patch(
    "/{pilot_id}/milestones/{milestone_id}/status",
    response_model=MilestoneResponse,
    summary="Update Milestone Progress",
    description="Allows startup to mark milestone as IN_PROGRESS or SUBMITTED, update completion percentage, or flag blockers.",
)
def update_startup_milestone_progress(
    pilot_id: str,
    milestone_id: str,
    payload: MilestoneStatusUpdateRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotManagementService.update_milestone_status(db, current_user, pilot_id, milestone_id, payload)


@router.post(
    "/{pilot_id}/milestones/{milestone_id}/deliverables",
    response_model=DeliverableResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Milestone Deliverable",
    description="Upload report, technical proof, telemetry archive, or document for a milestone. Automatically versions upon resubmission.",
)
def upload_milestone_deliverable(
    pilot_id: str,
    milestone_id: str,
    title: str = Form(..., min_length=3, max_length=255),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> DeliverableResponse:
    return PilotManagementService.upload_deliverable(
        db,
        current_user,
        pilot_id=pilot_id,
        milestone_id=milestone_id,
        title=title,
        description=description,
        upload_file=file,
    )


@router.get(
    "/{pilot_id}/deliverables/{deliverable_id}/download",
    summary="Download Submitted Deliverable",
    description="Stream technical deliverable document uploaded by the startup.",
)
def download_startup_deliverable(
    pilot_id: str,
    deliverable_id: str,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    file_path, file_name, mime_type = PilotManagementService.get_deliverable_file(
        db, current_user, pilot_id, deliverable_id
    )
    return FileResponse(
        path=str(file_path),
        filename=file_name,
        media_type=mime_type,
    )
