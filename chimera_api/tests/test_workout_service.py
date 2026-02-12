"""
Unit tests for workout_service.py

These tests verify:
1. create_workout includes correct user_id
2. update_workout enforces user_id filtering
3. delete_workout enforces user_id filtering
"""
import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime

from schemas import WorkoutCreate


@pytest.mark.asyncio
async def test_create_workout_includes_user_id(mock_supabase_client, test_user_id, sample_workout_data):
    """
    Verify that create_workout correctly inserts user_id into the database.
    This ensures workouts are scoped to the correct user.
    """
    with patch('services.workout_service.supabase_admin', mock_supabase_client):
        with patch('services.workout_service.gcal_service.sync_workout_to_calendar'):
            from services import workout_service

            # Prepare test data
            workout_data = WorkoutCreate(
                title="Test Workout",
                description="Test Description",
                activity_type="run",
                start_time=datetime(2025, 1, 15, 6, 0, 0),
                end_time=datetime(2025, 1, 15, 7, 0, 0),
                status="planned"
            )

            # Configure mock response
            mock_supabase_client.execute.return_value.data = [sample_workout_data]

            # Execute
            result = await workout_service.create_workout(workout_data, test_user_id)

            # Verify insert was called with user_id
            mock_supabase_client.table.assert_called_with("planned_workouts")
            insert_call_args = mock_supabase_client.insert.call_args
            inserted_data = insert_call_args[0][0]

            assert inserted_data["user_id"] == test_user_id, "user_id must be included in insert"
            assert inserted_data["title"] == "Test Workout"
            assert result["id"] == sample_workout_data["id"]


@pytest.mark.asyncio
async def test_update_workout_enforces_user_id(mock_supabase_client, test_user_id):
    """
    Verify that update_workout filters by user_id to prevent cross-user updates.
    Security-critical test: ensures users can't modify other users' workouts.
    """
    with patch('services.workout_service.supabase_admin', mock_supabase_client):
        with patch('services.workout_service.gcal_service.sync_workout_to_calendar'):
            from services import workout_service

            workout_id = uuid4()
            updates = {"title": "Updated Title"}

            # Configure mock response
            mock_supabase_client.execute.return_value.data = [{
                "id": str(workout_id),
                "title": "Updated Title",
                "user_id": test_user_id
            }]

            # Execute
            await workout_service.update_workout(workout_id, updates, test_user_id)

            # Verify both .eq() calls: one for id, one for user_id
            eq_calls = [call for call in mock_supabase_client.method_calls if call[0] == 'eq']

            # Should have 2 .eq() calls: .eq("id", ...) and .eq("user_id", ...)
            assert len(eq_calls) >= 2, "update_workout must filter by both id and user_id"

            # Verify user_id filtering
            user_id_filtered = any(
                call[1][0] == "user_id" and call[1][1] == test_user_id
                for call in eq_calls
            )
            assert user_id_filtered, "update_workout must call .eq('user_id', user_id)"


@pytest.mark.asyncio
async def test_delete_workout_enforces_user_id(mock_supabase_client, test_user_id):
    """
    Verify that delete_workout filters by user_id on both SELECT and DELETE.
    Security-critical test: ensures users can't delete other users' workouts.
    """
    with patch('services.workout_service.supabase_admin', mock_supabase_client):
        with patch('services.workout_service.gcal_service.delete_calendar_event'):
            from services import workout_service

            workout_id = uuid4()

            # Configure mock response for the select query
            mock_supabase_client.execute.return_value.data = [{
                "google_event_id": "gcal_123"
            }]

            # Execute
            await workout_service.delete_workout(workout_id, test_user_id)

            # Verify user_id filtering on both queries
            eq_calls = [call for call in mock_supabase_client.method_calls if call[0] == 'eq']

            # Should have at least 4 .eq() calls:
            # SELECT: .eq("id", ...) .eq("user_id", ...)
            # DELETE: .eq("id", ...) .eq("user_id", ...)
            assert len(eq_calls) >= 4, "delete_workout must filter by user_id on both SELECT and DELETE"

            # Verify user_id appears in filtering
            user_id_calls = [
                call for call in eq_calls
                if call[1][0] == "user_id" and call[1][1] == test_user_id
            ]
            assert len(user_id_calls) >= 2, "delete_workout must filter by user_id on both queries"
