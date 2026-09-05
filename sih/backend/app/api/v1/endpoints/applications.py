from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.core.storage import storage_service
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.schemas.application import (
    ApplicationDraftSaveRequest,
    ApplicationSubmitRequest,
    ApplicationResponse,
    ApplicationListResponse,
    DocumentMetadata,
)
from app.services.application_service import ApplicationService

router = APIRouter()


# ==============================================================================
# Application Lifecycle Endpoints (Startup Perspective)
# ==============================================================================

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or save application draft",
    description="Saves partial or complete application drafts in PostgreSQL. Enforces duplicate prevention.",
)
def save_draft(
    payload: ApplicationDraftSaveRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.create_or_save_draft(db, current_user, payload)


@router.get(
    "",
    response_model=ApplicationListResponse,
    summary="List startup's applications",
    description="Returns all applications submitted or drafted by the authenticated startup.",
)
def list_my_applications(
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, SUBMITTED, UNDER_REVIEW, etc.)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationListResponse:
    return ApplicationService.list_startup_applications(db, current_user, status_filter=status, page=page, page_size=page_size)


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get application detail",
    description="Fetches detailed application dossier. Protected by ownership and departmental RBAC.",
)
def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.get_application_detail(db, current_user, application_id)


@router.put(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Update application draft",
)
def update_draft(
    application_id: str,
    payload: ApplicationDraftSaveRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.create_or_save_draft(db, current_user, payload)


@router.post(
    "/{application_id}/submit",
    response_model=ApplicationResponse,
    summary="Submit technical application",
    description="Validates completeness, positive budget, non-expired deadline, and snapshots eligibility.",
)
def submit_application(
    application_id: str,
    payload: Optional[ApplicationSubmitRequest] = None,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.submit_application(db, current_user, application_id, payload)


@router.post(
    "/{application_id}/withdraw",
    response_model=ApplicationResponse,
    summary="Withdraw application",
    description="Allows startup to withdraw a submitted proposal before final selection.",
)
def withdraw_application(
    application_id: str,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.withdraw_application(db, current_user, application_id)


# ==============================================================================
# Supporting Document Uploads & Secure Download
# ==============================================================================

@router.post(
    "/upload-document",
    response_model=DocumentMetadata,
    status_code=status.HTTP_201_CREATED,
    summary="Upload supporting document",
    description="Accepts PDF, DOCX, XLSX, PNG, JPG (max 10MB). Stores securely on server.",
)
def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
) -> DocumentMetadata:
    meta = storage_service.save_file(file)
    return DocumentMetadata(
        document_id=meta["document_id"],
        original_filename=meta["original_filename"],
        file_size=meta["file_size"],
        mime_type=meta["mime_type"],
        file_url=meta["file_url"],
    )


@router.get(
    "/documents/{document_id}/download",
    summary="Download supporting document",
    description="Streams authenticated file download.",
)
def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
):
    file_path = storage_service.get_file_path(document_id)
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )
