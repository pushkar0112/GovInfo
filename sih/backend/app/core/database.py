import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("govinnovate.database")

# Handle SQLite vs PostgreSQL specific engine arguments
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create engine with appropriate pooling
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Test connections before handing them out
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that yields a database session for request scope.
    Ensures session is properly closed after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
