import json
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status, UploadFile

from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.pilot import Pilot, PilotStatus, PilotApprovalStatus, PilotSuccessStatus
from app.models.milestone import Milestone, MilestoneStatus, MilestoneAcceptanceStatus
from app.models.pilot_deliverable import PilotDeliverable, DeliverableStatus
from app.models.audit_log import AuditLog
from app.models.challenge import Challenge
from app.models.startup import Startup
from app.core.security import UserRole
from app.core.storage import storage_service
from app.core.datetime_utils import utc_now
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
    KPIResponse,
)


class PilotManagementService:
    """
    Comprehensive operational service for Step 6: Pilot Management & Milestone Tracking.
    Handles sandbox initiation, sequential code generation, object-level RBAC,
    milestone weighting & progress tracking, deliverable versioning, and lifecycle state transitions.
    """

    @classmethod
    def generate_pilot_code(cls, db: Session) -> str:
        current_year = datetime.now(timezone.utc).year
        prefix = f"PILOT-{current_year}-"
        count = (
            db.query(func.count(Pilot.id))
            .filter(Pilot.pilot_code.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return f"{prefix}{count + 1:04d}"

    @classmethod
    def generate_milestone_code(cls, pilot: Pilot, sequence_number: int) -> str:
        code_base = pilot.pilot_code or "PLT"
        return f"MS-{code_base}-{sequence_number:02d}"

    @classmethod
    def calculate_progress(cls, milestones: List[Milestone]) -> float:
        """
        Calculates aggregate pilot progress percentage based on milestone weights and completion:
        Progress = SUM(weight_i * completion_percentage_i / 100.0)
        """
        if not milestones:
            return 0.0
        total = 0.0
        for m in milestones:
            w = float(m.weight or 0.0)
            c = float(m.completion_percentage or 0.0)
            total += (w * c) / 100.0
        return round(min(100.0, max(0.0, total)), 1)

    @classmethod
    def verify_pilot_access(cls, current_user: User, pilot: Pilot, require_gov_or_admin: bool = False) -> None:
        """
        Enforce strict object-level authorization across government departments, startups, and admins.
        """
        if current_user.role == UserRole.ADMIN:
            return

        if require_gov_or_admin:
            if current_user.role != UserRole.GOVERNMENT:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Administrative or Government departmental clearance is required for this operational action.",
                )
            # Government user must match pilot's department or be the assigned owner/creator
            if (
                pilot.government_department_id
                and current_user.department_id
                and pilot.government_department_id != current_user.department_id
                and pilot.government_owner_id != current_user.id
                and pilot.created_by != current_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted: This pilot is managed by another government department.",
                )
            return

        # General access verification (View / Startup Deliverable Actions)
        if current_user.role == UserRole.GOVERNMENT:
            if (
                pilot.government_department_id
                and current_user.department_id
                and pilot.government_department_id != current_user.department_id
                and pilot.government_owner_id != current_user.id
                and pilot.created_by != current_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted: This pilot belongs to a different government department.",
                )
        elif current_user.role == UserRole.STARTUP:
            if (
                (pilot.startup_id and current_user.startup_id and pilot.startup_id != current_user.startup_id)
                and pilot.startup_owner_id != current_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted: This pilot belongs to another startup enterprise.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account role does not have authorization to view or manage operational sandbox pilots.",
            )

    @classmethod
    def create_pilot_from_application(
        cls,
        db: Session,
        current_user: User,
        payload: PilotCreateRequest,
    ) -> PilotResponse:
        """
        Initiate an operational sandbox pilot for a shortlisted startup proposal.
        Pre-populates contextual metadata from the challenge and proposal.
        """
        app = db.query(Application).filter(Application.id == payload.application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target application not found.",
            )

        # Check eligibility status
        allowed_app_statuses = [
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.SELECTED_FOR_PILOT.value,
            "SHORTLISTED",
            "SELECTED_FOR_PILOT",
        ]
        if app.status not in allowed_app_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only shortlisted applications can be converted into pilots. Current status: '{app.status}'.",
            )

        # Check for existing pilot
        existing = db.query(Pilot).filter(Pilot.application_id == payload.application_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An operational pilot sandbox ({existing.pilot_code or existing.id}) already exists for this proposal.",
            )

        # Department authorization check for government users
        dept_id = None
        if app.challenge:
            dept_id = app.challenge.department_id
        if not dept_id and current_user.department_id:
            dept_id = current_user.department_id

        if current_user.role == UserRole.GOVERNMENT:
            if dept_id and current_user.department_id and dept_id != current_user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot initiate a pilot for a challenge from another government department.",
                )

        pilot_code = cls.generate_pilot_code(db)

        # Determine titles and descriptions
        title = payload.pilot_title or payload.title or (f"Pilot: {app.proposal_title}" if app.proposal_title else "Operational Pilot Sandbox")
        objective = payload.objective or app.problem_understanding or "Demonstrate operational feasibility in public sandbox"
        scope = payload.scope or payload.scope_of_work or app.implementation_plan or app.pilot_plan or "Operational deployment testing"
        location = payload.pilot_location or payload.sandbox_location or "National Operational Sandbox"
        budget = payload.pilot_budget or payload.approved_budget or app.requested_budget or 500000.0

        start_date = payload.start_date or date.today()
        duration_days = payload.duration_days or (payload.duration_weeks * 7 if payload.duration_weeks else 90)
        planned_end_date = payload.planned_end_date or payload.end_date

        pilot = Pilot(
            pilot_code=pilot_code,
            application_id=app.id,
            challenge_id=app.challenge_id,
            startup_id=app.startup_id,
            government_department_id=dept_id,
            pilot_title=title,
            title=title,
            objective=objective,
            scope=scope,
            scope_of_work=scope,
            problem_statement=app.problem_understanding,
            proposed_solution=app.proposed_solution,
            expected_outcomes=payload.expected_outcomes or app.expected_outcomes,
            pilot_location=location,
            sandbox_location=location,
            operating_regions=payload.operating_regions,
            start_date=start_date,
            planned_end_date=planned_end_date,
            end_date=planned_end_date,
            duration_days=duration_days,
            duration_weeks=max(1, duration_days // 7),
            pilot_budget=budget,
            approved_budget=budget,
            currency=payload.currency or "INR",
            government_owner_id=payload.government_owner_id or (current_user.id if current_user.role == UserRole.GOVERNMENT else None),
            startup_owner_id=payload.startup_owner_id or app.submitted_by,
            created_by=current_user.id,
            status=PilotStatus.PLANNING.value,
            approval_status=PilotApprovalStatus.PENDING.value,
            success_status=PilotSuccessStatus.NOT_ASSESSED.value,
        )
        db.add(pilot)
        db.flush()

        # Add initial milestones if provided
        seq = 1
        for m in payload.milestones:
            m_code = cls.generate_milestone_code(pilot, seq)
            milestone = Milestone(
                pilot_id=pilot.id,
                milestone_code=m_code,
                sequence_number=m.sequence_number or seq,
                title=m.title.strip(),
                objective=m.objective,
                description=m.description or m.deliverable_description,
                deliverable_description=m.deliverable_description or m.description,
                planned_start_date=m.planned_start_date or start_date,
                planned_end_date=m.planned_end_date or m.due_date,
                due_date=m.due_date or m.planned_end_date,
                weight=m.weight,
                tranche_amount=m.tranche_amount,
                status=MilestoneStatus.NOT_STARTED.value,
                acceptance_status=MilestoneAcceptanceStatus.PENDING.value,
            )
            db.add(milestone)
            seq += 1

        # Mark application status as SELECTED_FOR_PILOT
        app.status = ApplicationStatus.SELECTED_FOR_PILOT.value

        # Audit log
        audit = AuditLog(
            user_id=current_user.id,
            action="PILOT_CREATED",
            entity_type="Pilot",
            entity_id=pilot.id,
            metadata_json=json.dumps({
                "pilot_code": pilot_code,
                "application_id": app.id,
                "budget": float(budget),
                "location": location,
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(pilot)

        return cls.format_pilot_response(pilot)

    @classmethod
    def list_pilots(
        cls,
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[PilotResponse]:
        query = db.query(Pilot)

        # RBAC Filtering
        if current_user.role == UserRole.ADMIN:
            pass  # Full visibility
        elif current_user.role == UserRole.GOVERNMENT:
            if current_user.department_id:
                query = query.filter(
                    (Pilot.government_department_id == current_user.department_id)
                    | (Pilot.government_owner_id == current_user.id)
                    | (Pilot.created_by == current_user.id)
                )
            else:
                query = query.filter(
                    (Pilot.government_owner_id == current_user.id)
                    | (Pilot.created_by == current_user.id)
                )
        elif current_user.role == UserRole.STARTUP:
            if current_user.startup_id:
                query = query.filter(
                    (Pilot.startup_id == current_user.startup_id)
                    | (Pilot.startup_owner_id == current_user.id)
                )
            else:
                query = query.filter(Pilot.startup_owner_id == current_user.id)
        else:
            return []

        if status_filter:
            sf = status_filter.strip().upper()
            if sf != "ALL":
                query = query.filter(Pilot.status == sf)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                (Pilot.pilot_code.ilike(term))
                | (Pilot.pilot_title.ilike(term))
                | (Pilot.title.ilike(term))
                | (Pilot.objective.ilike(term))
                | (Pilot.pilot_location.ilike(term))
            )

        pilots = query.order_by(Pilot.created_at.desc()).all()
        return [cls.format_pilot_response(p) for p in pilots]

    @classmethod
    def get_pilot_stats(cls, db: Session, current_user: User) -> PilotStatsResponse:
        pilots = cls.list_pilots(db, current_user)
        total = len(pilots)
        active = sum(1 for p in pilots if p.status == PilotStatus.ACTIVE.value)
        planning = sum(1 for p in pilots if p.status in (PilotStatus.PLANNING.value, PilotStatus.DRAFT.value, PilotStatus.PROPOSED.value))
        completed = sum(1 for p in pilots if p.status == PilotStatus.COMPLETED.value)
        paused = sum(1 for p in pilots if p.status == PilotStatus.PAUSED.value)
        cancelled = sum(1 for p in pilots if p.status == PilotStatus.CANCELLED.value)
        committed = sum(float(p.pilot_budget or p.approved_budget or 0.0) for p in pilots)
        avg_progress = (
            sum(p.pilot_progress for p in pilots) / total if total > 0 else 0.0
        )
        overdue_count = sum(p.overdue_milestones_count for p in pilots)

        return PilotStatsResponse(
            total_pilots=total,
            active_pilots=active,
            planning_pilots=planning,
            completed_pilots=completed,
            paused_pilots=paused,
            cancelled_pilots=cancelled,
            total_budget_committed=round(committed, 2),
            average_progress=round(avg_progress, 1),
            overdue_milestones_count=overdue_count,
        )

    @classmethod
    def get_pilot_by_id(cls, db: Session, current_user: User, pilot_id: str) -> PilotResponse:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operational sandbox pilot not found.",
            )
        cls.verify_pilot_access(current_user, pilot)
        return cls.format_pilot_response(pilot)

    @classmethod
    def update_pilot(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        payload: PilotUpdateRequest,
    ) -> PilotResponse:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operational sandbox pilot not found.",
            )
        cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)

        if pilot.status in (PilotStatus.COMPLETED.value, PilotStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit pilot specifications when in terminal status '{pilot.status}'.",
            )

        if payload.pilot_title is not None:
            pilot.pilot_title = payload.pilot_title
            pilot.title = payload.pilot_title
        if payload.objective is not None:
            pilot.objective = payload.objective
        if payload.scope is not None:
            pilot.scope = payload.scope
            pilot.scope_of_work = payload.scope
        if payload.problem_statement is not None:
            pilot.problem_statement = payload.problem_statement
        if payload.proposed_solution is not None:
            pilot.proposed_solution = payload.proposed_solution
        if payload.expected_outcomes is not None:
            pilot.expected_outcomes = payload.expected_outcomes
        if payload.pilot_location is not None:
            pilot.pilot_location = payload.pilot_location
            pilot.sandbox_location = payload.pilot_location
        if payload.operating_regions is not None:
            pilot.operating_regions = payload.operating_regions
        if payload.start_date is not None:
            pilot.start_date = payload.start_date
        if payload.planned_end_date is not None:
            pilot.planned_end_date = payload.planned_end_date
            pilot.end_date = payload.planned_end_date
        if payload.duration_days is not None:
            pilot.duration_days = payload.duration_days
            pilot.duration_weeks = max(1, payload.duration_days // 7)
        if payload.pilot_budget is not None:
            pilot.pilot_budget = payload.pilot_budget
            pilot.approved_budget = payload.pilot_budget
        if payload.currency is not None:
            pilot.currency = payload.currency
        if payload.government_owner_id is not None:
            pilot.government_owner_id = payload.government_owner_id
        if payload.startup_owner_id is not None:
            pilot.startup_owner_id = payload.startup_owner_id

        audit = AuditLog(
            user_id=current_user.id,
            action="PILOT_SPECIFICATIONS_UPDATED",
            entity_type="Pilot",
            entity_id=pilot.id,
            metadata_json=json.dumps({"updated_by": current_user.email}),
        )
        db.add(audit)
        db.commit()
        db.refresh(pilot)
        return cls.format_pilot_response(pilot)

    @classmethod
    def lifecycle_action(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        payload: PilotLifecycleActionRequest,
    ) -> PilotResponse:
        """
        State machine engine controlling transitions across:
        DRAFT -> PROPOSED -> APPROVED -> PLANNING -> ACTIVE -> PAUSED -> COMPLETED / CANCELLED
        """
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Operational sandbox pilot not found.",
            )

        act = payload.action.strip().upper()

        # Permissions: Startup can only propose a pilot
        if act == "PROPOSE":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=False)
            if pilot.status not in (PilotStatus.DRAFT.value, "DRAFT"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only DRAFT pilots can be proposed. Current status: {pilot.status}",
                )
            pilot.status = PilotStatus.PROPOSED.value
            pilot.approval_status = PilotApprovalStatus.PENDING.value

        elif act == "APPROVE":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status not in (PilotStatus.PROPOSED.value, PilotStatus.DRAFT.value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot approve pilot in status {pilot.status}.",
                )
            pilot.status = PilotStatus.PLANNING.value
            pilot.approval_status = PilotApprovalStatus.APPROVED.value

        elif act == "REJECT":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if not payload.reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A formal rejection reason is mandatory when rejecting a proposed pilot.",
                )
            pilot.status = PilotStatus.DRAFT.value
            pilot.approval_status = PilotApprovalStatus.REJECTED.value
            pilot.rejection_reason = payload.reason

        elif act == "START":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status not in (PilotStatus.PLANNING.value, PilotStatus.APPROVED.value, PilotStatus.DRAFT.value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot start pilot currently in status '{pilot.status}'.",
                )

            # Strictly validate milestone weights sum to 100.0%
            milestones = db.query(Milestone).filter(Milestone.pilot_id == pilot.id).all()
            if not milestones:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot start pilot without any defined operational milestones.",
                )
            total_weight = sum(float(m.weight or 0.0) for m in milestones)
            if abs(total_weight - 100.0) > 0.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Operational milestones must total exactly 100.0% weight before sandbox deployment can start. Current total: {total_weight:.1f}%.",
                )

            pilot.status = PilotStatus.ACTIVE.value
            pilot.approval_status = PilotApprovalStatus.APPROVED.value
            if not pilot.start_date:
                pilot.start_date = date.today()

        elif act == "PAUSE":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status != PilotStatus.ACTIVE.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only ACTIVE pilots can be paused. Current status: '{pilot.status}'.",
                )
            pilot.status = PilotStatus.PAUSED.value

        elif act == "RESUME":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status != PilotStatus.PAUSED.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only PAUSED pilots can be resumed. Current status: '{pilot.status}'.",
                )
            pilot.status = PilotStatus.ACTIVE.value

        elif act == "COMPLETE":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status != PilotStatus.ACTIVE.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only ACTIVE pilots can be marked as completed. Current status: '{pilot.status}'.",
                )

            # Verify that all milestones are accepted or completed
            milestones = db.query(Milestone).filter(Milestone.pilot_id == pilot.id).all()
            uncompleted = [
                m for m in milestones
                if m.status not in (MilestoneStatus.ACCEPTED.value, MilestoneStatus.COMPLETED.value)
            ]
            if uncompleted:
                ms_titles = ", ".join([f"'{m.title}' ({m.status})" for m in uncompleted[:3]])
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot complete pilot sandbox. All milestones must be formally accepted or completed. Incomplete: {ms_titles}.",
                )

            pilot.status = PilotStatus.COMPLETED.value
            pilot.actual_end_date = date.today()
            # CRITICAL: success_status strictly remains NOT_ASSESSED until Step 7 KPI validation
            pilot.success_status = PilotSuccessStatus.NOT_ASSESSED.value

        elif act == "CANCEL":
            cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)
            if pilot.status in (PilotStatus.COMPLETED.value, PilotStatus.CANCELLED.value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pilot is already in terminal state '{pilot.status}'.",
                )
            if not payload.reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A formal cancellation reason is mandatory when cancelling a pilot sandbox.",
                )
            pilot.status = PilotStatus.CANCELLED.value
            pilot.cancellation_reason = payload.reason
            pilot.actual_end_date = date.today()

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unrecognized lifecycle action: '{act}'. Valid actions: PROPOSE, APPROVE, REJECT, START, PAUSE, RESUME, COMPLETE, CANCEL.",
            )

        audit = AuditLog(
            user_id=current_user.id,
            action=f"PILOT_LIFECYCLE_{act}",
            entity_type="Pilot",
            entity_id=pilot.id,
            metadata_json=json.dumps({
                "action": act,
                "new_status": pilot.status,
                "reason": payload.reason,
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(pilot)
        return cls.format_pilot_response(pilot)

    # -------------------------------------------------------------------------
    # Milestone Management
    # -------------------------------------------------------------------------

    @classmethod
    def add_milestone(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        payload: MilestoneCreateRequest,
    ) -> MilestoneResponse:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pilot sandbox not found.",
            )
        cls.verify_pilot_access(current_user, pilot, require_gov_or_admin=True)

        if pilot.status in (PilotStatus.COMPLETED.value, PilotStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add milestones to a completed or cancelled pilot.",
            )

        # Check total weights do not exceed 100.0%
        existing_milestones = db.query(Milestone).filter(Milestone.pilot_id == pilot.id).all()
        current_weight = sum(float(m.weight or 0.0) for m in existing_milestones)
        if current_weight + float(payload.weight) > 100.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adding weight {payload.weight}% would exceed 100% (currently allocated: {current_weight:.1f}%).",
            )

        milestone_code = cls.generate_milestone_code(pilot, payload.sequence_number)
        milestone = Milestone(
            pilot_id=pilot.id,
            milestone_code=milestone_code,
            sequence_number=payload.sequence_number,
            title=payload.title.strip(),
            objective=payload.objective,
            description=payload.description or payload.deliverable_description,
            deliverable_description=payload.deliverable_description or payload.description,
            planned_start_date=payload.planned_start_date or pilot.start_date,
            planned_end_date=payload.planned_end_date or payload.due_date,
            due_date=payload.due_date or payload.planned_end_date,
            weight=payload.weight,
            tranche_amount=payload.tranche_amount,
            status=MilestoneStatus.NOT_STARTED.value,
            acceptance_status=MilestoneAcceptanceStatus.PENDING.value,
        )
        db.add(milestone)

        audit = AuditLog(
            user_id=current_user.id,
            action="MILESTONE_CREATED",
            entity_type="Milestone",
            entity_id=milestone.id,
            metadata_json=json.dumps({"pilot_id": pilot.id, "title": milestone.title}),
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)
        return cls.format_milestone_response(milestone)

    @classmethod
    def update_milestone(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
        payload: MilestoneUpdateRequest,
    ) -> MilestoneResponse:
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found in specified pilot.",
            )
        cls.verify_pilot_access(current_user, milestone.pilot, require_gov_or_admin=True)

        if milestone.pilot.status in (PilotStatus.COMPLETED.value, PilotStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit milestone in a completed or cancelled pilot.",
            )

        if payload.weight is not None:
            # Check weight budget
            other_milestones = (
                db.query(Milestone)
                .filter(Milestone.pilot_id == pilot_id, Milestone.id != milestone_id)
                .all()
            )
            other_weight = sum(float(m.weight or 0.0) for m in other_milestones)
            if other_weight + float(payload.weight) > 100.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Updating weight to {payload.weight}% would exceed 100% (other milestones total: {other_weight:.1f}%).",
                )
            milestone.weight = payload.weight

        if payload.title is not None:
            milestone.title = payload.title.strip()
        if payload.objective is not None:
            milestone.objective = payload.objective
        if payload.description is not None:
            milestone.description = payload.description
            milestone.deliverable_description = payload.description
        if payload.planned_start_date is not None:
            milestone.planned_start_date = payload.planned_start_date
        if payload.planned_end_date is not None:
            milestone.planned_end_date = payload.planned_end_date
            milestone.due_date = payload.planned_end_date
        if payload.actual_start_date is not None:
            milestone.actual_start_date = payload.actual_start_date
        if payload.actual_end_date is not None:
            milestone.actual_end_date = payload.actual_end_date
        if payload.completion_percentage is not None:
            milestone.completion_percentage = payload.completion_percentage
        if payload.status is not None:
            milestone.status = payload.status
        if payload.block_reason is not None:
            milestone.block_reason = payload.block_reason

        audit = AuditLog(
            user_id=current_user.id,
            action="MILESTONE_UPDATED",
            entity_type="Milestone",
            entity_id=milestone.id,
            metadata_json=json.dumps({"title": milestone.title}),
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)
        return cls.format_milestone_response(milestone)

    @classmethod
    def update_milestone_status(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
        payload: MilestoneStatusUpdateRequest,
    ) -> MilestoneResponse:
        """
        Progress updater. Startups can mark as IN_PROGRESS or SUBMITTED.
        Government and Admin have full operational override.
        """
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found.",
            )
        cls.verify_pilot_access(current_user, milestone.pilot)

        st = payload.status.strip().upper()

        if current_user.role == UserRole.STARTUP:
            if st not in (MilestoneStatus.IN_PROGRESS.value, MilestoneStatus.SUBMITTED.value, MilestoneStatus.BLOCKED.value):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Startups can only set milestone status to IN_PROGRESS, SUBMITTED, or BLOCKED.",
                )

        milestone.status = st
        if payload.completion_percentage is not None:
            milestone.completion_percentage = payload.completion_percentage
        elif st in (MilestoneStatus.ACCEPTED.value, MilestoneStatus.COMPLETED.value):
            milestone.completion_percentage = 100.0

        if payload.actual_start_date is not None:
            milestone.actual_start_date = payload.actual_start_date
        elif st == MilestoneStatus.IN_PROGRESS.value and not milestone.actual_start_date:
            milestone.actual_start_date = date.today()

        if payload.actual_end_date is not None:
            milestone.actual_end_date = payload.actual_end_date
        elif st in (MilestoneStatus.ACCEPTED.value, MilestoneStatus.COMPLETED.value) and not milestone.actual_end_date:
            milestone.actual_end_date = date.today()

        if payload.block_reason:
            milestone.block_reason = payload.block_reason

        audit = AuditLog(
            user_id=current_user.id,
            action="MILESTONE_STATUS_UPDATED",
            entity_type="Milestone",
            entity_id=milestone.id,
            metadata_json=json.dumps({"status": st, "completion": float(milestone.completion_percentage)}),
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)
        return cls.format_milestone_response(milestone)

    @classmethod
    def review_milestone(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
        payload: MilestoneReviewRequest,
    ) -> MilestoneResponse:
        """
        Formal government review and acceptance of a milestone.
        """
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found.",
            )
        cls.verify_pilot_access(current_user, milestone.pilot, require_gov_or_admin=True)

        action = payload.action.strip().upper()
        if action == "ACCEPT":
            milestone.status = MilestoneStatus.ACCEPTED.value
            milestone.acceptance_status = MilestoneAcceptanceStatus.ACCEPTED.value
            milestone.completion_percentage = 100.0
            if not milestone.actual_end_date:
                milestone.actual_end_date = date.today()
        elif action == "REJECT":
            milestone.status = MilestoneStatus.REJECTED.value
            milestone.acceptance_status = MilestoneAcceptanceStatus.REJECTED.value
            milestone.rejection_reason = payload.reason or "Milestone deliverables were found unsatisfactory."
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be ACCEPT or REJECT.",
            )

        audit = AuditLog(
            user_id=current_user.id,
            action=f"MILESTONE_REVIEW_{action}",
            entity_type="Milestone",
            entity_id=milestone.id,
            metadata_json=json.dumps({"action": action, "reason": payload.reason}),
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)
        return cls.format_milestone_response(milestone)

    # -------------------------------------------------------------------------
    # Deliverable Management
    # -------------------------------------------------------------------------

    @classmethod
    def upload_deliverable(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
        title: str,
        description: Optional[str],
        upload_file: UploadFile,
    ) -> DeliverableResponse:
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found.",
            )
        cls.verify_pilot_access(current_user, milestone.pilot)

        if milestone.pilot.status in (PilotStatus.COMPLETED.value, PilotStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit deliverables for a completed or cancelled pilot sandbox.",
            )

        # Calculate version
        latest_version = (
            db.query(func.max(PilotDeliverable.submission_version))
            .filter(PilotDeliverable.milestone_id == milestone.id)
            .scalar()
            or 0
        )
        new_version = latest_version + 1

        # Save file via storage service
        saved = storage_service.save_file(upload_file)

        deliverable = PilotDeliverable(
            milestone_id=milestone.id,
            pilot_id=milestone.pilot_id,
            submitted_by=current_user.id,
            title=title.strip(),
            description=description,
            file_name=saved["original_filename"],
            storage_key=saved["stored_filename"],
            mime_type=saved["mime_type"],
            file_size=saved["file_size"],
            submission_version=new_version,
            status=DeliverableStatus.SUBMITTED.value,
        )
        db.add(deliverable)

        # Update milestone status to SUBMITTED if currently NOT_STARTED or IN_PROGRESS
        if milestone.status in (MilestoneStatus.NOT_STARTED.value, MilestoneStatus.IN_PROGRESS.value, MilestoneStatus.REJECTED.value):
            milestone.status = MilestoneStatus.SUBMITTED.value

        audit = AuditLog(
            user_id=current_user.id,
            action="DELIVERABLE_SUBMITTED",
            entity_type="PilotDeliverable",
            entity_id=deliverable.id,
            metadata_json=json.dumps({
                "milestone_id": milestone.id,
                "version": new_version,
                "file_name": saved["original_filename"],
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(deliverable)
        return cls.format_deliverable_response(deliverable)

    @classmethod
    def review_deliverable(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        deliverable_id: str,
        payload: DeliverableReviewRequest,
    ) -> DeliverableResponse:
        deliverable = (
            db.query(PilotDeliverable)
            .filter(PilotDeliverable.id == deliverable_id, PilotDeliverable.pilot_id == pilot_id)
            .first()
        )
        if not deliverable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deliverable not found.",
            )
        cls.verify_pilot_access(current_user, deliverable.pilot, require_gov_or_admin=True)

        action = payload.action.strip().upper()
        if action == "ACCEPT":
            deliverable.status = DeliverableStatus.ACCEPTED.value
            deliverable.reviewed_by = current_user.id
            deliverable.reviewed_at = utc_now()
            deliverable.review_comments = payload.review_comments
        elif action == "REJECT":
            deliverable.status = DeliverableStatus.REJECTED.value
            deliverable.reviewed_by = current_user.id
            deliverable.reviewed_at = utc_now()
            deliverable.review_comments = payload.review_comments
            # Also update milestone if rejected
            deliverable.milestone.status = MilestoneStatus.REJECTED.value
            deliverable.milestone.rejection_reason = payload.review_comments
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review action must be ACCEPT or REJECT.",
            )

        audit = AuditLog(
            user_id=current_user.id,
            action=f"DELIVERABLE_REVIEW_{action}",
            entity_type="PilotDeliverable",
            entity_id=deliverable.id,
            metadata_json=json.dumps({"action": action, "remarks": payload.review_comments}),
        )
        db.add(audit)
        db.commit()
        db.refresh(deliverable)
        return cls.format_deliverable_response(deliverable)

    @classmethod
    def get_deliverable_file(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        deliverable_id: str,
    ) -> Tuple[Path, str, str]:
        deliverable = (
            db.query(PilotDeliverable)
            .filter(PilotDeliverable.id == deliverable_id, PilotDeliverable.pilot_id == pilot_id)
            .first()
        )
        if not deliverable:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deliverable document not found.",
            )
        cls.verify_pilot_access(current_user, deliverable.pilot)
        file_path = storage_service.get_file_path(deliverable.storage_key)
        return file_path, deliverable.file_name, deliverable.mime_type

    # -------------------------------------------------------------------------
    # Response Formatters
    # -------------------------------------------------------------------------

    @classmethod
    def format_deliverable_response(cls, d: PilotDeliverable) -> DeliverableResponse:
        submitter_name = d.submitter.full_name if d.submitter else None
        reviewer_name = d.reviewer.full_name if d.reviewer else None

        return DeliverableResponse(
            id=d.id,
            milestone_id=d.milestone_id,
            pilot_id=d.pilot_id,
            title=d.title,
            description=d.description,
            file_name=d.file_name,
            storage_key=d.storage_key,
            mime_type=d.mime_type,
            file_size=d.file_size,
            submission_version=d.submission_version,
            status=d.status,
            submitted_at=d.submitted_at,
            submitted_by=d.submitted_by,
            submitter_name=submitter_name,
            reviewed_at=d.reviewed_at,
            reviewed_by=d.reviewed_by,
            reviewer_name=reviewer_name,
            review_comments=d.review_comments,
            created_at=d.created_at,
        )

    @classmethod
    def format_milestone_response(cls, m: Milestone) -> MilestoneResponse:
        today = date.today()
        is_overdue = bool(
            m.planned_end_date
            and m.planned_end_date < today
            and m.status not in (MilestoneStatus.ACCEPTED.value, MilestoneStatus.COMPLETED.value)
        )

        deliverables = [
            cls.format_deliverable_response(d)
            for d in (m.deliverables or [])
        ]

        return MilestoneResponse(
            id=m.id,
            pilot_id=m.pilot_id,
            milestone_code=m.milestone_code,
            sequence_number=m.sequence_number,
            title=m.title,
            objective=m.objective,
            description=m.description or m.deliverable_description,
            deliverable_description=m.deliverable_description or m.description,
            planned_start_date=m.planned_start_date,
            planned_end_date=m.planned_end_date or m.due_date,
            actual_start_date=m.actual_start_date,
            actual_end_date=m.actual_end_date or m.completion_date,
            weight=float(m.weight or 0.0),
            completion_percentage=float(m.completion_percentage or 0.0),
            status=m.status,
            acceptance_status=m.acceptance_status,
            block_reason=m.block_reason,
            rejection_reason=m.rejection_reason,
            tranche_amount=float(m.tranche_amount or 0.0),
            due_date=m.planned_end_date or m.due_date,
            completion_date=m.actual_end_date or m.completion_date,
            is_overdue=is_overdue,
            deliverables=deliverables,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )

    @classmethod
    def format_pilot_response(cls, p: Pilot) -> PilotResponse:
        st_name = (
            p.startup.company_name if p.startup
            else (p.application.startup.company_name if p.application and p.application.startup else None)
        )
        dept_name = (
            p.department.name if p.department
            else (p.application.challenge.department.name if p.application and p.application.challenge and p.application.challenge.department else None)
        )
        chal_title = (
            p.challenge.title if p.challenge
            else (p.application.challenge.title if p.application and p.application.challenge else None)
        )

        gov_name = p.government_owner.full_name if p.government_owner else None
        startup_owner_name = p.startup_owner.full_name if p.startup_owner else None

        milestone_responses = [cls.format_milestone_response(m) for m in (p.milestones or [])]
        deliverables_responses = [cls.format_deliverable_response(d) for d in (p.deliverables or [])]
        kpi_responses = [KPIResponse.model_validate(k) for k in (p.kpis or [])]

        total_ms = len(milestone_responses)
        completed_ms = sum(
            1 for m in milestone_responses
            if m.status in (MilestoneStatus.ACCEPTED.value, MilestoneStatus.COMPLETED.value)
        )
        overdue_ms = sum(1 for m in milestone_responses if m.is_overdue)
        progress = cls.calculate_progress(p.milestones or [])

        return PilotResponse(
            id=p.id,
            pilot_code=p.pilot_code,
            application_id=p.application_id,
            challenge_id=p.challenge_id,
            startup_id=p.startup_id,
            government_department_id=p.government_department_id,
            pilot_title=p.pilot_title or p.title,
            title=p.pilot_title or p.title,
            objective=p.objective,
            scope=p.scope or p.scope_of_work,
            scope_of_work=p.scope or p.scope_of_work,
            problem_statement=p.problem_statement,
            proposed_solution=p.proposed_solution,
            expected_outcomes=p.expected_outcomes,
            pilot_location=p.pilot_location or p.sandbox_location,
            sandbox_location=p.pilot_location or p.sandbox_location,
            operating_regions=p.operating_regions,
            start_date=p.start_date,
            planned_end_date=p.planned_end_date or p.end_date,
            end_date=p.planned_end_date or p.end_date,
            actual_end_date=p.actual_end_date,
            duration_days=p.duration_days,
            duration_weeks=p.duration_weeks or max(1, p.duration_days // 7),
            pilot_budget=float(p.pilot_budget or p.approved_budget or 0.0),
            approved_budget=float(p.pilot_budget or p.approved_budget or 0.0),
            currency=p.currency,
            status=p.status,
            approval_status=p.approval_status,
            success_status=p.success_status or "NOT_ASSESSED",
            government_owner_id=p.government_owner_id,
            government_owner_name=gov_name,
            startup_owner_id=p.startup_owner_id,
            startup_owner_name=startup_owner_name,
            created_by=p.created_by,
            rejection_reason=p.rejection_reason,
            cancellation_reason=p.cancellation_reason,
            pilot_progress=progress,
            total_milestones_count=total_ms,
            completed_milestones_count=completed_ms,
            overdue_milestones_count=overdue_ms,
            startup_name=st_name,
            department_name=dept_name,
            challenge_title=chal_title,
            milestones=milestone_responses,
            deliverables=deliverables_responses,
            kpis=kpi_responses,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
