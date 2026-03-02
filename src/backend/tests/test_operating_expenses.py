import io
from datetime import date, datetime, timezone
from unittest.mock import patch

import pytest
import pytest_asyncio

from app.models import OperatingExpense
from app.models.operating_expense import OperatingExpenseCategory

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def sample_operating_expense(db_session, sample_admin):
    """Create a sample operating expense."""
    expense = OperatingExpense(
        submitted_by=sample_admin.id,
        description="Propane refill",
        amount_cents=5000,  # $50.00
        category=OperatingExpenseCategory.propane,
        expense_date=date(2026, 3, 1),
        notes="Regular monthly refill"
    )
    db_session.add(expense)
    await db_session.commit()
    await db_session.refresh(expense)
    return expense


async def test_create_operating_expense(auth_client):
    """Admin can create operating expenses."""
    expense_data = {
        "description": "Water delivery",
        "amount_cents": 7500,
        "category": "water",
        "expense_date": "2026-03-01",
        "notes": "Monthly water delivery"
    }

    response = await auth_client.post("/api/v1/operating-expenses", json=expense_data)

    assert response.status_code == 201
    data = response.json()
    assert data["description"] == expense_data["description"]
    assert data["amount_cents"] == expense_data["amount_cents"]
    assert data["category"] == expense_data["category"]
    assert data["expense_date"] == expense_data["expense_date"]
    assert data["reimbursed"] is False
    assert data["reimbursed_at"] is None


async def test_list_operating_expenses(auth_client, sample_operating_expense):
    """Admin can list operating expenses."""
    response = await auth_client.get("/api/v1/operating-expenses")

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["total_amount_cents"] == sample_operating_expense.amount_cents
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(sample_operating_expense.id)


async def test_list_operating_expenses_with_filters(auth_client, db_session, sample_admin):
    """Test filtering operating expenses."""
    # Create expenses with different categories and dates
    expenses = [
        OperatingExpense(
            submitted_by=sample_admin.id,
            description="Propane",
            amount_cents=5000,
            category=OperatingExpenseCategory.propane,
            expense_date=date(2026, 2, 15),
            reimbursed=False
        ),
        OperatingExpense(
            submitted_by=sample_admin.id,
            description="Water",
            amount_cents=3000,
            category=OperatingExpenseCategory.water,
            expense_date=date(2026, 3, 1),
            reimbursed=True
        ),
        OperatingExpense(
            submitted_by=sample_admin.id,
            description="Maintenance",
            amount_cents=15000,
            category=OperatingExpenseCategory.maintenance,
            expense_date=date(2026, 3, 15)
        )
    ]

    for expense in expenses:
        db_session.add(expense)
    await db_session.commit()

    # Filter by category
    response = await auth_client.get("/api/v1/operating-expenses?category=propane")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["items"][0]["category"] == "propane"

    # Filter by reimbursed status
    response = await auth_client.get("/api/v1/operating-expenses?reimbursed=true")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert data["items"][0]["reimbursed"] is True

    # Filter by date range
    response = await auth_client.get(
        "/api/v1/operating-expenses?start_date=2026-03-01&end_date=2026-03-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 2  # Water and maintenance
    assert data["filters_applied"]["start_date"] == "2026-03-01"
    assert data["filters_applied"]["end_date"] == "2026-03-31"


async def test_update_operating_expense(auth_client, sample_operating_expense):
    """Admin can update operating expenses."""
    update_data = {
        "description": "Updated description",
        "amount_cents": 6000,
        "notes": "Updated notes"
    }

    response = await auth_client.put(
        f"/api/v1/operating-expenses/{sample_operating_expense.id}",
        json=update_data
    )

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == update_data["description"]
    assert data["amount_cents"] == update_data["amount_cents"]
    assert data["notes"] == update_data["notes"]


@patch("app.services.storage_service.storage_service.save_receipt")
async def test_upload_operating_expense_receipt(mock_save_receipt, auth_client, sample_operating_expense):
    """Admin can upload receipts for operating expenses."""
    mock_save_receipt.return_value = "/uploads/receipts/operating-receipt.pdf"

    file_content = b"fake pdf data"
    files = {
        "file": ("receipt.pdf", io.BytesIO(file_content), "application/pdf")
    }

    response = await auth_client.post(
        f"/api/v1/operating-expenses/{sample_operating_expense.id}/receipt",
        files=files
    )

    assert response.status_code == 200
    data = response.json()
    assert data["receipt_url"] == "/uploads/receipts/operating-receipt.pdf"
    assert data["message"] == "Receipt uploaded successfully"


async def test_reimburse_operating_expense(auth_client, sample_operating_expense):
    """Admin can mark operating expenses as reimbursed."""
    response = await auth_client.put(
        f"/api/v1/operating-expenses/{sample_operating_expense.id}/reimburse"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["reimbursed"] is True
    assert data["reimbursed_at"] is not None

    # Verify timestamp is recent
    reimbursed_at = datetime.fromisoformat(data["reimbursed_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    assert (now - reimbursed_at).total_seconds() < 60  # Within last minute


async def test_reimburse_already_reimbursed(auth_client, db_session, sample_admin):
    """Test error when trying to reimburse already reimbursed expense."""
    expense = OperatingExpense(
        submitted_by=sample_admin.id,
        description="Already reimbursed",
        amount_cents=1000,
        category=OperatingExpenseCategory.supplies,
        expense_date=date.today(),
        reimbursed=True,
        reimbursed_at=datetime.now(timezone.utc)
    )
    db_session.add(expense)
    await db_session.commit()

    response = await auth_client.put(f"/api/v1/operating-expenses/{expense.id}/reimburse")

    assert response.status_code == 400
    assert "already marked as reimbursed" in response.json()["detail"]


async def test_operating_expense_validation(auth_client):
    """Test operating expense validation rules."""
    # Test negative amount
    response = await auth_client.post(
        "/api/v1/operating-expenses",
        json={
            "description": "Invalid expense",
            "amount_cents": -100,
            "category": "propane",
            "expense_date": "2026-03-01"
        }
    )
    assert response.status_code == 422

    # Test missing required fields
    response = await auth_client.post(
        "/api/v1/operating-expenses",
        json={"amount_cents": 1000}
    )
    assert response.status_code == 422

    # Test invalid category
    response = await auth_client.post(
        "/api/v1/operating-expenses",
        json={
            "description": "Test expense",
            "amount_cents": 1000,
            "category": "invalid_category",
            "expense_date": "2026-03-01"
        }
    )
    assert response.status_code == 422


async def test_operating_expense_not_found(auth_client):
    """Test 404 for non-existent operating expenses."""
    fake_expense_id = "12345678-1234-5678-9012-123456789012"

    response = await auth_client.put(
        f"/api/v1/operating-expenses/{fake_expense_id}",
        json={"description": "Updated"}
    )
    assert response.status_code == 404

    response = await auth_client.put(f"/api/v1/operating-expenses/{fake_expense_id}/reimburse")
    assert response.status_code == 404


async def test_unauthorized_access(client):
    """Test that unauthenticated users can't access operating expenses."""
    response = await client.get("/api/v1/operating-expenses")
    assert response.status_code == 401

    response = await client.post(
        "/api/v1/operating-expenses",
        json={
            "description": "Test",
            "amount_cents": 1000,
            "category": "propane",
            "expense_date": "2026-03-01"
        }
    )
    assert response.status_code == 401


async def test_operating_expense_pagination(auth_client, db_session, sample_admin):
    """Test operating expense pagination."""
    # Create multiple expenses
    for i in range(7):
        expense = OperatingExpense(
            submitted_by=sample_admin.id,
            description=f"Test expense {i}",
            amount_cents=1000 + i,
            category=OperatingExpenseCategory.supplies,
            expense_date=date(2026, 3, i + 1)
        )
        db_session.add(expense)
    await db_session.commit()

    # Test first page
    response = await auth_client.get("/api/v1/operating-expenses?page=1&per_page=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3
    assert data["total_count"] == 7

    # Test second page
    response = await auth_client.get("/api/v1/operating-expenses?page=2&per_page=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3

    # Test last page
    response = await auth_client.get("/api/v1/operating-expenses?page=3&per_page=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1  # Only 1 item on last page