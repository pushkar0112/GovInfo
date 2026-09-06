import os

# Force in-memory SQLite with StaticPool for all test executions
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from app.core.database import Base, engine


@pytest.fixture(autouse=True)
def setup_database():
    """Clean schema in RAM for every test case."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
