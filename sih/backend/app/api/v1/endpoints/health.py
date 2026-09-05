from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="API Health Check",
    description="Returns the operational status and service name of the GovInnovate API.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="govinnovate-api")
