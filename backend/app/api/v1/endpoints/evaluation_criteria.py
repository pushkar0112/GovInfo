from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.expert_evaluation_service import ExpertEvaluationService
from app.schemas.expert_evaluation import (
    EvaluationCriterionCreate,
    EvaluationCriterionUpdate,
    EvaluationCriterionResponse,
    EvaluationCriteriaListResponse,
)

router = APIRouter(tags=["Evaluation Criteria"])


@router.get(
    "/challenges/{challenge_id}/evaluation-criteria",
    response_model=EvaluationCriteriaListResponse,
    summary="List evaluation criteria for a challenge with weight validation",
)
@router.get(
    "/challenges/{challenge_id}/criteria",
    response_model=EvaluationCriteriaListResponse,
    include_in_schema=False,
)
def list_criteria(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    criteria = ExpertEvaluationService.get_challenge_criteria(db, challenge_id)
    total_weight, is_valid = ExpertEvaluationService.validate_criteria_weights(criteria)
    return {
        "items": criteria,
        "total_weight": total_weight,
        "is_valid": is_valid,
    }


@router.get(
    "/challenges/{challenge_id}/criteria/validate-weights",
    summary="Check if criteria weights sum to exactly 100%",
)
@router.get(
    "/challenges/{challenge_id}/evaluation-criteria/validate-weights",
    include_in_schema=False,
)
def validate_criteria_weights(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    criteria = ExpertEvaluationService.get_challenge_criteria(db, challenge_id)
    total_weight, is_valid = ExpertEvaluationService.validate_criteria_weights(criteria)
    return {
        "total_weight": total_weight,
        "is_valid": is_valid,
        "criteria_count": len(criteria),
    }


@router.post(
    "/challenges/{challenge_id}/evaluation-criteria",
    response_model=EvaluationCriterionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new evaluation criterion for a challenge",
)
@router.post(
    "/challenges/{challenge_id}/criteria",
    response_model=EvaluationCriterionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_criterion(
    challenge_id: str,
    payload: EvaluationCriterionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    criterion = ExpertEvaluationService.create_criterion(
        db=db,
        challenge_id=challenge_id,
        user=current_user,
        data=payload.model_dump(),
    )
    return criterion


@router.put(
    "/evaluation-criteria/{criterion_id}",
    response_model=EvaluationCriterionResponse,
    summary="Update an existing evaluation criterion",
)
def update_criterion(
    criterion_id: str,
    payload: EvaluationCriterionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    criterion = ExpertEvaluationService.update_criterion(
        db=db,
        criterion_id=criterion_id,
        user=current_user,
        data=payload.model_dump(exclude_unset=True),
    )
    return criterion


@router.delete(
    "/evaluation-criteria/{criterion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an evaluation criterion",
)
def delete_criterion(
    criterion_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ExpertEvaluationService.delete_criterion(
        db=db,
        criterion_id=criterion_id,
        user=current_user,
    )
    return None
