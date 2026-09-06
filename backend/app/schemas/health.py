from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    Standard health check response model.
    """
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    service: str = Field(default="govinnovate-api", json_schema_extra={"example": "govinnovate-api"})
