import io
import json
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse

from app.models.user import User
from app.models.pilot import Pilot, PilotStatus, PilotSuccessStatus
from app.models.pilot_kpi import (
    PilotKPI,
    KPICategory,
    KPIMeasurementType,
    KPIDirection,
    TargetOperator,
    KPIStatus,
    KPIMeasurement,
    MeasurementStatus,
    KPIEvidence,
    EvidenceType,
    EvidenceStatus,
)
from app.models.validation_workflow import (
    ValidatorProfile,
    ValidatorAvailability,
    ValidationAssignment,
    AssignmentStatus,
    ValidatorConflictOfInterest,
    ValidatorCOIDeclaration,
    ValidationReport,
    ValidationAssessment,
    ValidationConfidence,
    KPIValidation,
    KPIValidationResult,
    PilotValidationStatus,
)
from app.models.audit_log import AuditLog
from app.core.security import UserRole
from app.core.storage import storage_service
from app.core.datetime_utils import utc_now
from app.services.kpi_calculation_service import KPICalculationService

from app.schemas.kpi_validation import (
    PilotKPICreateRequest,
    PilotKPIUpdateRequest,
    PilotKPIResponse,
    KPIMeasurementCreateRequest,
    KPIMeasurementResponse,
    KPIEvidenceResponse,
    ValidatorProfileCreateRequest,
    ValidatorProfileUpdateRequest,
    ValidatorProfileResponse,
    ValidationAssignmentCreateRequest,
    ValidationAssignmentRespondRequest,
    ValidationAssignmentResponse,
    COIDeclarationRequest,
    COIDeclarationResponse,
    KPIValidationInput,
    KPIValidationResponse,
    ValidationReportDraftRequest,
    ValidationReportSubmitRequest,
    ValidationReportReopenRequest,
    ValidationReportResponse,
    PilotSuccessConfirmationRequest,
    PilotValidationSummaryResponse,
)


class KPIValidationService:
    """
    Enterprise Business Service for Step 7: KPI Measurement & Independent Validation.
    Answers: 'Did the pilot achieve the intended outcome?'
    Enforces deterministic scoring, COI integrity gating, report immutability,
    government pilot success classification, audit logging, and ReportLab PDF export.
    """

    # -------------------------------------------------------------
    # ACCESS CONTROLS & HELPERS
    # -------------------------------------------------------------
    @classmethod
    def get_pilot_or_404(cls, db: Session, pilot_id: str) -> Pilot:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pilot with ID '{pilot_id}' not found.",
            )
        return pilot

    @classmethod
    def verify_pilot_access(
        cls,
        db: Session,
        current_user: User,
        pilot: Pilot,
        require_gov_or_admin: bool = False,
        allow_assigned_validator: bool = False,
    ) -> None:
        if current_user.role == UserRole.ADMIN:
            return

        if require_gov_or_admin:
            if current_user.role != UserRole.GOVERNMENT:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Government departmental clearance or Admin role is required.",
                )
            if (
                pilot.government_department_id
                and current_user.department_id
                and pilot.government_department_id != current_user.department_id
                and pilot.government_owner_id != current_user.id
                and pilot.created_by != current_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted: This pilot is managed by another department.",
                )
            return

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
                    detail="Access restricted: Pilot managed by another department.",
                )
            return

        if current_user.role == UserRole.STARTUP:
            if pilot.startup_id and current_user.startup_id and pilot.startup_id != current_user.startup_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted: This pilot belongs to a different startup.",
                )
            return

        if allow_assigned_validator:
            # Check if user has an active validator profile and assignment for this pilot
            val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
            if val_profile:
                assignment = (
                    db.query(ValidationAssignment)
                    .filter(
                        ValidationAssignment.pilot_id == pilot.id,
                        ValidationAssignment.validator_id == val_profile.id,
                    )
                    .first()
                )
                if assignment:
                    return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view or manage this pilot's KPI data.",
        )

    @classmethod
    def log_audit(
        cls,
        db: Session,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=resource_type,
            entity_id=resource_id,
            metadata_json=json.dumps(details) if details else None,
        )
        db.add(audit)

    # -------------------------------------------------------------
    # 1. PILOT KPI CRUD
    # -------------------------------------------------------------
    @classmethod
    def create_pilot_kpi(
        cls, db: Session, pilot_id: str, payload: PilotKPICreateRequest, current_user: User
    ) -> PilotKPIResponse:
        pilot = cls.get_pilot_or_404(db, pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        kpi = PilotKPI(
            pilot_id=pilot.id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            category=payload.category,
            measurement_type=payload.measurement_type,
            unit=payload.unit.strip(),
            baseline_value=payload.baseline_value,
            baseline_date=payload.baseline_date,
            baseline_source=payload.baseline_source.strip() if payload.baseline_source else None,
            baseline_notes=payload.baseline_notes.strip() if payload.baseline_notes else None,
            target_value=payload.target_value,
            target_date=payload.target_date,
            target_operator=payload.target_operator,
            direction=payload.direction,
            weight=payload.weight,
            status=KPIStatus.DRAFT.value,
            verification_method=payload.verification_method.strip() if payload.verification_method else None,
            data_source=payload.data_source.strip() if payload.data_source else None,
            target_description=payload.target_description.strip() if payload.target_description else None,
            created_by=current_user.id,
        )
        db.add(kpi)
        db.commit()
        db.refresh(kpi)

        cls.log_audit(
            db,
            current_user.id,
            "KPI_CREATED",
            "pilot_kpi",
            kpi.id,
            {"pilot_id": pilot.id, "kpi_name": kpi.name, "target_value": float(kpi.target_value)},
        )
        db.commit()

        return cls._format_kpi_response(kpi)

    @classmethod
    def get_pilot_kpis(
        cls, db: Session, pilot_id: str, current_user: User
    ) -> List[PilotKPIResponse]:
        pilot = cls.get_pilot_or_404(db, pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        kpis = (
            db.query(PilotKPI)
            .filter(PilotKPI.pilot_id == pilot.id)
            .order_by(PilotKPI.created_at.asc())
            .all()
        )
        return [cls._format_kpi_response(k) for k in kpis]

    @classmethod
    def get_kpi_detail(cls, db: Session, kpi_id: str, current_user: User) -> PilotKPIResponse:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)
        return cls._format_kpi_response(kpi, include_nested=True)

    @classmethod
    def update_pilot_kpi(
        cls, db: Session, kpi_id: str, payload: PilotKPIUpdateRequest, current_user: User
    ) -> PilotKPIResponse:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if hasattr(value, "value"):
                    setattr(kpi, key, value.value)
                else:
                    setattr(kpi, key, value)

        db.commit()
        db.refresh(kpi)

        cls.log_audit(
            db,
            current_user.id,
            "KPI_UPDATED",
            "pilot_kpi",
            kpi.id,
            {"pilot_id": pilot.id, "updated_fields": list(update_data.keys())},
        )
        db.commit()

        return cls._format_kpi_response(kpi)

    @classmethod
    def delete_pilot_kpi(cls, db: Session, kpi_id: str, current_user: User) -> Dict[str, str]:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        db.delete(kpi)
        cls.log_audit(
            db,
            current_user.id,
            "KPI_DELETED",
            "pilot_kpi",
            kpi_id,
            {"pilot_id": pilot.id, "kpi_name": kpi.name},
        )
        db.commit()
        return {"message": f"KPI '{kpi.name}' successfully deleted."}

    # -------------------------------------------------------------
    # 2. MEASUREMENT RECORDING & REVIEW
    # -------------------------------------------------------------
    @classmethod
    def record_measurement(
        cls, db: Session, kpi_id: str, payload: KPIMeasurementCreateRequest, current_user: User
    ) -> KPIMeasurementResponse:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot)

        measurement = KPIMeasurement(
            kpi_id=kpi.id,
            pilot_id=pilot.id,
            measured_value=payload.measured_value,
            measurement_date=payload.measurement_date,
            reporting_period_start=payload.reporting_period_start,
            reporting_period_end=payload.reporting_period_end,
            measured_by=current_user.id,
            measurement_method=payload.measurement_method.strip() if payload.measurement_method else None,
            data_sources_used=payload.data_sources_used.strip() if payload.data_sources_used else None,
            sample_size=payload.sample_size,
            calculation_notes=payload.calculation_notes.strip() if payload.calculation_notes else None,
            status=MeasurementStatus.SUBMITTED.value,
        )
        db.add(measurement)

        # Update KPI status to ACTIVE if it was DRAFT
        if kpi.status == KPIStatus.DRAFT.value:
            kpi.status = KPIStatus.ACTIVE.value

        db.commit()
        db.refresh(measurement)

        cls.log_audit(
            db,
            current_user.id,
            "KPI_MEASUREMENT_RECORDED",
            "kpi_measurement",
            measurement.id,
            {
                "kpi_id": kpi.id,
                "measured_value": float(measurement.measured_value),
                "measurement_date": str(measurement.measurement_date),
            },
        )
        db.commit()

        return cls._format_measurement_response(measurement)

    @classmethod
    def get_kpi_measurements(
        cls, db: Session, kpi_id: str, current_user: User
    ) -> List[KPIMeasurementResponse]:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        measurements = (
            db.query(KPIMeasurement)
            .filter(KPIMeasurement.kpi_id == kpi.id)
            .order_by(KPIMeasurement.measurement_date.desc(), KPIMeasurement.created_at.desc())
            .all()
        )
        return [cls._format_measurement_response(m) for m in measurements]

    # -------------------------------------------------------------
    # 3. KPI EVIDENCE UPLOAD & RETRIEVAL
    # -------------------------------------------------------------
    @classmethod
    def upload_evidence(
        cls,
        db: Session,
        kpi_id: str,
        upload_file: UploadFile,
        title: str,
        description: Optional[str],
        evidence_type: str,
        measurement_id: Optional[str],
        source: Optional[str],
        current_user: User,
    ) -> KPIEvidenceResponse:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot)

        # Handle versioning: check latest version for this KPI with same title
        latest_version = (
            db.query(func.max(KPIEvidence.version))
            .filter(KPIEvidence.kpi_id == kpi.id, KPIEvidence.title == title.strip())
            .scalar()
            or 0
        )
        version = latest_version + 1

        # Save physical file
        saved_file = storage_service.save_file(upload_file)

        evidence = KPIEvidence(
            kpi_id=kpi.id,
            measurement_id=measurement_id,
            pilot_id=pilot.id,
            title=title.strip(),
            description=description.strip() if description else None,
            evidence_type=evidence_type,
            file_name=saved_file.get("original_filename") or saved_file.get("file_name", "evidence_document"),
            storage_key=saved_file.get("stored_filename") or saved_file.get("storage_key", ""),
            mime_type=saved_file.get("mime_type", "application/octet-stream"),
            file_size=saved_file.get("file_size", 0),
            version=version,
            source=source.strip() if source else None,
            status=EvidenceStatus.UPLOADED.value,
            submitted_by=current_user.id,
            submitted_at=utc_now(),
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        cls.log_audit(
            db,
            current_user.id,
            "KPI_EVIDENCE_UPLOADED",
            "kpi_evidence",
            evidence.id,
            {
                "kpi_id": kpi.id,
                "file_name": evidence.file_name,
                "version": evidence.version,
                "evidence_type": evidence.evidence_type,
            },
        )
        db.commit()

        return cls._format_evidence_response(evidence)

    @classmethod
    def get_kpi_evidences(
        cls, db: Session, kpi_id: str, current_user: User
    ) -> List[KPIEvidenceResponse]:
        kpi = db.query(PilotKPI).filter(PilotKPI.id == kpi_id).first()
        if not kpi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"KPI with ID '{kpi_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, kpi.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        evidences = (
            db.query(KPIEvidence)
            .filter(KPIEvidence.kpi_id == kpi.id)
            .order_by(KPIEvidence.created_at.desc())
            .all()
        )
        return [cls._format_evidence_response(e) for e in evidences]

    @classmethod
    def get_evidence_file(cls, db: Session, evidence_id: str, current_user: User) -> Tuple[Path, str, str]:
        evidence = db.query(KPIEvidence).filter(KPIEvidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence with ID '{evidence_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, evidence.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        file_path = storage_service.get_file_path(evidence.storage_key)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Physical evidence file not found in storage.",
            )
        return file_path, evidence.file_name, evidence.mime_type

    # -------------------------------------------------------------
    # 4. VALIDATOR PROFILES & ASSIGNMENT MANAGEMENT
    # -------------------------------------------------------------
    @classmethod
    def create_or_update_validator_profile(
        cls, db: Session, payload: ValidatorProfileCreateRequest, current_user: User
    ) -> ValidatorProfileResponse:
        existing = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if existing:
            existing.organization = payload.organization.strip()
            existing.domain_expertise = payload.domain_expertise
            existing.qualifications = payload.qualifications
            existing.accreditations = payload.accreditations
            existing.years_of_experience = payload.years_of_experience
            existing.contact_phone = payload.contact_phone
            profile = existing
        else:
            profile = ValidatorProfile(
                user_id=current_user.id,
                organization=payload.organization.strip(),
                domain_expertise=payload.domain_expertise,
                qualifications=payload.qualifications,
                accreditations=payload.accreditations,
                years_of_experience=payload.years_of_experience,
                contact_phone=payload.contact_phone,
                availability=ValidatorAvailability.AVAILABLE.value,
                is_verified=True,
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)
        return cls._format_validator_profile_response(profile)

    @classmethod
    def list_validators(
        cls, db: Session, availability: Optional[str] = None
    ) -> List[ValidatorProfileResponse]:
        query = db.query(ValidatorProfile)
        if availability:
            query = query.filter(ValidatorProfile.availability == availability)
        profiles = query.order_by(ValidatorProfile.rating.desc().nullslast(), ValidatorProfile.organization.asc()).all()
        return [cls._format_validator_profile_response(p) for p in profiles]

    @classmethod
    def assign_validator(
        cls, db: Session, payload: ValidationAssignmentCreateRequest, current_user: User
    ) -> ValidationAssignmentResponse:
        pilot = cls.get_pilot_or_404(db, payload.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        validator = db.query(ValidatorProfile).filter(ValidatorProfile.id == payload.validator_id).first()
        if not validator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Validator profile '{payload.validator_id}' not found.",
            )

        # Check existing active assignment
        existing_assignment = (
            db.query(ValidationAssignment)
            .filter(
                ValidationAssignment.pilot_id == pilot.id,
                ValidationAssignment.validator_id == validator.id,
                ValidationAssignment.status.in_([
                    AssignmentStatus.ASSIGNED.value,
                    AssignmentStatus.ACCEPTED.value,
                    AssignmentStatus.IN_PROGRESS.value,
                ]),
            )
            .first()
        )
        if existing_assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This validator is already actively assigned to this pilot.",
            )

        # Mark other assignments as REASSIGNED if replacing
        db.query(ValidationAssignment).filter(
            ValidationAssignment.pilot_id == pilot.id,
            ValidationAssignment.status.in_([
                AssignmentStatus.ASSIGNED.value,
                AssignmentStatus.ACCEPTED.value,
                AssignmentStatus.IN_PROGRESS.value,
            ]),
        ).update({"status": AssignmentStatus.REASSIGNED.value}, synchronize_session=False)

        assignment = ValidationAssignment(
            pilot_id=pilot.id,
            validator_id=validator.id,
            assigned_by=current_user.id,
            scope=payload.scope.strip() if payload.scope else None,
            terms_of_reference=payload.terms_of_reference.strip() if payload.terms_of_reference else None,
            deadline=payload.deadline,
            status=AssignmentStatus.ASSIGNED.value,
            coi_declared=False,
            coi_status=ValidatorCOIDeclaration.NO_CONFLICT.value,
        )
        db.add(assignment)

        # Update pilot validation status
        pilot.validation_status = PilotValidationStatus.VALIDATOR_ASSIGNED.value
        db.commit()
        db.refresh(assignment)

        cls.log_audit(
            db,
            current_user.id,
            "VALIDATOR_ASSIGNED",
            "validation_assignment",
            assignment.id,
            {"pilot_id": pilot.id, "validator_id": validator.id},
        )
        db.commit()

        return cls._format_assignment_response(assignment)

    @classmethod
    def respond_to_assignment(
        cls, db: Session, assignment_id: str, payload: ValidationAssignmentRespondRequest, current_user: User
    ) -> ValidationAssignmentResponse:
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment '{assignment_id}' not found.",
            )

        # Must be assigned validator or admin
        val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if current_user.role != UserRole.ADMIN and (not val_profile or val_profile.id != assignment.validator_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned validator can respond to this assignment.",
            )

        action = payload.action.upper()
        if action == "ACCEPT":
            assignment.status = AssignmentStatus.ACCEPTED.value
            assignment.response_date = utc_now()
        elif action == "DECLINE":
            assignment.status = AssignmentStatus.DECLINED.value
            assignment.decline_reason = payload.decline_reason
            assignment.response_date = utc_now()
            # Update pilot validation status back to pending assignment
            pilot = cls.get_pilot_or_404(db, assignment.pilot_id)
            pilot.validation_status = PilotValidationStatus.NOT_STARTED.value
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be ACCEPT or DECLINE.",
            )

        db.commit()
        db.refresh(assignment)

        cls.log_audit(
            db,
            current_user.id,
            f"VALIDATOR_ASSIGNMENT_{action}",
            "validation_assignment",
            assignment.id,
            {"action": action, "pilot_id": assignment.pilot_id},
        )
        db.commit()

        return cls._format_assignment_response(assignment)

    @classmethod
    def declare_conflict_of_interest(
        cls, db: Session, assignment_id: str, payload: COIDeclarationRequest, current_user: User
    ) -> COIDeclarationResponse:
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment '{assignment_id}' not found.",
            )

        val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if current_user.role != UserRole.ADMIN and (not val_profile or val_profile.id != assignment.validator_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned validator can declare conflict of interest.",
            )

        coi = ValidatorConflictOfInterest(
            assignment_id=assignment.id,
            validator_id=assignment.validator_id,
            pilot_id=assignment.pilot_id,
            declaration=payload.declaration.value,
            has_financial_interest=payload.has_financial_interest,
            has_past_employment=payload.has_past_employment,
            has_personal_relationship=payload.has_personal_relationship,
            has_competitive_interest=payload.has_competitive_interest,
            declaration_details=payload.declaration_details.strip() if payload.declaration_details else None,
            mitigation_notes=payload.mitigation_notes.strip() if payload.mitigation_notes else None,
            is_cleared=(payload.declaration == ValidatorCOIDeclaration.NO_CONFLICT),
            declared_at=utc_now(),
        )
        db.add(coi)

        assignment.coi_declared = True
        assignment.coi_status = payload.declaration.value
        assignment.coi_declaration_date = utc_now()
        assignment.coi_details = payload.declaration_details

        pilot = cls.get_pilot_or_404(db, assignment.pilot_id)

        # COI Integrity Gate
        if payload.declaration == ValidatorCOIDeclaration.CONFLICT_DECLARED:
            assignment.status = AssignmentStatus.DECLINED.value
            assignment.decline_reason = "Conflict of Interest declared by validator."
            pilot.validation_status = PilotValidationStatus.VALIDATOR_ASSIGNED.value
        else:
            assignment.status = AssignmentStatus.IN_PROGRESS.value
            pilot.validation_status = PilotValidationStatus.VALIDATION_IN_PROGRESS.value

        db.commit()
        db.refresh(coi)

        cls.log_audit(
            db,
            current_user.id,
            "COI_DECLARED",
            "validator_coi",
            coi.id,
            {"declaration": coi.declaration, "is_cleared": coi.is_cleared, "pilot_id": assignment.pilot_id},
        )
        db.commit()

        return cls._format_coi_response(coi)

    # -------------------------------------------------------------
    # 5. VALIDATOR WORKSPACE & REPORT DRAFT / SUBMISSION
    # -------------------------------------------------------------
    @classmethod
    def get_validator_assignments(
        cls, db: Session, current_user: User, status_filter: Optional[str] = None
    ) -> List[ValidationAssignmentResponse]:
        val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if not val_profile and current_user.role != UserRole.ADMIN:
            return []

        query = db.query(ValidationAssignment)
        if current_user.role != UserRole.ADMIN:
            query = query.filter(ValidationAssignment.validator_id == val_profile.id)
        if status_filter:
            query = query.filter(ValidationAssignment.status == status_filter)

        assignments = query.order_by(ValidationAssignment.created_at.desc()).all()
        return [cls._format_assignment_response(a) for a in assignments]

    @classmethod
    def get_validation_workspace(cls, db: Session, assignment_id: str, current_user: User) -> Dict[str, Any]:
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment '{assignment_id}' not found.",
            )

        pilot = cls.get_pilot_or_404(db, assignment.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        kpis = (
            db.query(PilotKPI)
            .filter(PilotKPI.pilot_id == pilot.id)
            .order_by(PilotKPI.created_at.asc())
            .all()
        )

        existing_report = (
            db.query(ValidationReport)
            .filter(ValidationReport.assignment_id == assignment.id)
            .first()
        )

        coi_record = (
            db.query(ValidatorConflictOfInterest)
            .filter(ValidatorConflictOfInterest.assignment_id == assignment.id)
            .order_by(ValidatorConflictOfInterest.declared_at.desc())
            .first()
        )

        return {
            "assignment": cls._format_assignment_response(assignment),
            "pilot": {
                "id": pilot.id,
                "pilot_code": pilot.pilot_code,
                "title": pilot.title,
                "status": pilot.status,
                "validation_status": pilot.validation_status,
                "start_date": pilot.start_date,
                "end_date": pilot.end_date or pilot.planned_end_date,
                "startup_name": pilot.startup.company_name if pilot.startup else None,
                "department_name": pilot.department.name if pilot.department else None,
            },
            "kpis": [cls._format_kpi_response(k, include_nested=True) for k in kpis],
            "coi": cls._format_coi_response(coi_record) if coi_record else None,
            "report": cls._format_report_response(existing_report) if existing_report else None,
        }

    @classmethod
    def save_draft_report(
        cls, db: Session, assignment_id: str, payload: ValidationReportDraftRequest, current_user: User
    ) -> ValidationReportResponse:
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment '{assignment_id}' not found.",
            )

        val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if current_user.role != UserRole.ADMIN and (not val_profile or val_profile.id != assignment.validator_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned validator can save draft reports.",
            )

        # Check COI gate
        if assignment.coi_status == ValidatorCOIDeclaration.CONFLICT_DECLARED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Validation locked: A Conflict of Interest was declared.",
            )

        report = db.query(ValidationReport).filter(ValidationReport.assignment_id == assignment.id).first()
        if report and report.status == "SUBMITTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Validation report has already been submitted and is locked.",
            )

        if not report:
            report = ValidationReport(
                pilot_id=assignment.pilot_id,
                validator_id=assignment.validator_id,
                assignment_id=assignment.id,
                status="DRAFT",
            )
            db.add(report)
            db.flush()

        # Update draft fields
        report.executive_summary = payload.executive_summary
        report.methodology = payload.methodology
        report.overall_assessment = payload.overall_assessment.value
        report.overall_achievement_percentage = payload.overall_achievement_percentage
        report.confidence_level = payload.confidence_level.value
        report.findings = payload.findings
        report.unintended_effects = payload.unintended_effects
        report.recommendations = payload.recommendations
        report.readiness_assessment = payload.readiness_assessment
        report.risks_and_limitations = payload.risks_and_limitations

        # Update KPI validations
        if payload.kpi_validations:
            # Clear existing items and re-insert
            db.query(KPIValidation).filter(KPIValidation.report_id == report.id).delete()
            for kv in payload.kpi_validations:
                item = KPIValidation(
                    report_id=report.id,
                    kpi_id=kv.kpi_id,
                    validator_measured_value=kv.validator_measured_value,
                    result=kv.result.value,
                    achievement_percentage=kv.achievement_percentage,
                    evidence_sufficiency=kv.evidence_sufficiency,
                    confidence_score=kv.confidence_score,
                    methodology_notes=kv.methodology_notes,
                    validator_commentary=kv.validator_commentary,
                    divergence_analysis=kv.divergence_analysis,
                )
                db.add(item)

        db.commit()
        db.refresh(report)
        return cls._format_report_response(report)

    @classmethod
    def submit_validation_report(
        cls, db: Session, assignment_id: str, payload: ValidationReportSubmitRequest, current_user: User
    ) -> ValidationReportResponse:
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment '{assignment_id}' not found.",
            )

        val_profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
        if current_user.role != UserRole.ADMIN and (not val_profile or val_profile.id != assignment.validator_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned validator can submit the validation report.",
            )

        # COI Gating Check
        if not assignment.coi_declared or assignment.coi_status != ValidatorCOIDeclaration.NO_CONFLICT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A clean Conflict of Interest declaration ('NO_CONFLICT') is mandatory before submitting report.",
            )

        pilot = cls.get_pilot_or_404(db, assignment.pilot_id)

        # Calculate or verify stats across KPIs
        pilot_kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == pilot.id).all()
        kpi_map = {k.id: k for k in pilot_kpis}

        eval_items = []
        achieved_count = 0
        for kv in payload.kpi_validations:
            target_kpi = kpi_map.get(kv.kpi_id)
            if not target_kpi:
                continue

            calc_res = KPICalculationService.evaluate_kpi(
                actual=kv.validator_measured_value,
                target=float(target_kpi.target_value),
                baseline=float(target_kpi.baseline_value) if target_kpi.baseline_value is not None else None,
                direction=target_kpi.direction,
                operator=target_kpi.target_operator,
            )

            # If validator supplied percentage, use it or fallback to deterministic
            final_pct = kv.achievement_percentage if kv.achievement_percentage is not None else calc_res["achievement_percentage"]
            final_result = kv.result.value if kv.result != KPIValidationResult.NOT_VALIDATED else calc_res["result"]

            if final_result == KPIValidationResult.ACHIEVED.value:
                achieved_count += 1

            eval_items.append({
                "weight": float(target_kpi.weight or 1.0),
                "achievement_percentage": final_pct,
                "is_met": (final_result == KPIValidationResult.ACHIEVED.value),
                "result": final_result,
            })

        calc_overall = KPICalculationService.calculate_overall_assessment(eval_items)

        overall_pct = (
            payload.overall_achievement_percentage
            if payload.overall_achievement_percentage is not None
            else calc_overall["overall_achievement_percentage"]
        )

        report = db.query(ValidationReport).filter(ValidationReport.assignment_id == assignment.id).first()
        if not report:
            report = ValidationReport(
                pilot_id=assignment.pilot_id,
                validator_id=assignment.validator_id,
                assignment_id=assignment.id,
            )
            db.add(report)
            db.flush()

        report.executive_summary = payload.executive_summary.strip()
        report.methodology = payload.methodology.strip()
        report.overall_assessment = payload.overall_assessment.value
        report.overall_achievement_percentage = overall_pct
        report.kpis_achieved_count = achieved_count
        report.kpis_total_count = len(payload.kpi_validations) or len(pilot_kpis)
        report.confidence_level = payload.confidence_level.value
        report.findings = payload.findings.strip()
        report.unintended_effects = payload.unintended_effects.strip() if payload.unintended_effects else None
        report.recommendations = payload.recommendations.strip()
        report.readiness_assessment = payload.readiness_assessment.strip() if payload.readiness_assessment else None
        report.risks_and_limitations = payload.risks_and_limitations.strip() if payload.risks_and_limitations else None
        report.status = "SUBMITTED"
        report.submitted_at = utc_now()

        # Update KPI Validation line items
        db.query(KPIValidation).filter(KPIValidation.report_id == report.id).delete()
        for kv in payload.kpi_validations:
            target_kpi = kpi_map.get(kv.kpi_id)
            calc_res = (
                KPICalculationService.evaluate_kpi(
                    actual=kv.validator_measured_value,
                    target=float(target_kpi.target_value),
                    baseline=float(target_kpi.baseline_value) if target_kpi.baseline_value is not None else None,
                    direction=target_kpi.direction,
                    operator=target_kpi.target_operator,
                )
                if target_kpi
                else {"achievement_percentage": 0.0, "result": "NOT_VALIDATED"}
            )

            val_item = KPIValidation(
                report_id=report.id,
                kpi_id=kv.kpi_id,
                validator_measured_value=kv.validator_measured_value,
                result=kv.result.value if kv.result != KPIValidationResult.NOT_VALIDATED else calc_res["result"],
                achievement_percentage=kv.achievement_percentage if kv.achievement_percentage is not None else calc_res["achievement_percentage"],
                evidence_sufficiency=kv.evidence_sufficiency,
                confidence_score=kv.confidence_score,
                methodology_notes=kv.methodology_notes,
                validator_commentary=kv.validator_commentary,
                divergence_analysis=kv.divergence_analysis,
            )
            db.add(val_item)

        # Update assignment & pilot statuses
        assignment.status = AssignmentStatus.COMPLETED.value
        pilot.validation_status = PilotValidationStatus.VALIDATION_SUBMITTED.value
        pilot.validator_assessment = report.overall_assessment

        # Increment validator validation count
        if val_profile:
            val_profile.validation_count = (val_profile.validation_count or 0) + 1

        db.commit()
        db.refresh(report)

        cls.log_audit(
            db,
            current_user.id,
            "VALIDATION_REPORT_SUBMITTED",
            "validation_report",
            report.id,
            {
                "pilot_id": pilot.id,
                "overall_assessment": report.overall_assessment,
                "achievement_percentage": float(report.overall_achievement_percentage or 0),
            },
        )
        db.commit()

        return cls._format_report_response(report)

    @classmethod
    def reopen_validation_report(
        cls, db: Session, report_id: str, payload: ValidationReportReopenRequest, current_user: User
    ) -> ValidationReportResponse:
        report = db.query(ValidationReport).filter(ValidationReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, report.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        report.status = "REOPENED"
        report.reopened_at = utc_now()
        report.reopened_by = current_user.id
        report.reopen_reason = payload.reopen_reason.strip()

        # Update assignment and pilot status
        assignment = db.query(ValidationAssignment).filter(ValidationAssignment.id == report.assignment_id).first()
        if assignment:
            assignment.status = AssignmentStatus.IN_PROGRESS.value

        pilot.validation_status = PilotValidationStatus.REVISION_REQUESTED.value

        db.commit()
        db.refresh(report)

        cls.log_audit(
            db,
            current_user.id,
            "VALIDATION_REPORT_REOPENED",
            "validation_report",
            report.id,
            {"pilot_id": pilot.id, "reopen_reason": report.reopen_reason},
        )
        db.commit()

        return cls._format_report_response(report)

    # -------------------------------------------------------------
    # 6. GOVERNMENT CONFIRMATION & DASHBOARD
    # -------------------------------------------------------------
    @classmethod
    def confirm_pilot_success_classification(
        cls, db: Session, pilot_id: str, payload: PilotSuccessConfirmationRequest, current_user: User
    ) -> PilotValidationSummaryResponse:
        pilot = cls.get_pilot_or_404(db, pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, require_gov_or_admin=True)

        # Verify validation report has been submitted
        report = (
            db.query(ValidationReport)
            .filter(ValidationReport.pilot_id == pilot.id, ValidationReport.status == "SUBMITTED")
            .order_by(ValidationReport.submitted_at.desc())
            .first()
        )
        if not report:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pilot success cannot be classified without a submitted independent validation report.",
            )

        target_status = payload.success_status.value

        # Enforce divergence justification rule
        if target_status != report.overall_assessment:
            if not payload.classification_divergence_reason or len(payload.classification_divergence_reason.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Government classification '{target_status}' diverges from the validator assessment "
                        f"'{report.overall_assessment}'. A comprehensive 'classification_divergence_reason' is required."
                    ),
                )
            pilot.classification_divergence_reason = payload.classification_divergence_reason.strip()

        pilot.success_status = target_status
        pilot.validation_status = PilotValidationStatus.VALIDATION_COMPLETED.value
        pilot.validator_assessment = report.overall_assessment
        pilot.classification_confirmed_by = current_user.id
        pilot.classification_confirmed_at = utc_now()
        pilot.classification_notes = payload.classification_notes.strip() if payload.classification_notes else None

        db.commit()
        db.refresh(pilot)

        cls.log_audit(
            db,
            current_user.id,
            "PILOT_SUCCESS_CLASSIFIED",
            "pilot",
            pilot.id,
            {
                "success_status": pilot.success_status,
                "validator_assessment": report.overall_assessment,
                "classification_confirmed_by": current_user.id,
            },
        )
        db.commit()

        return cls.get_pilot_validation_summary(db, pilot.id, current_user)

    @classmethod
    def get_pilot_validation_summary(
        cls, db: Session, pilot_id: str, current_user: User
    ) -> PilotValidationSummaryResponse:
        pilot = cls.get_pilot_or_404(db, pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        kpis = db.query(PilotKPI).filter(PilotKPI.pilot_id == pilot.id).all()
        active_assignment = (
            db.query(ValidationAssignment)
            .filter(
                ValidationAssignment.pilot_id == pilot.id,
                ValidationAssignment.status.in_([
                    AssignmentStatus.ASSIGNED.value,
                    AssignmentStatus.ACCEPTED.value,
                    AssignmentStatus.IN_PROGRESS.value,
                    AssignmentStatus.COMPLETED.value,
                ]),
            )
            .order_by(ValidationAssignment.created_at.desc())
            .first()
        )

        latest_report = (
            db.query(ValidationReport)
            .filter(ValidationReport.pilot_id == pilot.id)
            .order_by(ValidationReport.created_at.desc())
            .first()
        )

        total_kpis = len(kpis)
        achieved_kpis = latest_report.kpis_achieved_count if latest_report else 0
        avg_pct = float(latest_report.overall_achievement_percentage or 0.0) if latest_report else 0.0

        return PilotValidationSummaryResponse(
            pilot_id=pilot.id,
            pilot_code=pilot.pilot_code,
            title=pilot.title or "Untitled Pilot",
            status=pilot.status,
            validation_status=pilot.validation_status,
            success_status=pilot.success_status,
            validator_assessment=pilot.validator_assessment,
            classification_confirmed_by=pilot.classification_confirmed_by,
            classification_confirmed_at=pilot.classification_confirmed_at,
            classification_notes=pilot.classification_notes,
            classification_divergence_reason=pilot.classification_divergence_reason,
            total_kpis=total_kpis,
            achieved_kpis=achieved_kpis,
            average_achievement_percentage=avg_pct,
            active_assignment=cls._format_assignment_response(active_assignment) if active_assignment else None,
            latest_report=cls._format_report_response(latest_report) if latest_report else None,
        )

    @classmethod
    def get_validation_dashboard(cls, db: Session, current_user: User) -> Dict[str, Any]:
        """Department or platform-wide validation overview dashboard."""
        query = db.query(Pilot)
        if current_user.role == UserRole.GOVERNMENT and current_user.department_id:
            query = query.filter(Pilot.government_department_id == current_user.department_id)

        pilots = query.order_by(Pilot.created_at.desc()).all()

        counts = {
            "total_pilots": len(pilots),
            "not_started": sum(1 for p in pilots if p.validation_status == "NOT_STARTED"),
            "assigned": sum(1 for p in pilots if p.validation_status == "VALIDATOR_ASSIGNED"),
            "in_progress": sum(1 for p in pilots if p.validation_status == "VALIDATION_IN_PROGRESS"),
            "submitted": sum(1 for p in pilots if p.validation_status == "VALIDATION_SUBMITTED"),
            "completed": sum(1 for p in pilots if p.validation_status == "VALIDATION_COMPLETED"),
            "successful": sum(1 for p in pilots if p.success_status == "SUCCESSFUL"),
            "partially_successful": sum(1 for p in pilots if p.success_status == "PARTIALLY_SUCCESSFUL"),
            "unsuccessful": sum(1 for p in pilots if p.success_status == "UNSUCCESSFUL"),
            "inconclusive": sum(1 for p in pilots if p.success_status == "INCONCLUSIVE"),
        }

        summaries = [cls.get_pilot_validation_summary(db, p.id, current_user) for p in pilots[:20]]

        return {
            "counts": counts,
            "pilots": summaries,
        }

    # -------------------------------------------------------------
    # 7. REPORTLAB PDF EXPORT
    # -------------------------------------------------------------
    @classmethod
    def generate_validation_pdf(cls, db: Session, report_id: str, current_user: User) -> io.BytesIO:
        report = db.query(ValidationReport).filter(ValidationReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found.",
            )
        pilot = cls.get_pilot_or_404(db, report.pilot_id)
        cls.verify_pilot_access(db, current_user, pilot, allow_assigned_validator=True)

        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "GovTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1e293b"),
        )
        subtitle_style = ParagraphStyle(
            "GovSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#64748b"),
        )
        h2_style = ParagraphStyle(
            "GovH2",
            parent=styles["Heading2"],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=12,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "GovBody",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
        )
        bold_label = ParagraphStyle(
            "GovBold",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )

        story = []

        # Platform Header
        story.append(Paragraph("GOVINNOVATE NATIONAL INNOVATION PORTAL", subtitle_style))
        story.append(Paragraph("INDEPENDENT PILOT KPI VALIDATION REPORT", title_style))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=15))

        # Meta Table
        validator_name = report.validator.user.full_name if report.validator and report.validator.user else "Independent Validator"
        validator_org = report.validator.organization if report.validator else "Accredited Agency"
        startup_name = pilot.startup.company_name if pilot.startup else "N/A"
        dept_name = pilot.department.name if pilot.department else "N/A"

        meta_data = [
            [
                Paragraph("<b>Pilot Title:</b>", bold_label),
                Paragraph(pilot.title or "N/A", body_style),
                Paragraph("<b>Pilot Code:</b>", bold_label),
                Paragraph(pilot.pilot_code or "N/A", body_style),
            ],
            [
                Paragraph("<b>Government Dept:</b>", bold_label),
                Paragraph(dept_name, body_style),
                Paragraph("<b>Startup:</b>", bold_label),
                Paragraph(startup_name, body_style),
            ],
            [
                Paragraph("<b>Lead Validator:</b>", bold_label),
                Paragraph(validator_name, body_style),
                Paragraph("<b>Validation Org:</b>", bold_label),
                Paragraph(validator_org, body_style),
            ],
            [
                Paragraph("<b>Assessment:</b>", bold_label),
                Paragraph(f"<b>{report.overall_assessment}</b>", bold_label),
                Paragraph("<b>Overall Achievement:</b>", bold_label),
                Paragraph(f"{report.overall_achievement_percentage or 0}%", body_style),
            ],
            [
                Paragraph("<b>Confidence Level:</b>", bold_label),
                Paragraph(report.confidence_level or "MEDIUM", body_style),
                Paragraph("<b>Report Status:</b>", bold_label),
                Paragraph(report.status or "SUBMITTED", body_style),
            ],
        ]

        meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # Executive Summary
        story.append(Paragraph("1. Executive Summary", h2_style))
        story.append(Paragraph(report.executive_summary or "No executive summary provided.", body_style))
        story.append(Spacer(1, 10))

        # Methodology
        story.append(Paragraph("2. Validation Methodology", h2_style))
        story.append(Paragraph(report.methodology or "Standard empirical field test and telemetry validation.", body_style))
        story.append(Spacer(1, 10))

        # KPI Scorecard Table
        story.append(Paragraph("3. Quantitative KPI Scorecard", h2_style))
        scorecard_data = [
            [
                Paragraph("<b>KPI Name</b>", bold_label),
                Paragraph("<b>Target</b>", bold_label),
                Paragraph("<b>Actual</b>", bold_label),
                Paragraph("<b>Achievement</b>", bold_label),
                Paragraph("<b>Result</b>", bold_label),
            ]
        ]

        for item in report.kpi_validations:
            k_name = item.kpi.name if item.kpi else "KPI"
            target_str = f"{float(item.kpi.target_value):g} {item.kpi.unit}" if item.kpi else "N/A"
            actual_str = f"{float(item.validator_measured_value):g} {item.kpi.unit}" if item.validator_measured_value is not None and item.kpi else "N/A"
            achieve_str = f"{item.achievement_percentage or 0:.1f}%"
            res_str = item.result or "NOT_VALIDATED"

            scorecard_data.append([
                Paragraph(k_name, body_style),
                Paragraph(target_str, body_style),
                Paragraph(actual_str, body_style),
                Paragraph(achieve_str, body_style),
                Paragraph(f"<b>{res_str}</b>", body_style),
            ])

        if len(scorecard_data) == 1:
            scorecard_data.append([
                Paragraph("No individual KPI line items recorded.", body_style),
                Paragraph("-", body_style),
                Paragraph("-", body_style),
                Paragraph("-", body_style),
                Paragraph("-", body_style),
            ])

        score_table = Table(scorecard_data, colWidths=[180, 80, 80, 90, 110])
        score_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(score_table)
        story.append(Spacer(1, 15))

        # Findings & Recommendations
        story.append(Paragraph("4. Key Empirical Findings", h2_style))
        story.append(Paragraph(report.findings or "No specific findings recorded.", body_style))
        story.append(Spacer(1, 10))

        if report.unintended_effects:
            story.append(Paragraph("5. Unintended Consequences or Side Effects", h2_style))
            story.append(Paragraph(report.unintended_effects, body_style))
            story.append(Spacer(1, 10))

        story.append(Paragraph("6. Recommendations & Scale-up Readiness", h2_style))
        story.append(Paragraph(report.recommendations or "No specific recommendations recorded.", body_style))
        story.append(Spacer(1, 15))

        # Confirmation Sign-off
        story.append(Paragraph("7. Certification & Government Attestation", h2_style))
        cert_text = (
            f"This validation report was independently evaluated under established public procurement standards. "
            f"Government Confirmation Status: <b>{pilot.success_status}</b>. "
            f"Confirmed on: <b>{pilot.classification_confirmed_at.strftime('%Y-%m-%d %H:%M UTC') if pilot.classification_confirmed_at else 'PENDING'}</b>."
        )
        story.append(Paragraph(cert_text, body_style))

        if pilot.classification_divergence_reason:
            story.append(Spacer(1, 6))
            div_text = f"<b>Government Classification Divergence Justification:</b> {pilot.classification_divergence_reason}"
            story.append(Paragraph(div_text, body_style))

        doc.build(story)
        buffer.seek(0)
        return buffer

    # -------------------------------------------------------------
    # FORMATTERS
    # -------------------------------------------------------------
    @classmethod
    def _format_kpi_response(cls, kpi: PilotKPI, include_nested: bool = False) -> PilotKPIResponse:
        measurements = sorted(kpi.measurements, key=lambda m: m.measurement_date or date.min, reverse=True)
        latest_m = measurements[0] if measurements else None

        calc = (
            KPICalculationService.evaluate_kpi(
                actual=float(latest_m.measured_value) if latest_m else None,
                target=float(kpi.target_value),
                baseline=float(kpi.baseline_value) if kpi.baseline_value is not None else None,
                direction=kpi.direction,
                operator=kpi.target_operator,
            )
            if latest_m
            else {"achievement_percentage": 0.0, "is_met": False, "result": "NOT_VALIDATED"}
        )

        return PilotKPIResponse(
            id=kpi.id,
            pilot_id=kpi.pilot_id,
            name=kpi.name,
            description=kpi.description,
            category=kpi.category,
            measurement_type=kpi.measurement_type,
            unit=kpi.unit,
            baseline_value=float(kpi.baseline_value) if kpi.baseline_value is not None else None,
            baseline_date=kpi.baseline_date,
            baseline_source=kpi.baseline_source,
            baseline_notes=kpi.baseline_notes,
            target_value=float(kpi.target_value),
            target_date=kpi.target_date,
            target_operator=kpi.target_operator,
            direction=kpi.direction,
            weight=float(kpi.weight or 1.0),
            status=kpi.status,
            verification_method=kpi.verification_method,
            data_source=kpi.data_source,
            target_description=kpi.target_description,
            created_by=kpi.created_by,
            created_at=kpi.created_at,
            updated_at=kpi.updated_at,
            latest_measured_value=float(latest_m.measured_value) if latest_m else None,
            latest_measurement_date=latest_m.measurement_date if latest_m else None,
            achievement_percentage=calc["achievement_percentage"],
            is_target_met=calc["is_met"],
            measurements_count=len(kpi.measurements),
            evidences_count=len(kpi.evidences),
            measurements=[cls._format_measurement_response(m) for m in measurements] if include_nested else [],
            evidences=[cls._format_evidence_response(e) for e in kpi.evidences] if include_nested else [],
        )

    @classmethod
    def _format_measurement_response(cls, m: KPIMeasurement) -> KPIMeasurementResponse:
        return KPIMeasurementResponse(
            id=m.id,
            kpi_id=m.kpi_id,
            pilot_id=m.pilot_id,
            measured_value=float(m.measured_value),
            measurement_date=m.measurement_date,
            reporting_period_start=m.reporting_period_start,
            reporting_period_end=m.reporting_period_end,
            measured_by=m.measured_by,
            measurer_name=m.measurer.full_name if m.measurer else None,
            measurement_method=m.measurement_method,
            data_sources_used=m.data_sources_used,
            sample_size=m.sample_size,
            calculation_notes=m.calculation_notes,
            status=m.status,
            created_at=m.created_at,
            evidences=[cls._format_evidence_response(e) for e in m.evidences] if m.evidences else [],
        )

    @classmethod
    def _format_evidence_response(cls, e: KPIEvidence) -> KPIEvidenceResponse:
        return KPIEvidenceResponse(
            id=e.id,
            kpi_id=e.kpi_id,
            measurement_id=e.measurement_id,
            pilot_id=e.pilot_id,
            title=e.title,
            description=e.description,
            evidence_type=e.evidence_type,
            file_name=e.file_name,
            storage_key=e.storage_key,
            mime_type=e.mime_type,
            file_size=e.file_size,
            version=e.version,
            source=e.source,
            status=e.status,
            submitted_by=e.submitted_by,
            submitter_name=e.submitter.full_name if e.submitter else None,
            submitted_at=e.submitted_at,
            created_at=e.created_at,
        )

    @classmethod
    def _format_validator_profile_response(cls, p: ValidatorProfile) -> ValidatorProfileResponse:
        return ValidatorProfileResponse(
            id=p.id,
            user_id=p.user_id,
            user_name=p.user.full_name if p.user else None,
            user_email=p.user.email if p.user else None,
            organization=p.organization,
            domain_expertise=p.domain_expertise,
            qualifications=p.qualifications,
            accreditations=p.accreditations,
            years_of_experience=p.years_of_experience or 0,
            validation_count=p.validation_count or 0,
            rating=float(p.rating) if p.rating is not None else None,
            availability=p.availability,
            contact_phone=p.contact_phone,
            is_verified=p.is_verified,
            created_at=p.created_at,
        )

    @classmethod
    def _format_assignment_response(cls, a: ValidationAssignment) -> ValidationAssignmentResponse:
        return ValidationAssignmentResponse(
            id=a.id,
            pilot_id=a.pilot_id,
            pilot_title=a.pilot.title if a.pilot else None,
            pilot_code=a.pilot.pilot_code if a.pilot else None,
            startup_name=a.pilot.startup.company_name if a.pilot and a.pilot.startup else None,
            validator_id=a.validator_id,
            validator_name=a.validator.user.full_name if a.validator and a.validator.user else None,
            validator_org=a.validator.organization if a.validator else None,
            assigned_by=a.assigned_by,
            assigned_at=a.assigned_at,
            scope=a.scope,
            terms_of_reference=a.terms_of_reference,
            status=a.status,
            coi_declared=a.coi_declared,
            coi_status=a.coi_status,
            coi_declaration_date=a.coi_declaration_date,
            coi_details=a.coi_details,
            response_date=a.response_date,
            decline_reason=a.decline_reason,
            deadline=a.deadline,
            created_at=a.created_at,
        )

    @classmethod
    def _format_coi_response(cls, c: ValidatorConflictOfInterest) -> COIDeclarationResponse:
        return COIDeclarationResponse(
            id=c.id,
            assignment_id=c.assignment_id,
            validator_id=c.validator_id,
            pilot_id=c.pilot_id,
            declaration=c.declaration,
            has_financial_interest=c.has_financial_interest,
            has_past_employment=c.has_past_employment,
            has_personal_relationship=c.has_personal_relationship,
            has_competitive_interest=c.has_competitive_interest,
            declaration_details=c.declaration_details,
            mitigation_notes=c.mitigation_notes,
            is_cleared=c.is_cleared,
            cleared_by=c.cleared_by,
            cleared_at=c.cleared_at,
            declared_at=c.declared_at,
        )

    @classmethod
    def _format_report_response(cls, r: ValidationReport) -> ValidationReportResponse:
        items = []
        for kv in r.kpi_validations:
            # Startup measured value is the latest measurement on that KPI
            latest_m = None
            if kv.kpi and kv.kpi.measurements:
                latest_m = sorted(kv.kpi.measurements, key=lambda m: m.measurement_date or date.min, reverse=True)[0]

            items.append(
                KPIValidationResponse(
                    id=kv.id,
                    report_id=kv.report_id,
                    kpi_id=kv.kpi_id,
                    kpi_name=kv.kpi.name if kv.kpi else None,
                    kpi_category=kv.kpi.category if kv.kpi else None,
                    kpi_unit=kv.kpi.unit if kv.kpi else None,
                    kpi_target_value=float(kv.kpi.target_value) if kv.kpi else None,
                    kpi_baseline_value=float(kv.kpi.baseline_value) if kv.kpi and kv.kpi.baseline_value is not None else None,
                    startup_measured_value=float(latest_m.measured_value) if latest_m else None,
                    validator_measured_value=float(kv.validator_measured_value) if kv.validator_measured_value is not None else None,
                    result=kv.result,
                    achievement_percentage=float(kv.achievement_percentage) if kv.achievement_percentage is not None else None,
                    evidence_sufficiency=kv.evidence_sufficiency,
                    confidence_score=float(kv.confidence_score) if kv.confidence_score is not None else None,
                    methodology_notes=kv.methodology_notes,
                    validator_commentary=kv.validator_commentary,
                    divergence_analysis=kv.divergence_analysis,
                )
            )

        return ValidationReportResponse(
            id=r.id,
            pilot_id=r.pilot_id,
            pilot_title=r.pilot.title if r.pilot else None,
            pilot_code=r.pilot.pilot_code if r.pilot else None,
            validator_id=r.validator_id,
            validator_name=r.validator.user.full_name if r.validator and r.validator.user else None,
            validator_org=r.validator.organization if r.validator else None,
            assignment_id=r.assignment_id,
            executive_summary=r.executive_summary,
            methodology=r.methodology,
            overall_assessment=r.overall_assessment,
            overall_achievement_percentage=float(r.overall_achievement_percentage) if r.overall_achievement_percentage is not None else None,
            kpis_achieved_count=r.kpis_achieved_count or 0,
            kpis_total_count=r.kpis_total_count or 0,
            confidence_level=r.confidence_level,
            findings=r.findings,
            unintended_effects=r.unintended_effects,
            recommendations=r.recommendations,
            readiness_assessment=r.readiness_assessment,
            risks_and_limitations=r.risks_and_limitations,
            status=r.status,
            submitted_at=r.submitted_at,
            reopened_at=r.reopened_at,
            reopen_reason=r.reopen_reason,
            kpi_validations=items,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
