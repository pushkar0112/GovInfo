import json
import logging
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.startup import Startup, ProductStage, RecognitionStatus
from app.models.challenge import Challenge
from app.models.audit_log import AuditLog
from app.schemas.startup import (
    StartupProfileCreateRequest,
    StartupProfileUpdateRequest,
    StartupProfileResponse,
    EligibilityCheckResponse,
    EligibilityCriterion,
)

logger = logging.getLogger("govinnovate.startup_service")


STAGE_RANK = {
    ProductStage.IDEA.value: 1,
    ProductStage.PROTOTYPE.value: 2,
    ProductStage.MVP.value: 3,
    ProductStage.PRODUCTION.value: 4,
    ProductStage.SCALED.value: 5,
}


def log_audit(db: Session, user_id: Optional[str], action: str, entity_type: str, entity_id: Optional[str], metadata: Optional[dict] = None):
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=json.dumps(metadata or {}),
        )
        db.add(audit)
        db.commit()
    except Exception as exc:
        logger.warning(f"Failed to record audit log for action {action}: {exc}")


class StartupService:

    @classmethod
    def calculate_completeness(cls, startup: Startup) -> Tuple[int, List[str]]:
        """
        Calculates profile completeness percentage and missing fields.
        """
        weights = {
            "startup_name": (10, lambda s: bool(s.startup_name or s.company_name)),
            "legal_name": (5, lambda s: bool(s.legal_name)),
            "website": (5, lambda s: bool(s.website)),
            "headquarters": (5, lambda s: bool(s.headquarters)),
            "founded_year": (5, lambda s: bool(s.founded_year)),
            "team_size": (5, lambda s: bool(s.team_size)),
            "dpiit_recognition_number": (10, lambda s: bool(s.dpiit_recognition_number or s.dpiit_number)),
            "recognition_status": (5, lambda s: bool(s.recognition_status and s.recognition_status != RecognitionStatus.NOT_VERIFIED.value)),
            "description": (10, lambda s: bool(s.description and len(s.description) >= 20)),
            "technology_domains": (10, lambda s: bool(cls._parse_json_list(s.technology_domains))),
            "solution_categories": (5, lambda s: bool(cls._parse_json_list(s.solution_categories))),
            "product_stage": (10, lambda s: bool(s.product_stage)),
            "operating_regions": (5, lambda s: bool(cls._parse_json_list(s.operating_regions))),
            "previous_deployments": (5, lambda s: bool(s.previous_deployments)),
            "cybersecurity_certifications": (5, lambda s: bool(s.cybersecurity_certifications)),
        }

        total_score = 0
        missing_fields = []

        for field_name, (weight, check_fn) in weights.items():
            if check_fn(startup):
                total_score += weight
            else:
                missing_fields.append(field_name)

        return min(100, total_score), missing_fields

    @staticmethod
    def _parse_json_list(value: Optional[str]) -> List[str]:
        if not value:
            return []
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
            return [str(parsed)]
        except Exception:
            # Fallback to comma-separated
            return [item.strip() for item in value.split(",") if item.strip()]

    @classmethod
    def get_or_create_profile(cls, db: Session, current_user: User) -> Startup:
        """
        Retrieves or initializes the startup profile for the authenticated user.
        """
        startup = None
        if current_user.startup_id:
            startup = db.query(Startup).filter(Startup.id == current_user.startup_id).first()

        if not startup:
            startup = db.query(Startup).filter(Startup.user_id == current_user.id).first()

        if not startup:
            # Auto-provision baseline profile
            name = current_user.organization_name or f"{current_user.full_name}'s Startup"
            startup = Startup(
                user_id=current_user.id,
                startup_name=name,
                company_name=name,
                contact_email=current_user.email,
                contact_phone=current_user.phone_number,
                product_stage=ProductStage.MVP.value,
                recognition_status=RecognitionStatus.PENDING.value,
                technology_domains=json.dumps(["CivicTech"]),
            )
            startup.sync_legacy_fields()
            db.add(startup)
            db.commit()
            db.refresh(startup)

            current_user.startup_id = startup.id
            db.commit()

            log_audit(db, current_user.id, "startup_profile_created", "Startup", startup.id, {"name": name})

        return startup

    @classmethod
    def build_profile_response(cls, startup: Startup) -> StartupProfileResponse:
        completeness, missing = cls.calculate_completeness(startup)
        domains = cls._parse_json_list(startup.technology_domains)
        categories = cls._parse_json_list(startup.solution_categories)
        regions = cls._parse_json_list(startup.operating_regions)

        return StartupProfileResponse(
            id=startup.id,
            user_id=startup.user_id,
            startup_name=startup.startup_name or startup.company_name,
            company_name=startup.company_name or startup.startup_name,
            legal_name=startup.legal_name,
            founded_year=startup.founded_year,
            website=startup.website,
            headquarters=startup.headquarters,
            team_size=startup.team_size,
            dpiit_recognition_number=startup.dpiit_recognition_number or startup.dpiit_number,
            dpiit_number=startup.dpiit_number or startup.dpiit_recognition_number,
            recognition_status=startup.recognition_status,
            dpiit_recognized=startup.dpiit_recognized or (startup.recognition_status == RecognitionStatus.VERIFIED.value),
            description=startup.description,
            technology_domains=domains,
            solution_categories=categories,
            product_stage=startup.product_stage or startup.stage or "MVP",
            stage=startup.stage or startup.product_stage or "MVP",
            operating_regions=regions,
            previous_deployments=startup.previous_deployments,
            government_experience=startup.government_experience,
            certifications=startup.certifications,
            cybersecurity_certifications=startup.cybersecurity_certifications,
            contact_email=startup.contact_email,
            contact_phone=startup.contact_phone,
            created_at=startup.created_at,
            updated_at=startup.updated_at,
            completeness_percentage=completeness,
            missing_fields=missing,
        )

    @classmethod
    def update_profile(
        cls, db: Session, current_user: User, payload: StartupProfileUpdateRequest
    ) -> StartupProfileResponse:
        startup = cls.get_or_create_profile(db, current_user)

        data = payload.model_dump(exclude_unset=True)

        if "technology_domains" in data and data["technology_domains"] is not None:
            data["technology_domains"] = json.dumps(data["technology_domains"])

        if "solution_categories" in data and data["solution_categories"] is not None:
            data["solution_categories"] = json.dumps(data["solution_categories"])

        if "operating_regions" in data and data["operating_regions"] is not None:
            data["operating_regions"] = json.dumps(data["operating_regions"])

        for field, val in data.items():
            setattr(startup, field, val)

        startup.sync_legacy_fields()
        db.commit()
        db.refresh(startup)

        log_audit(db, current_user.id, "startup_profile_updated", "Startup", startup.id, {"updated_fields": list(data.keys())})

        return cls.build_profile_response(startup)

    @classmethod
    def screen_eligibility(
        cls, db: Session, current_user: User, challenge_id: str
    ) -> EligibilityCheckResponse:
        """
        Evaluates configurable challenge eligibility criteria against the startup profile.
        Separates mandatory vs preferred requirements with actionable explanations.
        """
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found.",
            )

        startup = cls.get_or_create_profile(db, current_user)
        completeness, missing = cls.calculate_completeness(startup)

        mandatory: List[EligibilityCriterion] = []
        preferred: List[EligibilityCriterion] = []

        # 1. MANDATORY: DPIIT Recognition
        dpiit_num = startup.dpiit_recognition_number or startup.dpiit_number
        is_dpiit_ok = bool(dpiit_num and startup.recognition_status in (RecognitionStatus.VERIFIED.value, RecognitionStatus.PENDING.value))
        mandatory.append(
            EligibilityCriterion(
                name="DPIIT Recognition",
                status="PASSED" if is_dpiit_ok else "FAILED",
                is_mandatory=True,
                required_value="Valid DPIIT Recognition Number (Verified or Pending)",
                actual_value=f"{startup.recognition_status} ({dpiit_num or 'Not Provided'})",
                message="DPIIT recognition is required under Startup India procurement relaxation guidelines."
                if not is_dpiit_ok else "Statutory DPIIT recognition verified.",
            )
        )

        # 2. MANDATORY: Minimum Product Readiness Stage
        current_stage = startup.product_stage or startup.stage or "MVP"
        stage_score = STAGE_RANK.get(current_stage, 1)
        required_stage = ProductStage.MVP.value
        min_stage_ok = stage_score >= STAGE_RANK[required_stage]
        mandatory.append(
            EligibilityCriterion(
                name="Minimum Product Stage",
                status="PASSED" if min_stage_ok else "FAILED",
                is_mandatory=True,
                required_value=f"Minimum {required_stage} (Proven functional product)",
                actual_value=current_stage,
                message="Product readiness meets sandbox deployment requirements."
                if min_stage_ok else f"Your product stage is {current_stage}. This pilot challenge requires at least {required_stage}.",
            )
        )

        # 3. MANDATORY: Technology Domain Alignment
        domains = cls._parse_json_list(startup.technology_domains)
        challenge_domain = challenge.domain or challenge.target_sector or "CivicTech"
        domain_match = any(
            d.lower() in challenge_domain.lower() or challenge_domain.lower() in d.lower()
            for d in domains
        ) if domains else False
        # If no specific domain mismatch or domain has overlap
        mandatory.append(
            EligibilityCriterion(
                name="Domain Alignment",
                status="PASSED" if (domain_match or not domains) else "WARNING",
                is_mandatory=False,
                required_value=f"Expertise in {challenge_domain}",
                actual_value=", ".join(domains) if domains else "General Tech",
                message=f"Startup technology profile aligns with {challenge_domain}."
                if domain_match else f"Ensure your solution architecture explicitly addresses {challenge_domain} civic requirements.",
            )
        )

        # 4. PREFERRED: Prior Government or Municipal Pilot Experience
        has_govt_exp = bool(startup.government_experience and len(startup.government_experience) > 10)
        preferred.append(
            EligibilityCriterion(
                name="Government Deployment Experience",
                status="PASSED" if has_govt_exp else "WARNING",
                is_mandatory=False,
                required_value="Demonstrated public sector pilot or municipal deployment",
                actual_value=startup.government_experience or "None reported",
                message="Prior government sandbox or deployment experience provides favorable context during review, but is not mandatory."
                if not has_govt_exp else "Documented public sector experience confirmed.",
            )
        )

        # 5. PREFERRED: Cybersecurity & Standards
        has_security = bool(startup.cybersecurity_certifications or startup.certifications)
        preferred.append(
            EligibilityCriterion(
                name="Security & Compliance Certifications",
                status="PASSED" if has_security else "WARNING",
                is_mandatory=False,
                required_value="CERT-In audit, ISO 27001, or equivalent data safety benchmark",
                actual_value=startup.cybersecurity_certifications or "Pending",
                message="Security audits are preferred for municipal telemetry and data sharing integration."
                if not has_security else "Security and compliance credentials documented.",
            )
        )

        # Determine overall status
        any_mandatory_failed = any(c.status == "FAILED" for c in mandatory)
        if any_mandatory_failed:
            overall_status = "INELIGIBLE"
            summary = "Your startup does not meet one or more mandatory eligibility requirements for this challenge."
        elif completeness < 50:
            overall_status = "ACTION_REQUIRED"
            summary = f"Your profile is {completeness}% complete. Please complete required organization details before submission."
        else:
            overall_status = "ELIGIBLE"
            summary = "Your startup meets the platform screening requirements to submit a technical proposal."

        is_eligible = (overall_status == "ELIGIBLE")

        log_audit(
            db,
            current_user.id,
            "eligibility_checked",
            "Challenge",
            challenge_id,
            {"overall_status": overall_status, "is_eligible": is_eligible},
        )

        return EligibilityCheckResponse(
            is_eligible=is_eligible,
            overall_status=overall_status,
            mandatory_criteria=mandatory,
            preferred_criteria=preferred,
            summary_message=summary,
            summary=summary,
            evaluated_at=datetime.now(timezone.utc),
        )
