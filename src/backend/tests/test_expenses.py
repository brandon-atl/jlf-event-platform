import io
from unittest.mock import AsyncMock, patch

import pytest

from app.models import Expense
from app.models.expense import ActorType, ExpenseCategory

pytestmark = pytest.mark.asyncio


async def test_create_expense_admin(auth_client, sample_event):
    """Admin can create expenses."""
    expense_data = {
        "description": "Food for event",
        "amount_cents": 5000,
        "category": "groceries",
        "notes": "Organic vegetables"
    }

    response = await auth_client.post(
        f"/api/v1/events/{sample_event.id}/expenses",
        json=expense_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["description"] == expense_data["description"]
    assert data["amount_cents"] == expense_data["amount_cents"]
    assert data["category"] == expense_data["category"]
    assert data["actor_type"] == "admin"
    assert data["event_id"] == str(sample_event.id)


async def test_list_expenses(auth_client, sample_event, sample_expense):
    """Admin can list expenses for an event."""
    response = await auth_client.get(f"/api/v1/events/{sample_event.id}/expenses")

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["total_amount_cents"] == sample_expense.amount_cents
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(sample_expense.id)


async def test_update_expense_admin(auth_client, sample_event, sample_expense):
    """Admin can update any expense."""
    update_data = {
        "description": "Updated description",
        "amount_cents": 7500
    }

    response = await auth_client.put(
        f"/api/v1/events/{sample_event.id}/expenses/{sample_expense.id}",
        json=update_data
    )

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == update_data["description"]
    assert data["amount_cents"] == update_data["amount_cents"]


async def test_delete_expense_admin(auth_client, sample_event, sample_expense):
    """Admin can delete (soft delete) expenses."""
    response = await auth_client.delete(
        f"/api/v1/events/{sample_event.id}/expenses/{sample_expense.id}"
    )

    assert response.status_code == 204

    # Verify expense is soft deleted (not returned in list)
    response = await auth_client.get(f"/api/v1/events/{sample_event.id}/expenses")
    data = response.json()
    assert data["total_count"] == 0


@patch("app.services.storage_service.storage_service.save_receipt")
async def test_upload_receipt(mock_save_receipt, auth_client, sample_event, sample_expense):
    """Admin can upload receipts for expenses."""
    mock_save_receipt.return_value = "/uploads/receipts/test-receipt.jpg"

    # Create a mock file
    file_content = b"fake image data"
    files = {
        "file": ("receipt.jpg", io.BytesIO(file_content), "image/jpeg")
    }

    response = await auth_client.post(
        f"/api/v1/events/{sample_event.id}/expenses/{sample_expense.id}/receipt",
        files=files
    )

    assert response.status_code == 200
    data = response.json()
    assert data["receipt_url"] == "/uploads/receipts/test-receipt.jpg"
    assert data["message"] == "Receipt uploaded successfully"

    # Verify save_receipt was called
    mock_save_receipt.assert_called_once()


async def test_expense_validation(auth_client, sample_event):
    """Test expense validation rules."""
    # Test negative amount
    response = await auth_client.post(
        f"/api/v1/events/{sample_event.id}/expenses",
        json={
            "description": "Invalid expense",
            "amount_cents": -100,  # Invalid
            "category": "groceries"
        }
    )
    assert response.status_code == 422

    # Test missing required fields
    response = await auth_client.post(
        f"/api/v1/events/{sample_event.id}/expenses",
        json={
            "amount_cents": 1000
            # Missing description and category
        }
    )
    assert response.status_code == 422

    # Test invalid category
    response = await auth_client.post(
        f"/api/v1/events/{sample_event.id}/expenses",
        json={
            "description": "Test expense",
            "amount_cents": 1000,
            "category": "invalid_category"
        }
    )
    assert response.status_code == 422


async def test_expense_not_found(auth_client, sample_event):
    """Test 404 for non-existent expenses."""
    fake_expense_id = "12345678-1234-5678-9012-123456789012"

    # Test update non-existent expense
    response = await auth_client.put(
        f"/api/v1/events/{sample_event.id}/expenses/{fake_expense_id}",
        json={"description": "Updated"}
    )
    assert response.status_code == 404

    # Test delete non-existent expense
    response = await auth_client.delete(
        f"/api/v1/events/{sample_event.id}/expenses/{fake_expense_id}"
    )
    assert response.status_code == 404


async def test_unauthorized_access(client, sample_event):
    """Test that unauthenticated users can't access expenses."""
    response = await client.get(f"/api/v1/events/{sample_event.id}/expenses")
    assert response.status_code == 401

    response = await client.post(
        f"/api/v1/events/{sample_event.id}/expenses",
        json={"description": "Test", "amount_cents": 1000, "category": "groceries"}
    )
    assert response.status_code == 401


async def test_pagination(auth_client, sample_event, session):
    """Test expense list pagination."""
    # Create multiple expenses
    for i in range(5):
        expense = Expense(
            event_id=sample_event.id,
            submitted_by=None,
            actor_type=ActorType.admin,
            description=f"Test expense {i}",
            amount_cents=1000 + i,
            category=ExpenseCategory.groceries
        )
        session.add(expense)
    await session.commit()

    # Test first page
    response = await auth_client.get(
        f"/api/v1/events/{sample_event.id}/expenses?page=1&per_page=3"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3
    assert data["total_count"] == 5

    # Test second page
    response = await auth_client.get(
        f"/api/v1/events/{sample_event.id}/expenses?page=2&per_page=3"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2