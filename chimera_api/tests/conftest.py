"""
Pytest fixtures for Chimera API tests
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4


@pytest.fixture
def test_user_id():
    """Returns a fixed test user ID for consistency across tests"""
    return "dc43c3a8-1234-5678-9abc-def012345678"


@pytest.fixture
def mock_supabase_client():
    """
    Returns a mock Supabase client with chained method support.
    Usage in tests: mock_supabase_client.table().insert().execute()
    """
    mock = MagicMock()

    # Configure mock to support method chaining
    mock.table.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.gte.return_value = mock
    mock.lte.return_value = mock
    mock.order.return_value = mock
    mock.single.return_value = mock

    # Configure execute() to return a response-like object
    mock.execute.return_value = MagicMock(data=[])

    return mock


@pytest.fixture
def sample_workout_data():
    """Returns sample workout data for testing"""
    from datetime import datetime

    return {
        "id": str(uuid4()),
        "user_id": "dc43c3a8-1234-5678-9abc-def012345678",
        "title": "Morning Run",
        "description": "Easy 5K",
        "activity_type": "run",
        "start_time": datetime(2025, 1, 15, 6, 0, 0).isoformat(),
        "end_time": datetime(2025, 1, 15, 7, 0, 0).isoformat(),
        "status": "planned",
        "created_at": datetime.now().isoformat(),
    }
