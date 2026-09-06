import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all SQLAlchemy models are registered
from app.api.v1.router import api_router
from app.api.v1.endpoints import health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("govinnovate")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.
    Initializes database tables on startup if database is available.
    """
    logger.info("Initializing GovInnovate API services...")
    try:
        # Create tables automatically for development/prototyping
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.warning(
            f"Could not connect to database on startup ({exc}). "
            "The API will remain functional, but database operations may fail until DB is available."
        )
    yield
    logger.info("Shutting down GovInnovate API services...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description="GovInnovate Backend API - National Government Innovation Procurement Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Set up CORS middleware
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include v1 API router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also expose health endpoint directly at /api/health to satisfy direct health specifications
app.include_router(health.router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "govinnovate-api",
        "status": "online",
        "version": "1.0.0",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": f"{settings.API_V1_STR}/health",
    }
