from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.schemas.pilot import (
    PilotCreateRequest,
    PilotUpdateRequest,
    PilotLifecycleActionRequest,
    PilotStatsResponse,
    PilotResponse,
    MilestoneCreateRequest,
    MilestoneUpdateRequest,
    MilestoneStatusUpdateRequest,
    MilestoneReviewRequest,
    MilestoneResponse,
    DeliverableResponse,
    DeliverableReviewRequest,
)
from app.services.pilot_management_service import PilotManagementService

router = APIRouter()


@router.get(
    "/stats",
    response_model=PilotStatsResponse,
    summary="Government Pilot Dashboard Statistics",
    description="Aggregate metrics on active, planning, and completed pilots, budgets, and overdue milestones.",
)
def get_government_pilot_stats(
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotStatsResponse:
    return PilotManagementService.get_pilot_stats(db, current_user)


@router.get(
    "",
    response_model=List[PilotResponse],
    summary="List Department Pilots",
    description="Retrieve all operational sandbox pilots under the government officer's departmental purview.",
)
def list_government_pilots(
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PLANNING, ACTIVE, PAUSED, COMPLETED, CANCELLED)"),
    search: Optional[str] = Query(None, description="Search keyword in pilot code, title, or location"),
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> List[PilotResponse]:
    return PilotManagementService.list_pilots(db, current_user, status_filter=status, search=search)


@router.post(
    "",
    response_model=PilotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Pilot from Shortlisted Application",
    description="Initiate an operational sandbox pilot for a shortlisted startup application.",
)
def create_pilot(
    payload: PilotCreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.create_pilot_from_application(db, current_user, payload)


@router.get(
    "/{pilot_id}",
    response_model=PilotResponse,
    summary="Get Pilot Dossier",
    description="Comprehensive 15-section operational pilot dossier with milestones and deliverables.",
)
def get_government_pilot_detail(
    pilot_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.get_pilot_by_id(db, current_user, pilot_id)


@router.put(
    "/{pilot_id}",
    response_model=PilotResponse,
    summary="Update Pilot Specifications",
    description="Modify pilot objectives, location, dates, or financial allocations.",
)
def update_government_pilot(
    pilot_id: str,
    payload: PilotUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.update_pilot(db, current_user, pilot_id, payload)


@router.post(
    "/{pilot_id}/actions",
    response_model=PilotResponse,
    summary="Execute Pilot Lifecycle Action",
    description="Transition pilot state (PROPOSE, APPROVE, REJECT, START, PAUSE, RESUME, COMPLETE, CANCEL).",
)
def execute_pilot_action(
    pilot_id: str,
    payload: PilotLifecycleActionRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotManagementService.lifecycle_action(db, current_user, pilot_id, payload)


@router.post(
    "/{pilot_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Milestone to Pilot",
    description="Define a new time-bound, weighted milestone in the operational roadmap.",
)
def add_pilot_milestone(
    pilot_id: str,
    payload: MilestoneCreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotManagementService.add_milestone(db, current_user, pilot_id, payload)


@router.put(
    "/{pilot_id}/milestones/{milestone_id}",
    response_model=MilestoneResponse,
    summary="Update Milestone",
    description="Modify milestone timeline, weighting, or scope specifications.",
)
def update_pilot_milestone(
    pilot_id: str,
    milestone_id: str,
    payload: MilestoneUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotManagementService.update_milestone(db, current_user, pilot_id, milestone_id, payload)


@router.patch(
    "/{pilot_id}/milestones/{milestone_id}/status",
    response_model=MilestoneResponse,
    summary="Update Milestone Operational Status",
    description="Directly override milestone operational status and completion percentage.",
)
def update_pilot_milestone_status(
    pilot_id: str,
    milestone_id: str,
    payload: MilestoneStatusUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotManagementService.update_milestone_status(db, current_user, pilot_id, milestone_id, payload)


@router.post(
    "/{pilot_id}/milestones/{milestone_id}/review",
    response_model=MilestoneResponse,
    summary="Review & Accept/Reject Milestone",
    description="Government formal acceptance or rejection of milestone completion.",
)
def review_pilot_milestone(
    pilot_id: str,
    milestone_id: str,
    payload: MilestoneReviewRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotManagementService.review_milestone(db, current_user, pilot_id, milestone_id, payload)


@router.post(
    "/{pilot_id}/deliverables/{deliverable_id}/review",
    response_model=DeliverableResponse,
    summary="Review Deliverable Proof Document",
    description="Accept or reject a technical deliverable submitted by the startup.",
)
def review_deliverable(
    pilot_id: str,
    deliverable_id: str,
    payload: DeliverableReviewRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> DeliverableResponse:
    return PilotManagementService.review_deliverable(db, current_user, pilot_id, deliverable_id, payload)


@router.get(
    "/{pilot_id}/deliverables/{deliverable_id}/download",
    summary="Download Deliverable Document",
    description="Stream technical evidence or report file submitted for a milestone.",
)
def download_deliverable(
    pilot_id: str,
    deliverable_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
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
