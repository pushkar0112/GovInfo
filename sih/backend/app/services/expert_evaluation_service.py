import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc

from app.models.user import User
from app.models.challenge import Challenge
from app.models.application import Application, ApplicationStatus
from app.models.evaluation_criteria import EvaluationCriteria
from app.models.expert_profile import ExpertProfile, ExpertAvailability
from app.models.evaluation_assignment import EvaluationAssignment, AssignmentStatus
from app.models.conflict_of_interest import ConflictOfInterest, ConflictDeclaration
from app.models.evaluation import Evaluation, EvaluationRecommendation
from app.models.evaluation_score import EvaluationScore
from app.models.audit_log import AuditLog
from app.core.security import UserRole
from app.services.scoring_service import ScoringService


class ExpertEvaluationService:

    # ==========================================================================
    # Criteria Management
    # ==========================================================================

    @staticmethod
    def get_challenge_criteria(db: Session, challenge_id: str) -> List[EvaluationCriteria]:
        return (
            db.query(EvaluationCriteria)
            .filter(EvaluationCriteria.challenge_id == challenge_id)
            .order_by(EvaluationCriteria.display_order.asc(), EvaluationCriteria.created_at.asc())
            .all()
        )

    @staticmethod
    def validate_criteria_weights(criteria: List[EvaluationCriteria]) -> Tuple[float, bool]:
        total_weight = round(sum(float(c.weight) for c in criteria), 2)
        is_valid = abs(total_weight - 100.0) < 0.01
        return total_weight, is_valid

    @classmethod
    def create_criterion(
        cls,
        db: Session,
        challenge_id: str,
        user: User,
        data: Dict[str, Any],
    ) -> EvaluationCriteria:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        # RBAC Check: User must be ADMIN or owner department
        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Government or Admin can configure criteria.")
            if user.department_id and challenge.department_id and user.department_id != challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this challenge.")

        criterion = EvaluationCriteria(
            challenge_id=challenge_id,
            name=data["name"],
            description=data.get("description"),
            weight=float(data["weight"]),
            max_score=float(data.get("max_score", 10.0)),
            min_score=float(data.get("min_score", 0.0)),
            mandatory=data.get("mandatory", True),
            display_order=int(data.get("display_order", 0)),
        )
        db.add(criterion)
        db.flush()

        # Audit
        db.add(
            AuditLog(
                user_id=user.id,
                action="CRITERION_CREATED",
                entity_type="EvaluationCriteria",
                entity_id=criterion.id,
                metadata_json=json.dumps({"challenge_id": challenge_id, "name": criterion.name, "weight": criterion.weight}),
            )
        )
        db.commit()
        db.refresh(criterion)
        return criterion

    @classmethod
    def update_criterion(
        cls,
        db: Session,
        criterion_id: str,
        user: User,
        data: Dict[str, Any],
    ) -> EvaluationCriteria:
        criterion = db.query(EvaluationCriteria).filter(EvaluationCriteria.id == criterion_id).first()
        if not criterion:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found.")

        challenge = db.query(Challenge).filter(Challenge.id == criterion.challenge_id).first()
        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
            if user.department_id and challenge.department_id and user.department_id != challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this challenge.")

        for field in ["name", "description", "weight", "max_score", "min_score", "mandatory", "display_order"]:
            if field in data and data[field] is not None:
                setattr(criterion, field, data[field])

        db.add(
            AuditLog(
                user_id=user.id,
                action="CRITERION_UPDATED",
                entity_type="EvaluationCriteria",
                entity_id=criterion.id,
                metadata_json=json.dumps({"challenge_id": criterion.challenge_id, "name": criterion.name}),
            )
        )
        db.commit()
        db.refresh(criterion)
        return criterion

    @classmethod
    def delete_criterion(cls, db: Session, criterion_id: str, user: User) -> None:
        criterion = db.query(EvaluationCriteria).filter(EvaluationCriteria.id == criterion_id).first()
        if not criterion:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found.")

        challenge = db.query(Challenge).filter(Challenge.id == criterion.challenge_id).first()
        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
            if user.department_id and challenge.department_id and user.department_id != challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        # Check if submitted evaluations exist for this criterion
        existing_scores = (
            db.query(EvaluationScore)
            .join(Evaluation, EvaluationScore.evaluation_id == Evaluation.id)
            .filter(EvaluationScore.criterion_id == criterion_id, Evaluation.is_submitted == True)
            .count()
        )
        if existing_scores > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete criterion with submitted evaluations.",
            )

        challenge_id = criterion.challenge_id
        name = criterion.name
        db.delete(criterion)
        db.add(
            AuditLog(
                user_id=user.id,
                action="CRITERION_DELETED",
                entity_type="EvaluationCriteria",
                entity_id=criterion_id,
                metadata_json=json.dumps({"challenge_id": challenge_id, "name": name}),
            )
        )
        db.commit()

    # ==========================================================================
    # Expert Profiles & Directory
    # ==========================================================================

    @staticmethod
    def get_or_create_expert_profile(db: Session, user_id: str) -> ExpertProfile:
        profile = db.query(ExpertProfile).filter(ExpertProfile.user_id == user_id).first()
        if not profile:
            profile = ExpertProfile(user_id=user_id, availability_status=ExpertAvailability.AVAILABLE.value)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @classmethod
    def update_expert_profile(
        cls,
        db: Session,
        user: User,
        data: Dict[str, Any],
        target_user_id: Optional[str] = None,
    ) -> ExpertProfile:
        effective_user_id = user.id
        if target_user_id and target_user_id != user.id:
            if user.role != UserRole.ADMIN:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ADMIN can edit other profiles.")
            effective_user_id = target_user_id

        profile = cls.get_or_create_expert_profile(db, effective_user_id)

        for key, val in data.items():
            if val is not None:
                if key == "expertise_domains":
                    profile.expertise_domains = json.dumps(val) if isinstance(val, list) else str(val)
                elif hasattr(profile, key):
                    setattr(profile, key, val)

        db.add(
            AuditLog(
                user_id=user.id,
                action="expert_profile_updated",
                entity_type="ExpertProfile",
                entity_id=profile.id,
                metadata_json=json.dumps({"expert_user_id": effective_user_id}),
            )
        )
        db.commit()
        db.refresh(profile)
        return profile

    @classmethod
    def list_experts(
        cls,
        db: Session,
        search: Optional[str] = None,
        domain: Optional[str] = None,
        availability: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(User)
            .filter(User.role.in_([UserRole.EXPERT, UserRole.EXPERT_EVALUATOR]), User.is_active == True)
            .outerjoin(ExpertProfile, ExpertProfile.user_id == User.id)
        )

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(s),
                    User.email.ilike(s),
                    ExpertProfile.organization.ilike(s),
                    ExpertProfile.designation.ilike(s),
                )
            )

        if domain:
            query = query.filter(
                or_(
                    ExpertProfile.expertise_domains.ilike(f"%{domain.strip()}%"),
                    User.domain_expertise.ilike(f"%{domain.strip()}%"),
                )
            )

        if availability:
            query = query.filter(ExpertProfile.availability_status == availability.upper())

        experts = query.all()
        results = []

        for exp in experts:
            prof = exp.expert_profile
            # Compute assignments counts
            active_count = (
                db.query(EvaluationAssignment)
                .filter(
                    EvaluationAssignment.expert_id == exp.id,
                    EvaluationAssignment.assignment_status.in_([
                        AssignmentStatus.ASSIGNED.value,
                        AssignmentStatus.ACCEPTED.value,
                        AssignmentStatus.IN_PROGRESS.value,
                    ]),
                )
                .count()
            )
            completed_count = (
                db.query(EvaluationAssignment)
                .filter(
                    EvaluationAssignment.expert_id == exp.id,
                    EvaluationAssignment.assignment_status == AssignmentStatus.COMPLETED.value,
                )
                .count()
            )

            domains_list = []
            if prof and prof.expertise_domains:
                try:
                    parsed = json.loads(prof.expertise_domains)
                    domains_list = parsed if isinstance(parsed, list) else [str(parsed)]
                except Exception:
                    domains_list = [d.strip() for d in prof.expertise_domains.split(",") if d.strip()]
            elif exp.domain_expertise:
                domains_list = [d.strip() for d in exp.domain_expertise.split(",") if d.strip()]

            results.append({
                "id": prof.id if prof else exp.id,
                "user_id": exp.id,
                "full_name": exp.full_name,
                "email": exp.email,
                "organization": prof.organization if prof else exp.organization_name,
                "designation": prof.designation if prof else exp.designation,
                "expertise_domains": domains_list,
                "years_of_experience": prof.years_of_experience if prof else 0,
                "professional_summary": prof.professional_summary if prof else None,
                "certifications": prof.certifications if prof else None,
                "linkedin_url": prof.linkedin_url if prof else None,
                "availability_status": prof.availability_status if prof else "AVAILABLE",
                "active_assignments_count": active_count,
                "completed_assignments_count": completed_count,
                "created_at": prof.created_at if prof else exp.created_at,
                "updated_at": prof.updated_at if prof else exp.updated_at,
            })

        return results

    # ==========================================================================
    # Assignments Management
    # ==========================================================================

    @classmethod
    def assign_expert(
        cls,
        db: Session,
        application_id: str,
        expert_id: str,
        assigned_by: User,
        due_at: Optional[datetime] = None,
        notes: Optional[str] = None,
    ) -> EvaluationAssignment:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        expert = db.query(User).filter(User.id == expert_id).first()
        if not expert or expert.role not in (UserRole.EXPERT, UserRole.EXPERT_EVALUATOR):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected user is not an expert.")

        # RBAC: Assigned by government user owning challenge, or ADMIN
        if assigned_by.role != UserRole.ADMIN:
            if assigned_by.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Government or Admin can assign experts.")
            if assigned_by.department_id and app.challenge.department_id and assigned_by.department_id != app.challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this challenge application.")

        # Check existing active assignment
        existing = (
            db.query(EvaluationAssignment)
            .filter(
                EvaluationAssignment.application_id == application_id,
                EvaluationAssignment.expert_id == expert_id,
                EvaluationAssignment.assignment_status.notin_([AssignmentStatus.DECLINED.value, AssignmentStatus.REASSIGNED.value]),
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expert is already assigned to this application.")

        assignment = EvaluationAssignment(
            application_id=application_id,
            expert_id=expert_id,
            assigned_by=assigned_by.id,
            assignment_status=AssignmentStatus.ASSIGNED.value,
            assigned_at=datetime.now(timezone.utc),
            due_at=due_at,
            notes=notes,
        )
        db.add(assignment)

        # Transition application to UNDER_REVIEW if SUBMITTED
        if app.status == ApplicationStatus.SUBMITTED.value:
            app.status = ApplicationStatus.UNDER_REVIEW.value

        db.add(
            AuditLog(
                user_id=assigned_by.id,
                action="expert_assigned",
                entity_type="EvaluationAssignment",
                entity_id=assignment.id,
                metadata_json=json.dumps({
                    "application_id": application_id,
                    "application_code": app.application_code,
                    "expert_id": expert_id,
                    "expert_name": expert.full_name,
                }),
            )
        )
        db.commit()
        db.refresh(assignment)
        return assignment

    @classmethod
    def reassign_expert(
        cls,
        db: Session,
        assignment_id: str,
        new_expert_id: str,
        user: User,
        reason: Optional[str] = None,
        due_at: Optional[datetime] = None,
    ) -> EvaluationAssignment:
        assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

        app = assignment.application
        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
            if user.department_id and app.challenge.department_id and user.department_id != app.challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        new_expert = db.query(User).filter(User.id == new_expert_id).first()
        if not new_expert or new_expert.role not in (UserRole.EXPERT, UserRole.EXPERT_EVALUATOR):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New assignee is not an expert.")

        # Mark old assignment as REASSIGNED
        assignment.assignment_status = AssignmentStatus.REASSIGNED.value
        if reason:
            assignment.notes = f"{assignment.notes or ''} [Reassignment reason: {reason}]".strip()

        # Create new assignment
        new_assignment = EvaluationAssignment(
            application_id=app.id,
            expert_id=new_expert_id,
            assigned_by=user.id,
            assignment_status=AssignmentStatus.ASSIGNED.value,
            assigned_at=datetime.now(timezone.utc),
            due_at=due_at or assignment.due_at,
            notes=f"Reassigned from previous expert. {reason or ''}".strip(),
        )
        db.add(new_assignment)

        db.add(
            AuditLog(
                user_id=user.id,
                action="expert_reassigned",
                entity_type="EvaluationAssignment",
                entity_id=new_assignment.id,
                metadata_json=json.dumps({
                    "old_assignment_id": assignment_id,
                    "old_expert_id": assignment.expert_id,
                    "new_expert_id": new_expert_id,
                    "application_id": app.id,
                    "reason": reason,
                }),
            )
        )
        db.commit()
        db.refresh(new_assignment)
        return new_assignment

    @classmethod
    def list_expert_assignments(
        cls,
        db: Session,
        expert_user: User,
        status_filter: Optional[str] = None,
    ) -> List[EvaluationAssignment]:
        query = (
            db.query(EvaluationAssignment)
            .options(
                joinedload(EvaluationAssignment.application).joinedload(Application.challenge),
                joinedload(EvaluationAssignment.application).joinedload(Application.startup),
                joinedload(EvaluationAssignment.expert),
                joinedload(EvaluationAssignment.conflict),
                joinedload(EvaluationAssignment.evaluation),
            )
            .filter(EvaluationAssignment.expert_id == expert_user.id)
        )

        if status_filter:
            query = query.filter(EvaluationAssignment.assignment_status == status_filter.upper())

        return query.order_by(EvaluationAssignment.assigned_at.desc()).all()

    # ==========================================================================
    # Conflict of Interest
    # ==========================================================================

    @classmethod
    def declare_conflict(
        cls,
        db: Session,
        assignment_id: str,
        expert_user: User,
        declaration: str,
        reason: Optional[str] = None,
    ) -> ConflictOfInterest:
        assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

        if assignment.expert_id != expert_user.id and expert_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this assignment.")

        decl_upper = declaration.upper()
        if decl_upper not in (ConflictDeclaration.NO_CONFLICT.value, ConflictDeclaration.CONFLICT_DECLARED.value):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conflict declaration.")

        if decl_upper == ConflictDeclaration.CONFLICT_DECLARED.value and not reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reason required when conflict declared.")

        coi = db.query(ConflictOfInterest).filter(ConflictOfInterest.assignment_id == assignment_id).first()
        if not coi:
            coi = ConflictOfInterest(
                assignment_id=assignment_id,
                expert_id=expert_user.id,
                declaration=decl_upper,
                reason=reason,
                declared_at=datetime.now(timezone.utc),
            )
            db.add(coi)
        else:
            coi.declaration = decl_upper
            coi.reason = reason
            coi.declared_at = datetime.now(timezone.utc)

        # Update assignment status
        if decl_upper == ConflictDeclaration.CONFLICT_DECLARED.value:
            assignment.assignment_status = AssignmentStatus.DECLINED.value
        elif assignment.assignment_status == AssignmentStatus.ASSIGNED.value:
            assignment.assignment_status = AssignmentStatus.ACCEPTED.value
            assignment.accepted_at = datetime.now(timezone.utc)

        action_name = "conflict_declared" if decl_upper == ConflictDeclaration.CONFLICT_DECLARED.value else "conflict_cleared"
        db.add(
            AuditLog(
                user_id=expert_user.id,
                action=action_name,
                entity_type="ConflictOfInterest",
                entity_id=coi.id,
                metadata_json=json.dumps({
                    "assignment_id": assignment_id,
                    "declaration": decl_upper,
                    "reason": reason,
                }),
            )
        )
        db.commit()
        db.refresh(coi)
        return coi

    # ==========================================================================
    # Draft & Submit Evaluation
    # ==========================================================================

    @classmethod
    def save_evaluation_draft(
        cls,
        db: Session,
        assignment_id: str,
        expert_user: User,
        scores_data: List[Dict[str, Any]],
        overall_comments: Optional[str] = None,
        recommendation: Optional[str] = None,
    ) -> Evaluation:
        assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

        if assignment.expert_id != expert_user.id and expert_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        # Check conflict status
        coi = assignment.conflict
        if not coi or coi.declaration == ConflictDeclaration.CONFLICT_DECLARED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot evaluate application with an active conflict of interest declaration.",
            )

        # Retrieve or create draft evaluation
        eval_record = db.query(Evaluation).filter(Evaluation.assignment_id == assignment_id).first()
        if not eval_record:
            eval_record = Evaluation(
                assignment_id=assignment_id,
                application_id=assignment.application_id,
                expert_id=expert_user.id,
                evaluator_id=expert_user.id,
                is_submitted=False,
            )
            db.add(eval_record)
            db.flush()

        if eval_record.is_submitted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evaluation has already been submitted and cannot be updated as a draft.",
            )

        # Update assignment to IN_PROGRESS
        assignment.assignment_status = AssignmentStatus.IN_PROGRESS.value

        # Save comments & recommendation draft
        eval_record.overall_comments = overall_comments
        if recommendation:
            try:
                eval_record.recommendation = EvaluationRecommendation[recommendation]
            except Exception:
                pass

        # Save scores map
        existing_scores = {s.criterion_id: s for s in eval_record.scores}
        criteria = cls.get_challenge_criteria(db, assignment.application.challenge_id)
        crit_map = {c.id: c for c in criteria}

        scores_map: Dict[str, float] = {}
        for s_in in scores_data:
            c_id = s_in["criterion_id"]
            if c_id in crit_map:
                val = float(s_in["score"])
                scores_map[c_id] = val
                if c_id in existing_scores:
                    existing_scores[c_id].score = val
                    existing_scores[c_id].comment = s_in.get("comment")
                    existing_scores[c_id].evidence_reference = s_in.get("evidence_reference")
                else:
                    new_s = EvaluationScore(
                        evaluation_id=eval_record.id,
                        criterion_id=c_id,
                        score=val,
                        comment=s_in.get("comment"),
                        evidence_reference=s_in.get("evidence_reference"),
                    )
                    db.add(new_s)

        # Calculate provisional overall score
        eval_record.overall_score = ScoringService.calculate_overall_score(criteria, scores_map)

        db.add(
            AuditLog(
                user_id=expert_user.id,
                action="evaluation_draft_saved",
                entity_type="Evaluation",
                entity_id=eval_record.id,
                metadata_json=json.dumps({
                    "assignment_id": assignment_id,
                    "provisional_score": eval_record.overall_score,
                }),
            )
        )
        db.commit()
        db.refresh(eval_record)
        return eval_record

    @classmethod
    def submit_evaluation(
        cls,
        db: Session,
        assignment_id: str,
        expert_user: User,
        scores_data: List[Dict[str, Any]],
        recommendation: str,
        overall_comments: Optional[str] = None,
    ) -> Evaluation:
        assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

        if assignment.expert_id != expert_user.id and expert_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        # Conflict check
        coi = assignment.conflict
        if not coi or coi.declaration != ConflictDeclaration.NO_CONFLICT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conflict of interest must be cleared ('NO_CONFLICT') before evaluation submission.",
            )

        eval_record = db.query(Evaluation).filter(Evaluation.assignment_id == assignment_id).first()
        if eval_record and eval_record.is_submitted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evaluation has already been submitted and cannot be modified.",
            )

        # Validate recommendation
        try:
            rec_enum = EvaluationRecommendation[recommendation.upper()]
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid recommendation. Must be STRONGLY_RECOMMEND, RECOMMEND, NEUTRAL, or DO_NOT_RECOMMEND.",
            )

        # Validate criteria & mandatory scoring
        criteria = cls.get_challenge_criteria(db, assignment.application.challenge_id)
        if not criteria:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No evaluation criteria configured for this challenge.",
            )

        crit_map = {c.id: c for c in criteria}
        submitted_scores_map = {s["criterion_id"]: s for s in scores_data}

        scores_for_calc: Dict[str, float] = {}
        for crit in criteria:
            if crit.mandatory and crit.id not in submitted_scores_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mandatory criterion '{crit.name}' has not been scored.",
                )

            if crit.id in submitted_scores_map:
                s_item = submitted_scores_map[crit.id]
                score_val = float(s_item["score"])
                min_s = float(crit.min_score)
                max_s = float(crit.max_score)
                if score_val < min_s or score_val > max_s:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Score for '{crit.name}' ({score_val}) must be between {min_s} and {max_s}.",
                    )
                scores_for_calc[crit.id] = score_val

        # Compute final deterministic overall score
        final_overall_score = ScoringService.calculate_overall_score(criteria, scores_for_calc)

        if not eval_record:
            eval_record = Evaluation(
                assignment_id=assignment_id,
                application_id=assignment.application_id,
                expert_id=expert_user.id,
                evaluator_id=expert_user.id,
            )
            db.add(eval_record)
            db.flush()

        eval_record.overall_score = final_overall_score
        eval_record.composite_score = final_overall_score  # Sync legacy column
        eval_record.recommendation = rec_enum
        eval_record.overall_comments = overall_comments
        eval_record.evaluator_feedback = overall_comments or "Submitted via expert portal."
        eval_record.is_submitted = True
        eval_record.is_finalized = "true"
        eval_record.submitted_at = datetime.now(timezone.utc)

        # Update scores in DB
        existing_scores = {s.criterion_id: s for s in eval_record.scores}
        for crit_id, score_val in scores_for_calc.items():
            s_input = submitted_scores_map[crit_id]
            if crit_id in existing_scores:
                existing_scores[crit_id].score = score_val
                existing_scores[crit_id].comment = s_input.get("comment")
                existing_scores[crit_id].evidence_reference = s_input.get("evidence_reference")
            else:
                new_s = EvaluationScore(
                    evaluation_id=eval_record.id,
                    criterion_id=crit_id,
                    score=score_val,
                    comment=s_input.get("comment"),
                    evidence_reference=s_input.get("evidence_reference"),
                )
                db.add(new_s)

        # Complete assignment
        assignment.assignment_status = AssignmentStatus.COMPLETED.value
        assignment.completed_at = datetime.now(timezone.utc)

        # Audit
        db.add(
            AuditLog(
                user_id=expert_user.id,
                action="evaluation_submitted",
                entity_type="Evaluation",
                entity_id=eval_record.id,
                metadata_json=json.dumps({
                    "assignment_id": assignment_id,
                    "application_id": assignment.application_id,
                    "overall_score": final_overall_score,
                    "recommendation": rec_enum.value,
                }),
            )
        )
        db.commit()
        db.refresh(eval_record)
        return eval_record

    # ==========================================================================
    # Application Evaluation Dossier & Summary
    # ==========================================================================

    @classmethod
    def get_application_evaluations_summary(
        cls,
        db: Session,
        application_id: str,
        user: User,
    ) -> Dict[str, Any]:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        # RBAC: Government owning challenge, Admin, or Expert assigned
        if user.role == UserRole.STARTUP:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Startups are restricted from viewing detailed expert scoring dossiers.",
            )

        criteria = cls.get_challenge_criteria(db, app.challenge_id)
        evaluations = (
            db.query(Evaluation)
            .options(
                joinedload(Evaluation.expert).joinedload(User.expert_profile),
                joinedload(Evaluation.scores).joinedload(EvaluationScore.criterion),
            )
            .filter(Evaluation.application_id == application_id)
            .all()
        )

        agg = ScoringService.aggregate_application_evaluations(evaluations, criteria)
        assignments_count = db.query(EvaluationAssignment).filter(EvaluationAssignment.application_id == application_id).count()

        eval_responses = []
        for ev in evaluations:
            # Build criterion responses
            score_resps = []
            for sc in ev.scores:
                crit = sc.criterion
                if crit:
                    calc = ScoringService.calculate_criterion_scores(crit, sc.score)
                    score_resps.append({
                        "id": sc.id,
                        "criterion_id": sc.criterion_id,
                        "criterion_name": crit.name,
                        "criterion_description": crit.description,
                        "weight": float(crit.weight),
                        "max_score": float(crit.max_score),
                        "score": float(sc.score),
                        "normalized_score": calc["normalized_score"],
                        "weighted_score": calc["weighted_score"],
                        "comment": sc.comment,
                        "evidence_reference": sc.evidence_reference,
                    })

            exp_name = ev.expert.full_name if ev.expert else "Unknown Expert"
            exp_org = None
            if ev.expert and ev.expert.expert_profile:
                exp_org = ev.expert.expert_profile.organization
            elif ev.expert:
                exp_org = ev.expert.organization_name

            eval_responses.append({
                "id": ev.id,
                "assignment_id": ev.assignment_id,
                "application_id": ev.application_id,
                "expert_id": ev.expert_id or ev.evaluator_id,
                "expert_name": exp_name,
                "expert_organization": exp_org,
                "overall_score": float(ev.overall_score) if ev.overall_score is not None else None,
                "recommendation": ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation,
                "overall_comments": ev.overall_comments or ev.evaluator_feedback,
                "is_submitted": ev.is_submitted,
                "submitted_at": ev.submitted_at,
                "scores": score_resps,
            })

        return {
            "application_id": application_id,
            "average_score": agg["average_score"],
            "highest_score": agg["highest_score"],
            "lowest_score": agg["lowest_score"],
            "completed_evaluations_count": agg["completed_evaluations_count"],
            "assigned_evaluations_count": assignments_count,
            "recommendations_summary": agg["recommendations_summary"],
            "criteria_breakdown": agg["criteria_breakdown"],
            "evaluations": eval_responses,
        }

    # ==========================================================================
    # Challenge Rankings & Government Decisions
    # ==========================================================================

    @classmethod
    def get_challenge_ranking(
        cls,
        db: Session,
        challenge_id: str,
        user: User,
    ) -> Dict[str, Any]:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

        # RBAC: Government owning challenge, or ADMIN
        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted.")
            if user.department_id and challenge.department_id and user.department_id != challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this challenge.")

        criteria = cls.get_challenge_criteria(db, challenge_id)
        applications = (
            db.query(Application)
            .options(
                joinedload(Application.startup),
                joinedload(Application.evaluations),
                joinedload(Application.evaluation_assignments),
            )
            .filter(
                Application.challenge_id == challenge_id,
                Application.status.notin_([ApplicationStatus.DRAFT.value, ApplicationStatus.WITHDRAWN.value]),
            )
            .all()
        )

        ranking_entries = []
        for app in applications:
            evals = app.evaluations or []
            assignments = app.evaluation_assignments or []
            agg = ScoringService.aggregate_application_evaluations(evals, criteria)

            st_name = app.startup.startup_name if app.startup else "Unknown Startup"
            dpiit = app.startup.dpiit_recognition_number if app.startup else None

            ranking_entries.append({
                "application_id": app.id,
                "application_code": app.application_code,
                "startup_id": app.startup_id,
                "startup_name": st_name,
                "dpiit_number": dpiit,
                "proposal_title": app.proposal_title,
                "status": app.status,
                "submitted_at": app.submitted_at,
                "average_score": agg["average_score"],
                "highest_score": agg["highest_score"],
                "lowest_score": agg["lowest_score"],
                "evaluations_completed": agg["completed_evaluations_count"],
                "evaluations_count": agg["completed_evaluations_count"],
                "evaluations_assigned": len(assignments),
            })

        # Sort: Highest average score DESC (treating None as -1), then submitted_at ASC
        ranking_entries.sort(
            key=lambda x: (
                x["average_score"] is not None,
                x["average_score"] or 0.0,
            ),
            reverse=True,
        )

        # Secondary tie-breaker by submitted_at ASC
        # Assign 1-indexed ranks
        for idx, entry in enumerate(ranking_entries, start=1):
            entry["rank"] = idx

        return {
            "challenge_id": challenge.id,
            "challenge_title": challenge.title,
            "challenge_code": challenge.challenge_code,
            "total_applications": len(ranking_entries),
            "ranking": ranking_entries,
        }

    @classmethod
    def shortlist_application(
        cls,
        db: Session,
        application_id: str,
        user: User,
        notes: Optional[str] = None,
    ) -> Application:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Government or Admin can shortlist.")
            if user.department_id and app.challenge.department_id and user.department_id != app.challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        app.status = ApplicationStatus.SHORTLISTED.value
        if notes:
            app.review_notes = f"{app.review_notes or ''} [Shortlisted: {notes}]".strip()

        db.add(
            AuditLog(
                user_id=user.id,
                action="application_shortlisted",
                entity_type="Application",
                entity_id=app.id,
                metadata_json=json.dumps({
                    "application_code": app.application_code,
                    "notes": notes,
                }),
            )
        )
        db.commit()
        db.refresh(app)
        return app

    @classmethod
    def reject_application(
        cls,
        db: Session,
        application_id: str,
        user: User,
        notes: Optional[str] = None,
    ) -> Application:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        if user.role != UserRole.ADMIN:
            if user.role != UserRole.GOVERNMENT:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Government or Admin can reject.")
            if user.department_id and app.challenge.department_id and user.department_id != app.challenge.department_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        app.status = ApplicationStatus.REJECTED.value
        if notes:
            app.review_notes = f"{app.review_notes or ''} [Rejected: {notes}]".strip()

        db.add(
            AuditLog(
                user_id=user.id,
                action="application_rejected",
                entity_type="Application",
                entity_id=app.id,
                metadata_json=json.dumps({
                    "application_code": app.application_code,
                    "notes": notes,
                }),
            )
        )
        db.commit()
        db.refresh(app)
        return app
