from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.models.evaluation import Evaluation, EvaluationRecommendation
from app.models.pilot import Pilot, PilotStatus
from app.models.milestone import Milestone, MilestoneStatus
from app.models.kpi import KPI
from app.models.audit_log import AuditLog
from app.schemas.pilot import (
    EvaluationCreateRequest,
    EvaluationResponse,
    PilotCreateRequest,
    PilotResponse,
    MilestoneResponse,
    KPIResponse,
)


class PilotService:
    """
    Service managing expert evaluations, controlled sandbox pilots, milestone tranches, and KPI telemetry.
    """

    @classmethod
    def evaluate_application(
        cls,
        db: Session,
        current_user: User,
        application_id: str,
        payload: EvaluationCreateRequest,
    ) -> EvaluationResponse:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        # Weighted composite score: 40% technical + 30% operational + 30% commercial
        composite = round(
            0.4 * payload.technical_score
            + 0.3 * payload.operational_score
            + 0.3 * payload.commercial_score,
            2,
        )

        evaluation = Evaluation(
            application_id=application_id,
            evaluator_id=current_user.id,
            technical_score=payload.technical_score,
            operational_score=payload.operational_score,
            commercial_score=payload.commercial_score,
            composite_score=composite,
            evaluator_feedback=payload.evaluator_feedback.strip(),
            recommendation=payload.recommendation,
        )
        db.add(evaluation)

        # Update application state based on recommendation
        if payload.recommendation == EvaluationRecommendation.STRONGLY_RECOMMEND:
            app.status = ApplicationStatus.SELECTED_FOR_PILOT
        elif payload.recommendation == EvaluationRecommendation.RECOMMEND:
            app.status = ApplicationStatus.SHORTLISTED

        # Record audit
        audit = AuditLog(
            user_id=current_user.id,
            action="APPLICATION_EVALUATED",
            entity_type="Evaluation",
            entity_id=application_id,
            details_json=f'{{"composite_score": {composite}, "recommendation": "{payload.recommendation}"}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(evaluation)

        return EvaluationResponse.model_validate(evaluation)

    @classmethod
    def create_pilot(
        cls,
        db: Session,
        current_user: User,
        payload: PilotCreateRequest,
    ) -> PilotResponse:
        app = db.query(Application).filter(Application.id == payload.application_id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )

        # Ensure no existing pilot for this application
        existing = db.query(Pilot).filter(Pilot.application_id == payload.application_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pilot sandbox has already been created for this application.",
            )

        pilot = Pilot(
            application_id=payload.application_id,
            title=payload.title.strip(),
            scope_of_work=payload.scope_of_work.strip(),
            duration_weeks=payload.duration_weeks,
            sandbox_location=payload.sandbox_location.strip(),
            approved_budget=payload.approved_budget,
            status=PilotStatus.ACTIVE,
            start_date=payload.start_date or date.today(),
            end_date=payload.end_date,
        )
        db.add(pilot)
        db.flush()

        # Seed milestones
        for m in payload.milestones:
            milestone = Milestone(
                pilot_id=pilot.id,
                sequence_number=m.sequence_number,
                title=m.title.strip(),
                deliverable_description=m.deliverable_description.strip(),
                tranche_amount=m.tranche_amount,
                due_date=m.due_date,
                status=MilestoneStatus.PENDING,
            )
            db.add(milestone)

        # Seed KPIs
        for k in payload.kpis:
            kpi = KPI(
                pilot_id=pilot.id,
                metric_name=k.metric_name.strip(),
                baseline_value=k.baseline_value,
                target_value=k.target_value,
                unit=k.unit.strip(),
                is_verified=False,
            )
            db.add(kpi)

        app.status = ApplicationStatus.SELECTED_FOR_PILOT

        # Audit
        audit = AuditLog(
            user_id=current_user.id,
            action="PILOT_INITIATED",
            entity_type="Pilot",
            entity_id=pilot.id,
            details_json=f'{{"budget": {payload.approved_budget}, "location": "{payload.sandbox_location}"}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(pilot)

        return cls.format_pilot_response(pilot)

    @classmethod
    def list_pilots(cls, db: Session) -> List[PilotResponse]:
        pilots = db.query(Pilot).order_by(Pilot.created_at.desc()).all()
        return [cls.format_pilot_response(p) for p in pilots]

    @classmethod
    def get_pilot_by_id(cls, db: Session, pilot_id: str) -> PilotResponse:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pilot sandbox not found.",
            )
        return cls.format_pilot_response(pilot)

    @classmethod
    def submit_milestone_deliverable(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
    ) -> MilestoneResponse:
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found in specified pilot sandbox.",
            )

        milestone.status = MilestoneStatus.DELIVERABLE_SUBMITTED

        audit = AuditLog(
            user_id=current_user.id,
            action="MILESTONE_DELIVERABLE_SUBMITTED",
            entity_type="Milestone",
            entity_id=milestone.id,
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)

        return MilestoneResponse.model_validate(milestone)

    @classmethod
    def approve_milestone_tranche(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        milestone_id: str,
    ) -> MilestoneResponse:
        milestone = (
            db.query(Milestone)
            .filter(Milestone.id == milestone_id, Milestone.pilot_id == pilot_id)
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Milestone not found in specified pilot sandbox.",
            )

        milestone.status = MilestoneStatus.TRANCHE_DISBURSED
        milestone.completion_date = date.today()

        audit = AuditLog(
            user_id=current_user.id,
            action="MILESTONE_TRANCHE_DISBURSED",
            entity_type="Milestone",
            entity_id=milestone.id,
            details_json=f'{{"tranche_amount": {float(milestone.tranche_amount)}}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(milestone)

        return MilestoneResponse.model_validate(milestone)

    @classmethod
    def update_kpi_telemetry(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        kpi_id: str,
        achieved_value: float,
        verification_source: Optional[str] = None,
    ) -> KPIResponse:
        kpi = db.query(KPI).filter(KPI.id == kpi_id, KPI.pilot_id == pilot_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="KPI metric not found in specified pilot.",
            )

        kpi.achieved_value = achieved_value
        if verification_source:
            kpi.verification_source = verification_source

        audit = AuditLog(
            user_id=current_user.id,
            action="KPI_TELEMETRY_UPDATED",
            entity_type="KPI",
            entity_id=kpi.id,
            details_json=f'{{"achieved_value": {achieved_value}}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(kpi)

        return KPIResponse.model_validate(kpi)

    @classmethod
    def format_pilot_response(cls, pilot: Pilot) -> PilotResponse:
        st_name = (
            pilot.application.startup.company_name
            if pilot.application and pilot.application.startup
            else None
        )
        dept_name = (
            pilot.application.challenge.department.name
            if pilot.application
            and pilot.application.challenge
            and pilot.application.challenge.department
            else None
        )

        return PilotResponse(
            id=pilot.id,
            application_id=pilot.application_id,
            title=pilot.title,
            scope_of_work=pilot.scope_of_work,
            duration_weeks=pilot.duration_weeks,
            sandbox_location=pilot.sandbox_location,
            approved_budget=float(pilot.approved_budget),
            status=pilot.status,
            start_date=pilot.start_date,
            end_date=pilot.end_date,
            startup_name=st_name,
            department_name=dept_name,
            milestones=[MilestoneResponse.model_validate(m) for m in pilot.milestones],
            kpis=[KPIResponse.model_validate(k) for k in pilot.kpis],
            created_at=pilot.created_at,
        )
