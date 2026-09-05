import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from fastapi import HTTPException, status

from app.core.security import UserRole
from app.models.user import User
from app.models.startup import Startup
from app.models.challenge import Challenge, ChallengeStatus
from app.models.department import Department
from app.models.application import Application, ApplicationStatus
from app.models.audit_log import AuditLog
from app.schemas.application import (
    ApplicationDraftSaveRequest,
    ApplicationSubmitRequest,
    ApplicationStatusUpdateRequest,
    ApplicationResponse,
    ApplicationListResponse,
    DocumentMetadata,
)
from app.services.startup_service import StartupService, log_audit

logger = logging.getLogger("govinnovate.application_service")


class ApplicationService:

    @classmethod
    def generate_application_code(cls, db: Session) -> str:
        """
        Atomically generates unique sequential application code: APP-YYYY-NNNN.
        """
        current_year = datetime.now(timezone.utc).year
        prefix = f"APP-{current_year}-"

        latest_app = (
            db.query(Application)
            .filter(Application.application_code.like(f"{prefix}%"))
            .order_by(desc(Application.application_code))
            .first()
        )

        if latest_app and latest_app.application_code:
            try:
                suffix = latest_app.application_code.split("-")[-1]
                next_seq = int(suffix) + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1

        return f"{prefix}{next_seq:04d}"

    @classmethod
    def _parse_documents(cls, raw_json: Optional[str]) -> List[DocumentMetadata]:
        if not raw_json:
            return []
        try:
            items = json.loads(raw_json)
            if isinstance(items, list):
                docs = []
                for item in items:
                    docs.append(DocumentMetadata(
                        document_id=item.get("document_id", ""),
                        original_filename=item.get("original_filename", "document"),
                        file_size=item.get("file_size", 0),
                        mime_type=item.get("mime_type", "application/octet-stream"),
                        file_url=item.get("file_url", ""),
                        uploaded_at=item.get("uploaded_at"),
                    ))
                return docs
            return []
        except Exception:
            return []

    @classmethod
    def _parse_snapshot(cls, raw_json: Optional[str]) -> Optional[Dict[str, Any]]:
        if not raw_json:
            return None
        try:
            return json.loads(raw_json)
        except Exception:
            return None

    @classmethod
    def build_application_response(cls, app: Application) -> ApplicationResponse:
        challenge = app.challenge
        startup = app.startup
        department = challenge.department if challenge else None

        docs = cls._parse_documents(app.supporting_documents)
        snapshot = cls._parse_snapshot(app.eligibility_snapshot)

        return ApplicationResponse(
            id=app.id,
            application_code=app.application_code,
            challenge_id=app.challenge_id,
            challenge_title=challenge.title if challenge else None,
            challenge_code=challenge.challenge_code if challenge else None,
            department_id=challenge.department_id if challenge else None,
            department_name=department.name if department else None,
            startup_id=app.startup_id,
            startup_name=startup.display_name if startup else None,
            company_name=startup.company_name if startup else None,
            status=app.status,
            proposal_title=app.proposal_title,
            executive_summary=app.executive_summary or app.proposal_summary,
            proposal_summary=app.proposal_summary or app.executive_summary,
            problem_understanding=app.problem_understanding,
            proposed_solution=app.proposed_solution,
            technical_approach=app.technical_approach,
            expected_outcomes=app.expected_outcomes,
            implementation_plan=app.implementation_plan,
            pilot_plan=app.pilot_plan,
            timeline_days=app.timeline_days,
            risks=app.risks,
            dependencies=app.dependencies,
            team_capabilities=app.team_capabilities,
            previous_deployments=app.previous_deployments,
            estimated_cost=app.estimated_cost,
            requested_budget=app.requested_budget,
            data_requirements=app.data_requirements,
            security_approach=app.security_approach,
            ip_approach=app.ip_approach,
            supporting_documents=docs,
            eligibility_snapshot=snapshot,
            review_notes=app.review_notes,
            submitted_at=app.submitted_at,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )

    @classmethod
    def create_or_save_draft(
        cls, db: Session, current_user: User, payload: ApplicationDraftSaveRequest
    ) -> ApplicationResponse:
        """
        Creates or updates a draft application in PostgreSQL.
        Prevents duplicate active applications.
        """
        startup = StartupService.get_or_create_profile(db, current_user)

        challenge = db.query(Challenge).filter(Challenge.id == payload.challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target challenge not found.",
            )

        if challenge.status in (ChallengeStatus.CLOSED.value, ChallengeStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Challenge is {challenge.status} and cannot accept applications.",
            )

        # Duplicate Application Prevention
        existing_app = (
            db.query(Application)
            .filter(
                Application.challenge_id == challenge.id,
                Application.startup_id == startup.id,
            )
            .first()
        )

        if existing_app:
            if existing_app.status in (
                ApplicationStatus.SUBMITTED.value,
                ApplicationStatus.UNDER_REVIEW.value,
                ApplicationStatus.SHORTLISTED.value,
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"You already have an active application for this challenge ({existing_app.application_code}).",
                )
            app = existing_app
        else:
            app = Application(
                application_code=cls.generate_application_code(db),
                challenge_id=challenge.id,
                startup_id=startup.id,
                submitted_by=current_user.id,
                status=ApplicationStatus.DRAFT.value,
            )
            db.add(app)

        # Update draft fields
        data = payload.model_dump(exclude_unset=True)
        data.pop("challenge_id", None)

        if "supporting_documents" in data and data["supporting_documents"] is not None:
            docs_json = [d.model_dump() if hasattr(d, "model_dump") else d for d in data["supporting_documents"]]
            app.supporting_documents = json.dumps(docs_json, default=str)
            data.pop("supporting_documents", None)

        for field, val in data.items():
            if hasattr(app, field):
                setattr(app, field, val)

        app.sync_legacy_fields()
        db.commit()
        db.refresh(app)

        log_audit(db, current_user.id, "application_created" if not existing_app else "application_updated", "Application", app.id, {"status": app.status})

        return cls.build_application_response(app)

    @classmethod
    def submit_application(
        cls, db: Session, current_user: User, application_id: str, payload: Optional[ApplicationSubmitRequest] = None
    ) -> ApplicationResponse:
        """
        Validates completeness, eligibility, deadline, and official submission.
        """
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        # Check ownership
        startup = StartupService.get_or_create_profile(db, current_user)
        if app.startup_id != startup.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only submit your own startup's application.",
            )

        if app.status != ApplicationStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application is currently in '{app.status}' status and cannot be re-submitted.",
            )

        challenge = app.challenge
        if not challenge or challenge.status != ChallengeStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Applications can only be submitted to PUBLISHED challenges.",
            )

        # Deadline validation
        if challenge.application_deadline:
            now_utc = datetime.now(timezone.utc)
            deadline = challenge.application_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if now_utc > deadline:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Applications for this challenge are closed because the deadline has passed.",
                )

        # Update fields if payload provided
        if payload:
            data = payload.model_dump(exclude_unset=True)
            data.pop("challenge_id", None)
            if "supporting_documents" in data and data["supporting_documents"] is not None:
                docs_json = [d.model_dump() if hasattr(d, "model_dump") else d for d in data["supporting_documents"]]
                app.supporting_documents = json.dumps(docs_json, default=str)
                data.pop("supporting_documents", None)

            for field, val in data.items():
                if hasattr(app, field):
                    setattr(app, field, val)

        # Mandatory Submission Validation
        required_fields = [
            ("proposal_title", app.proposal_title, 5),
            ("executive_summary", app.executive_summary or app.proposal_summary, 20),
            ("problem_understanding", app.problem_understanding, 20),
            ("proposed_solution", app.proposed_solution, 20),
            ("technical_approach", app.technical_approach, 20),
            ("expected_outcomes", app.expected_outcomes, 20),
            ("implementation_plan", app.implementation_plan, 20),
            ("pilot_plan", app.pilot_plan, 20),
        ]

        missing = []
        for name, val, min_len in required_fields:
            if not val or len(val.strip()) < min_len:
                missing.append(f"{name} (minimum {min_len} characters required)")

        if not app.requested_budget or app.requested_budget <= 0:
            missing.append("requested_budget must be a positive number")

        if not app.timeline_days or app.timeline_days <= 0:
            missing.append("timeline_days must be a positive integer")

        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incomplete application. Required fields missing: {', '.join(missing)}",
            )

        # Budget range validation
        if challenge.budget_max and float(app.requested_budget) > (float(challenge.budget_max) * 1.5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested pilot grant of ₹{float(app.requested_budget):,.2f} exceeds permissible limit of ₹{float(challenge.budget_max):,.2f}.",
            )

        # Evaluate and snapshot eligibility
        eligibility = StartupService.screen_eligibility(db, current_user, challenge.id)
        app.eligibility_snapshot = json.dumps(eligibility.model_dump(), default=str)

        # Transition status
        app.status = ApplicationStatus.SUBMITTED.value
        app.submitted_at = datetime.now(timezone.utc)
        if not app.application_code:
            app.application_code = cls.generate_application_code(db)

        app.sync_legacy_fields()
        db.commit()
        db.refresh(app)

        log_audit(db, current_user.id, "application_submitted", "Application", app.id, {"code": app.application_code})

        return cls.build_application_response(app)

    @classmethod
    def withdraw_application(cls, db: Session, current_user: User, application_id: str) -> ApplicationResponse:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        startup = StartupService.get_or_create_profile(db, current_user)
        if app.startup_id != startup.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only withdraw your own applications.",
            )

        if app.status not in (ApplicationStatus.SUBMITTED.value, ApplicationStatus.UNDER_REVIEW.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application cannot be withdrawn in '{app.status}' status.",
            )

        app.status = ApplicationStatus.WITHDRAWN.value
        db.commit()
        db.refresh(app)

        log_audit(db, current_user.id, "application_withdrawn", "Application", app.id)

        return cls.build_application_response(app)

    @classmethod
    def list_startup_applications(
        cls, db: Session, current_user: User, status_filter: Optional[str] = None, page: int = 1, page_size: int = 10
    ) -> ApplicationListResponse:
        startup = StartupService.get_or_create_profile(db, current_user)

        query = db.query(Application).filter(Application.startup_id == startup.id)
        if status_filter and status_filter.upper() != "ALL":
            query = query.filter(Application.status == status_filter.upper())

        total = query.count()
        apps = (
            query.order_by(desc(Application.updated_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        total_pages = max(1, (total + page_size - 1) // page_size)
        items = [cls.build_application_response(a) for a in apps]

        return ApplicationListResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            items=items,
        )

    @classmethod
    def list_government_applications(
        cls,
        db: Session,
        current_user: User,
        challenge_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "newest",
        page: int = 1,
        page_size: int = 10,
    ) -> ApplicationListResponse:
        """
        Department application inbox. Government users see submitted applications
        for challenges belonging to their department. Drafts are excluded.
        """
        query = (
            db.query(Application)
            .join(Challenge, Application.challenge_id == Challenge.id)
            .join(Startup, Application.startup_id == Startup.id)
            .filter(Application.status != ApplicationStatus.DRAFT.value)
        )

        # Department Isolation (Admins see all; Government officers see challenges from their department or created by them)
        if current_user.role != UserRole.ADMIN:
            if current_user.department_id:
                query = query.filter(
                    or_(
                        Challenge.department_id == current_user.department_id,
                        Challenge.created_by == current_user.id,
                    )
                )
            else:
                query = query.filter(Challenge.created_by == current_user.id)

        if challenge_id:
            query = query.filter(Application.challenge_id == challenge_id)

        if status_filter and status_filter.upper() != "ALL":
            query = query.filter(Application.status == status_filter.upper())

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Application.application_code.ilike(pattern),
                    Application.proposal_title.ilike(pattern),
                    Startup.startup_name.ilike(pattern),
                    Startup.company_name.ilike(pattern),
                )
            )

        # Sorting
        if sort_by == "budget":
            query = query.order_by(desc(Application.requested_budget))
        elif sort_by == "oldest":
            query = query.order_by(asc(Application.submitted_at))
        else:
            query = query.order_by(desc(Application.submitted_at))

        total = query.count()
        apps = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = max(1, (total + page_size - 1) // page_size)
        items = [cls.build_application_response(a) for a in apps]

        return ApplicationListResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            items=items,
        )

    @classmethod
    def get_application_detail(cls, db: Session, current_user: User, application_id: str) -> ApplicationResponse:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        challenge = app.challenge

        # RBAC Check
        if current_user.role == UserRole.STARTUP:
            startup = StartupService.get_or_create_profile(db, current_user)
            if app.startup_id != startup.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized access to this application.",
                )
        elif current_user.role == UserRole.GOVERNMENT:
            has_perm = challenge and (challenge.department_id == current_user.department_id or challenge.created_by == current_user.id)
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This application belongs to a different government department.",
                )
            if app.status == ApplicationStatus.DRAFT.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Draft applications are not visible to department reviewers.",
                )
        elif current_user.role == UserRole.ADMIN:
            pass  # Admin full access
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role not authorized to review applications.",
            )

        return cls.build_application_response(app)

    @classmethod
    def update_application_status(
        cls, db: Session, current_user: User, application_id: str, payload: ApplicationStatusUpdateRequest
    ) -> ApplicationResponse:
        """
        Government status workflow: SUBMITTED -> UNDER_REVIEW -> SHORTLISTED / REJECTED.
        """
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        challenge = app.challenge
        if current_user.role != UserRole.ADMIN:
            has_perm = challenge and (challenge.department_id == current_user.department_id or challenge.created_by == current_user.id)
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only manage applications submitted to your department's challenges.",
                )

        target_status = payload.status.upper()
        allowed_transitions = {
            ApplicationStatus.SUBMITTED.value: [ApplicationStatus.UNDER_REVIEW.value],
            ApplicationStatus.UNDER_REVIEW.value: [
                ApplicationStatus.SHORTLISTED.value,
                ApplicationStatus.REJECTED.value,
            ],
            ApplicationStatus.SHORTLISTED.value: [ApplicationStatus.REJECTED.value],
            ApplicationStatus.REJECTED.value: [ApplicationStatus.UNDER_REVIEW.value],
        }

        # Admin override or standard state transition
        if current_user.role != UserRole.ADMIN:
            valid_next = allowed_transitions.get(app.status, [])
            if target_status not in valid_next:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from '{app.status}' to '{target_status}'. Permissible next states: {', '.join(valid_next)}",
                )

        app.status = target_status
        if payload.review_notes:
            app.review_notes = payload.review_notes

        db.commit()
        db.refresh(app)

        log_audit(
            db,
            current_user.id,
            "application_status_changed",
            "Application",
            app.id,
            {"new_status": target_status, "review_notes": payload.review_notes},
        )

        return cls.build_application_response(app)
