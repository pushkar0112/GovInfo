import json
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status

from app.models.base import utc_now
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.challenge import Challenge, ChallengeStatus
from app.models.challenge_kpi import ChallengeKPI
from app.models.application import Application, ApplicationStatus
from app.models.audit_log import AuditLog
from app.schemas.challenge import (
    ChallengeCreateRequest,
    ChallengeUpdateRequest,
    ChallengeResponse,
    ChallengePublishValidationResponse,
    KPICreateRequest,
    KPIUpdateRequest,
    KPIResponse,
    ApplicationCreateRequest,
    ApplicationResponse,
)


class ChallengeService:
    """
    Business logic layer for government problem statements, outcome-based challenges,
    measurable KPIs, and startup proposals.
    """

    @classmethod
    def generate_challenge_code(cls, db: Session) -> str:
        """
        Generate human-readable, sequentially incrementing unique challenge code.
        Format: GI-YYYY-NNNN (e.g., GI-2026-0001).
        """
        year = datetime.now(timezone.utc).year
        prefix = f"GI-{year}-"

        # Find the highest existing code for the current year
        last_challenge = (
            db.query(Challenge.challenge_code)
            .filter(Challenge.challenge_code.like(f"{prefix}%"))
            .order_by(Challenge.challenge_code.desc())
            .first()
        )

        if last_challenge and last_challenge[0]:
            try:
                last_num = int(last_challenge[0].split("-")[-1])
                new_num = last_num + 1
            except Exception:
                new_num = 1
        else:
            new_num = 1

        # Format with 4-digit zero padding
        return f"{prefix}{new_num:04d}"

    @classmethod
    def check_department_ownership(cls, current_user: User, challenge: Challenge) -> None:
        """
        Ensure the user is authorized to modify the challenge.
        Government officers can only modify challenges belonging to their department.
        Admins can manage all challenges.
        """
        if current_user.role == "ADMIN":
            return

        if current_user.role != "GOVERNMENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Government Nodal Officers and Administrators may manage challenges.",
            )

        if current_user.department_id != challenge.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to manage challenges belonging to another department.",
            )

    @classmethod
    def create_challenge(
        cls,
        db: Session,
        current_user: User,
        payload: ChallengeCreateRequest,
    ) -> ChallengeResponse:
        """
        Create a new problem statement/challenge. Defaults to DRAFT status unless specified.
        """
        if current_user.role not in {"GOVERNMENT", "ADMIN"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Government Nodal Officers and Administrators can create challenges.",
            )

        # Department isolation check
        dept_id = current_user.department_id
        if payload.department_id:
            if current_user.role != "ADMIN" and str(payload.department_id) != str(current_user.department_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Government users can only create challenges for their own department.",
                )
            dept_id = payload.department_id

        # Ensure department exists
        if not dept_id:
            dept = Department(
                name=f"{current_user.full_name}'s Department",
                code=f"DEPT-{current_user.id[:6].upper()}",
                ministry="Ministry of Electronics & IT",
                contact_email=current_user.email,
            )
            db.add(dept)
            db.flush()
            current_user.department_id = dept.id
            dept_id = dept.id

        challenge_code = cls.generate_challenge_code(db)
        target_status = payload.status or ChallengeStatus.DRAFT

        challenge = Challenge(
            challenge_code=challenge_code,
            department_id=dept_id,
            created_by=current_user.id,
            title=payload.title.strip(),
            problem_statement=payload.problem_statement.strip(),
            current_state=payload.current_state.strip() if payload.current_state else None,
            desired_outcome=payload.desired_outcome.strip() if payload.desired_outcome else "",
            challenge_description=payload.challenge_description.strip() if payload.challenge_description else None,
            target_beneficiaries=payload.target_beneficiaries.strip() if payload.target_beneficiaries else None,
            technology_preferences=payload.technology_preferences.strip() if payload.technology_preferences else None,
            technology_restrictions=payload.technology_restrictions.strip() if payload.technology_restrictions else None,
            domain=payload.domain.strip() if payload.domain else "CivicTech",
            geographical_scope=payload.geographical_scope.strip() if payload.geographical_scope else "National",
            budget_min=payload.budget_min,
            budget_max=payload.budget_max,
            currency=payload.currency or "INR",
            pilot_duration_days=payload.pilot_duration_days or 90,
            application_deadline=payload.application_deadline,
            pilot_start_date=payload.pilot_start_date,
            data_requirements=payload.data_requirements,
            security_requirements=payload.security_requirements,
            compliance_requirements=payload.compliance_requirements,
            intellectual_property_requirements=payload.intellectual_property_requirements,
            eligibility_requirements=payload.eligibility_requirements,
            status=target_status,
            published_at=utc_now() if target_status == ChallengeStatus.PUBLISHED else None,
        )
        db.add(challenge)
        db.flush()

        # Add initial KPIs if provided
        if payload.kpis:
            for kpi_in in payload.kpis:
                kpi = ChallengeKPI(
                    challenge_id=challenge.id,
                    name=kpi_in.name.strip(),
                    description=kpi_in.description.strip() if kpi_in.description else None,
                    measurement_unit=kpi_in.measurement_unit.strip(),
                    baseline_value=kpi_in.baseline_value,
                    target_value=kpi_in.target_value,
                    measurement_method=kpi_in.measurement_method.strip() if kpi_in.measurement_method else None,
                    weight=kpi_in.weight,
                )
                db.add(kpi)
            db.flush()

        # Record Audit Log
        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_CREATED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({
                "challenge_code": challenge.challenge_code,
                "title": challenge.title,
                "department_id": challenge.department_id,
                "status": challenge.status.value,
                "kpis_count": len(payload.kpis) if payload.kpis else 0,
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(challenge)

        return cls.format_challenge_response(challenge)

    @classmethod
    def list_challenges(
        cls,
        db: Session,
        current_user: Optional[User] = None,
        domain: Optional[str] = None,
        sector: Optional[str] = None,
        department_id: Optional[str] = None,
        geographical_scope: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[ChallengeResponse]:
        """
        List challenges with role-based visibility rules:
        - Anonymous & Startups: ONLY see PUBLISHED challenges.
        - Government: See own department's challenges (all statuses) + published from others.
        - Admin: See all challenges across all departments and statuses.
        """
        query = db.query(Challenge)

        # RBAC Visibility Filter: Public & Startups must NOT see DRAFT, CANCELLED, or ARCHIVED
        if not current_user or current_user.role not in {"GOVERNMENT", "ADMIN"}:
            query = query.filter(
                Challenge.status.notin_([
                    ChallengeStatus.DRAFT,
                    ChallengeStatus.CANCELLED,
                    ChallengeStatus.ARCHIVED,
                ])
            )
        elif current_user.role == "GOVERNMENT":
            user_dept_id = current_user.department_id
            if user_dept_id:
                query = query.filter(
                    or_(
                        Challenge.department_id == user_dept_id,
                        Challenge.status.notin_([
                            ChallengeStatus.DRAFT,
                            ChallengeStatus.CANCELLED,
                            ChallengeStatus.ARCHIVED,
                        ]),
                    )
                )
            else:
                query = query.filter(
                    Challenge.status.notin_([
                        ChallengeStatus.DRAFT,
                        ChallengeStatus.CANCELLED,
                        ChallengeStatus.ARCHIVED,
                    ])
                )
        # Admin can view all

        # Domain / Sector Filter
        target_domain = domain or sector
        if target_domain and target_domain.upper() != "ALL":
            query = query.filter(Challenge.domain.ilike(f"%{target_domain}%"))

        # Department Filter
        if department_id:
            query = query.filter(Challenge.department_id == department_id)

        # Geographical Scope
        if geographical_scope:
            query = query.filter(Challenge.geographical_scope.ilike(f"%{geographical_scope}%"))

        # Explicit Status Filter (only applied within allowed visibility)
        if status_filter and status_filter.upper() != "ALL":
            query = query.filter(Challenge.status == status_filter.upper())

        # Search filter
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Challenge.title.ilike(s),
                    Challenge.challenge_code.ilike(s),
                    Challenge.problem_statement.ilike(s),
                    Challenge.desired_outcome.ilike(s),
                )
            )

        challenges = query.order_by(Challenge.created_at.desc()).all()
        return [cls.format_challenge_response(c) for c in challenges]

    @classmethod
    def get_challenge_by_id(
        cls,
        db: Session,
        challenge_id: str,
        current_user: Optional[User] = None,
    ) -> ChallengeResponse:
        """
        Get challenge details with visibility enforcement:
        DRAFT, CANCELLED, and ARCHIVED are strictly restricted to owning department or Admin.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found.",
            )

        # Visibility Check for Draft / Cancelled / Archived Challenges
        if challenge.status in {ChallengeStatus.DRAFT, ChallengeStatus.CANCELLED, ChallengeStatus.ARCHIVED}:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Challenge not found.",
                )
            if current_user.role == "ADMIN":
                pass
            elif current_user.role == "GOVERNMENT":
                if current_user.department_id != challenge.department_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have authorization to view unpublished challenges of another department.",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unpublished drafts and cancelled challenges are restricted from public and startup access.",
                )

        return cls.format_challenge_response(challenge)

    @classmethod
    def update_challenge(
        cls,
        db: Session,
        current_user: User,
        challenge_id: str,
        payload: ChallengeUpdateRequest,
    ) -> ChallengeResponse:
        """
        Update an existing challenge. Only allowable by owning department or Admin.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        if challenge.status in {ChallengeStatus.CLOSED, ChallengeStatus.CANCELLED, ChallengeStatus.ARCHIVED}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit a challenge in {challenge.status.value} status.",
            )

        update_data = payload.model_dump(exclude_unset=True)

        if challenge.status != ChallengeStatus.DRAFT:
            restricted_fields = {
                "problem_statement",
                "desired_outcome",
                "outcome_definition",
                "current_state",
                "budget_min",
                "budget_max",
                "budget_estimate",
                "domain",
                "target_sector",
                "department_id",
            }
            attempted_restricted = [f for f in update_data.keys() if f in restricted_fields]
            if attempted_restricted:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot modify core challenge fields ({', '.join(attempted_restricted)}) once published.",
                )
        for key, value in update_data.items():
            if value is not None and hasattr(challenge, key):
                setattr(challenge, key, value)

        # Audit Log
        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_UPDATED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({"updated_fields": list(update_data.keys())}),
        )
        db.add(audit)
        db.commit()
        db.refresh(challenge)

        return cls.format_challenge_response(challenge)

    @classmethod
    def validate_for_publish(cls, challenge: Challenge) -> Tuple[bool, List[str]]:
        """
        Validate all mandatory criteria before allowing a challenge to be published.
        """
        missing: List[str] = []

        if not challenge.title or len(challenge.title.strip()) < 5:
            missing.append("Challenge title (minimum 5 characters)")

        if not challenge.department_id:
            missing.append("Designated sponsoring department")

        if not challenge.problem_statement or len(challenge.problem_statement.strip()) < 10:
            missing.append("Problem statement (minimum 10 characters)")

        if not challenge.desired_outcome or len(challenge.desired_outcome.strip()) < 10:
            missing.append("Desired outcome definition (minimum 10 characters)")

        if not challenge.domain or len(challenge.domain.strip()) < 2:
            missing.append("Operational sector / domain")

        if not challenge.budget_max or challenge.budget_max <= 0:
            missing.append("Maximum pilot grant / procurement budget")

        if not challenge.application_deadline:
            missing.append("Application submission deadline")
        else:
            dl = challenge.application_deadline
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            now = utc_now()
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            if dl <= now:
                missing.append("Application deadline must be a future date and time")

        if not challenge.pilot_duration_days or challenge.pilot_duration_days <= 0:
            missing.append("Estimated pilot sandbox duration in days")

        if not challenge.kpis or len(challenge.kpis) == 0:
            missing.append("At least one quantitative KPI is required before publishing")
        else:
            for i, k in enumerate(challenge.kpis):
                if k.target_value is None:
                    missing.append(f"KPI #{i + 1} ({k.name}) is missing a quantitative target value")

        if not challenge.eligibility_requirements or len(challenge.eligibility_requirements.strip()) < 5:
            missing.append("Startup eligibility and stage requirements (e.g. DPIIT recognized, minimum TRL)")

        return len(missing) == 0, missing

    @classmethod
    def publish_challenge(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> ChallengeResponse:
        """
        Validate and publish a challenge.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        if challenge.status == ChallengeStatus.PUBLISHED:
            return cls.format_challenge_response(challenge)

        if challenge.status in {ChallengeStatus.CLOSED, ChallengeStatus.CANCELLED}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot publish a challenge that has been {challenge.status.value.lower()}.",
            )

        can_publish, missing = cls.validate_for_publish(challenge)
        if not can_publish:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Challenge does not meet all publishing criteria.",
                    "missing_requirements": missing,
                },
            )

        challenge.status = ChallengeStatus.PUBLISHED
        challenge.published_at = utc_now()

        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_PUBLISHED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({
                "challenge_code": challenge.challenge_code,
                "published_at": challenge.published_at.isoformat(),
            }),
        )
        db.add(audit)
        db.commit()
        db.refresh(challenge)

        return cls.format_challenge_response(challenge)

    @classmethod
    def close_challenge(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> ChallengeResponse:
        """
        Close a challenge for new applications.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        if challenge.status != ChallengeStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only published challenges can be closed. Current status: {challenge.status.value}.",
            )

        challenge.status = ChallengeStatus.CLOSED
        challenge.closed_at = utc_now()

        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_CLOSED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({"closed_at": challenge.closed_at.isoformat()}),
        )
        db.add(audit)
        db.commit()
        db.refresh(challenge)

        return cls.format_challenge_response(challenge)

    @classmethod
    def cancel_challenge(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> ChallengeResponse:
        """
        Cancel a challenge (withdrawing it from the public directory).
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        challenge.status = ChallengeStatus.CANCELLED

        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_CANCELLED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({"status": "CANCELLED"}),
        )
        db.add(audit)
        db.commit()
        db.refresh(challenge)

        return cls.format_challenge_response(challenge)

    @classmethod
    def delete_challenge(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> dict:
        """
        Delete a draft challenge. Only DRAFT challenges can be deleted.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        if challenge.status != ChallengeStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft challenges can be deleted. Published challenges must be closed or cancelled.",
            )

        audit = AuditLog(
            user_id=current_user.id,
            action="CHALLENGE_DELETED",
            entity_type="Challenge",
            entity_id=challenge.id,
            details_json=json.dumps({"challenge_code": challenge.challenge_code, "title": challenge.title}),
        )
        db.add(audit)
        db.delete(challenge)
        db.commit()

        return {"message": "Draft challenge successfully deleted.", "challenge_id": challenge_id}

    # ==============================================================================
    # KPI Management
    # ==============================================================================

    @classmethod
    def list_kpis(cls, db: Session, challenge_id: str) -> List[KPIResponse]:
        kpis = (
            db.query(ChallengeKPI)
            .filter(ChallengeKPI.challenge_id == challenge_id)
            .order_by(ChallengeKPI.created_at.asc())
            .all()
        )
        return [KPIResponse.model_validate(k) for k in kpis]

    @classmethod
    def create_kpi(
        cls, db: Session, current_user: User, challenge_id: str, payload: KPICreateRequest
    ) -> KPIResponse:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        kpi = ChallengeKPI(
            challenge_id=challenge_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            measurement_unit=payload.measurement_unit.strip(),
            baseline_value=payload.baseline_value,
            target_value=payload.target_value,
            measurement_method=payload.measurement_method.strip() if payload.measurement_method else None,
            weight=payload.weight,
        )
        db.add(kpi)
        db.flush()

        audit = AuditLog(
            user_id=current_user.id,
            action="KPI_CREATED",
            entity_type="ChallengeKPI",
            entity_id=kpi.id,
            details_json=json.dumps({"challenge_id": challenge_id, "kpi_name": kpi.name}),
        )
        db.add(audit)
        db.commit()
        db.refresh(kpi)

        return KPIResponse.model_validate(kpi)

    @classmethod
    def update_kpi(
        cls, db: Session, current_user: User, challenge_id: str, kpi_id: str, payload: KPIUpdateRequest
    ) -> KPIResponse:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        kpi = db.query(ChallengeKPI).filter(
            ChallengeKPI.id == kpi_id,
            ChallengeKPI.challenge_id == challenge_id,
        ).first()
        if not kpi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI not found.")

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None and hasattr(kpi, key):
                setattr(kpi, key, value)

        audit = AuditLog(
            user_id=current_user.id,
            action="KPI_UPDATED",
            entity_type="ChallengeKPI",
            entity_id=kpi.id,
            details_json=json.dumps({"challenge_id": challenge_id, "updated_fields": list(update_data.keys())}),
        )
        db.add(audit)
        db.commit()
        db.refresh(kpi)

        return KPIResponse.model_validate(kpi)

    @classmethod
    def delete_kpi(
        cls, db: Session, current_user: User, challenge_id: str, kpi_id: str
    ) -> dict:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        kpi = db.query(ChallengeKPI).filter(
            ChallengeKPI.id == kpi_id,
            ChallengeKPI.challenge_id == challenge_id,
        ).first()
        if not kpi:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI not found.")

        audit = AuditLog(
            user_id=current_user.id,
            action="KPI_DELETED",
            entity_type="ChallengeKPI",
            entity_id=kpi.id,
            details_json=json.dumps({"challenge_id": challenge_id, "kpi_name": kpi.name}),
        )
        db.add(audit)
        db.delete(kpi)
        db.commit()

        return {"message": "KPI successfully removed.", "kpi_id": kpi_id}

    # ==============================================================================
    # Applications (Maintained for backward compatibility with Stage 1)
    # ==============================================================================

    @classmethod
    def submit_application(
        cls,
        db: Session,
        current_user: User,
        challenge_id: str,
        payload: ApplicationCreateRequest,
    ) -> ApplicationResponse:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        if challenge.status != ChallengeStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This challenge is not currently accepting applications (Status: {challenge.status.value}).",
            )

        startup_id = current_user.startup_id
        if not startup_id:
            startup = Startup(
                company_name=f"{current_user.full_name}'s Startup",
                dpiit_recognized=True,
                sector="CivicTech",
            )
            db.add(startup)
            db.flush()
            current_user.startup_id = startup.id
            startup_id = startup.id

        existing = (
            db.query(Application)
            .filter(
                Application.challenge_id == challenge_id,
                Application.startup_id == startup_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your startup has already submitted a proposal for this challenge.",
            )

        application = Application(
            challenge_id=challenge_id,
            startup_id=startup_id,
            proposal_summary=payload.proposal_summary.strip(),
            technical_approach=payload.technical_approach.strip(),
            proposed_solution_trl=payload.proposed_solution_trl.strip(),
            pitch_deck_url=payload.pitch_deck_url,
            status=ApplicationStatus.SUBMITTED,
        )
        db.add(application)
        db.flush()

        audit = AuditLog(
            user_id=current_user.id,
            action="APPLICATION_SUBMITTED",
            entity_type="Application",
            entity_id=application.id,
            details_json=json.dumps({"challenge_id": challenge_id, "startup_id": startup_id}),
        )
        db.add(audit)
        db.commit()
        db.refresh(application)

        return cls.format_application_response(application)

    @classmethod
    def list_applications_for_challenge(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> List[ApplicationResponse]:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        cls.check_department_ownership(current_user, challenge)

        apps = (
            db.query(Application)
            .filter(Application.challenge_id == challenge_id)
            .order_by(Application.submitted_at.desc())
            .all()
        )
        return [cls.format_application_response(a) for a in apps]

    @classmethod
    def list_my_applications(
        cls, db: Session, current_user: User
    ) -> List[ApplicationResponse]:
        startup_id = current_user.startup_id
        if not startup_id:
            return []

        apps = (
            db.query(Application)
            .filter(Application.startup_id == startup_id)
            .order_by(Application.submitted_at.desc())
            .all()
        )
        return [cls.format_application_response(a) for a in apps]

    # ==============================================================================
    # Formatters
    # ==============================================================================

    @classmethod
    def format_challenge_response(cls, challenge: Challenge) -> ChallengeResponse:
        dept_name = challenge.department.name if challenge.department else None
        min_name = challenge.department.ministry if challenge.department else None
        creator_name = challenge.creator.full_name if challenge.creator else None
        apps_count = len(challenge.applications) if challenge.applications else 0
        kpi_list = [KPIResponse.model_validate(k) for k in challenge.kpis] if challenge.kpis else []

        budget_min_val = float(challenge.budget_min) if challenge.budget_min is not None else None
        budget_max_val = float(challenge.budget_max) if challenge.budget_max is not None else None

        return ChallengeResponse(
            id=challenge.id,
            challenge_code=challenge.challenge_code or f"GI-2026-{challenge.id[:4]}",
            title=challenge.title,
            problem_statement=challenge.problem_statement,
            current_state=challenge.current_state,
            desired_outcome=challenge.desired_outcome,
            outcome_definition=challenge.desired_outcome,
            challenge_description=challenge.challenge_description,
            target_beneficiaries=challenge.target_beneficiaries,
            technology_preferences=challenge.technology_preferences,
            technology_restrictions=challenge.technology_restrictions,
            domain=challenge.domain,
            target_sector=challenge.domain,
            geographical_scope=challenge.geographical_scope,
            budget_min=budget_min_val,
            budget_max=budget_max_val,
            budget_estimate=budget_max_val,
            currency=challenge.currency or "INR",
            pilot_duration_days=challenge.pilot_duration_days or 90,
            pilot_duration_months=challenge.pilot_duration_months,
            application_deadline=challenge.application_deadline,
            pilot_start_date=challenge.pilot_start_date,
            data_requirements=challenge.data_requirements,
            security_requirements=challenge.security_requirements,
            compliance_requirements=challenge.compliance_requirements,
            intellectual_property_requirements=challenge.intellectual_property_requirements,
            eligibility_requirements=challenge.eligibility_requirements,
            status=challenge.status,
            department_id=challenge.department_id,
            department_name=dept_name,
            ministry=min_name,
            created_by=challenge.created_by,
            creator_name=creator_name,
            published_at=challenge.published_at,
            closed_at=challenge.closed_at,
            applications_count=apps_count,
            kpis=kpi_list,
            created_at=challenge.created_at,
            updated_at=challenge.updated_at,
        )

    _to_challenge_response = format_challenge_response

    @classmethod
    def format_application_response(cls, app: Application) -> ApplicationResponse:
        comp_name = app.startup.company_name if app.startup else None
        ch_title = app.challenge.title if app.challenge else None

        return ApplicationResponse(
            id=app.id,
            challenge_id=app.challenge_id,
            challenge_title=ch_title,
            startup_id=app.startup_id,
            company_name=comp_name,
            proposal_summary=app.proposal_summary,
            technical_approach=app.technical_approach,
            proposed_solution_trl=app.proposed_solution_trl,
            pitch_deck_url=app.pitch_deck_url,
            status=app.status,
            submitted_at=app.submitted_at or app.created_at or datetime.now(timezone.utc),
        )
