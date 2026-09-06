from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.procurement import ProcurementPathway
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_role,
    require_authenticated_user,
)
from app.schemas.procurement_contracts import (
    ProcurementPathwayCreateRequest,
    ProcurementPathwayResponse,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()

require_admin_or_procure = require_role(
    UserRole.ADMIN,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.GOVERNMENT,
)


@router.get(
    "/pathways",
    response_model=List[ProcurementPathwayResponse],
    summary="List configurable public procurement pathways",
)
def list_pathways(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ProcurementContractService.list_pathways(db)


@router.post(
    "/pathways",
    response_model=ProcurementPathwayResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Configure a new procurement pathway",
)
def create_pathway(
    payload: ProcurementPathwayCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_procure),
):
    return ProcurementContractService.create_pathway(db, current_user, payload)
