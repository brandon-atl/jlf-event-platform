from decimal import Decimal
from unittest.mock import patch

import pytest

from app.models import (
    CoCreator,
    EventCoCreator,
    EventSettlement,
    Expense,
    Registration,
    RegistrationStatus
)
from app.models.expense import ActorType, ExpenseCategory

pytestmark = pytest.mark.asyncio


# Fixtures are now in conftest.py


async def test_calculate_settlement(auth_client, event_with_co_creator, completed_registrations, sample_expenses):
    """Test settlement calculation with known values."""
    response = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "Initial settlement calculation"}
    )

    assert response.status_code == 201
    data = response.json()

    # Verify calculations
    # Revenue: 3 × $100 = $300 (30000 cents)
    assert data["gross_revenue_cents"] == 30000

    # Stripe fees: 2.9% of $300 + $0.30 × 3 transactions = $8.70 + $0.90 = $9.60 (960 cents)
    expected_fees = int(30000 * 0.029 + (3 * 30))  # 870 + 90 = 960
    assert data["stripe_fees_cents"] == expected_fees

    # Expenses: $20 + $15 = $35 (3500 cents)
    assert data["total_expenses_cents"] == 3500

    # Net: $300 - $9.60 - $35 = $255.40 (25540 cents)
    expected_net = 30000 - expected_fees - 3500
    assert data["net_cents"] == expected_net

    # Verify split configuration (100% to co-creator — single co-creator in test)
    assert len(data["split_config"]) == 1
    split = data["split_config"][0]
    assert split["percentage"] == 100.0
    assert split["payout_cents"] == expected_net  # 100% of net

    assert data["fees_estimated"] is True
    assert data["version"] == 1
    assert data["notes"] == "Initial settlement calculation"


async def test_settlement_versioning(auth_client, event_with_co_creator, completed_registrations, sample_expenses):
    """Test that recalculating creates a new version."""
    # First calculation
    response1 = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "Version 1"}
    )
    assert response1.status_code == 201
    assert response1.json()["version"] == 1

    # Second calculation
    response2 = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "Version 2"}
    )
    assert response2.status_code == 201
    assert response2.json()["version"] == 2

    # Both should have same calculations but different versions
    data1 = response1.json()
    data2 = response2.json()
    assert data1["gross_revenue_cents"] == data2["gross_revenue_cents"]
    assert data1["version"] != data2["version"]


async def test_settlement_split_validation(auth_client, event_with_co_creator, sample_co_creator):
    """Test that split percentages must sum to 100%."""
    # Create split override that doesn't sum to 100%
    response = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={
            "split_overrides": [
                {
                    "co_creator_id": str(sample_co_creator.id),
                    "percentage": 75.0  # Only 75%, not 100%
                }
            ]
        }
    )

    assert response.status_code == 400
    assert "must sum to exactly 100%" in response.json()["detail"]


async def test_get_current_settlement(auth_client, event_with_co_creator):
    """Test getting the current (latest) settlement."""
    # No settlement yet
    response = await auth_client.get(f"/api/v1/events/{event_with_co_creator.id}/settlement")
    assert response.status_code == 200
    assert response.json() is None

    # Create a settlement
    calc_response = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "Test settlement"}
    )
    assert calc_response.status_code == 201

    # Now we should get it
    response = await auth_client.get(f"/api/v1/events/{event_with_co_creator.id}/settlement")
    assert response.status_code == 200
    data = response.json()
    assert data is not None
    assert data["version"] == 1
    assert data["notes"] == "Test settlement"


async def test_settlement_history(auth_client, event_with_co_creator):
    """Test getting settlement history."""
    # Create multiple settlements
    for i in range(3):
        response = await auth_client.post(
            f"/api/v1/events/{event_with_co_creator.id}/settlement",
            json={"notes": f"Version {i+1}"}
        )
        assert response.status_code == 201

    # Get history
    response = await auth_client.get(f"/api/v1/events/{event_with_co_creator.id}/settlement/history")
    assert response.status_code == 200
    data = response.json()

    assert data["total_count"] == 3
    assert len(data["items"]) == 3

    # Should be ordered newest first
    assert data["items"][0]["version"] == 3
    assert data["items"][1]["version"] == 2
    assert data["items"][2]["version"] == 1


async def test_settlement_with_zero_revenue(auth_client, event_with_co_creator, sample_expenses):
    """Test settlement calculation when event has no revenue."""
    # No completed registrations, only expenses
    response = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "No revenue test"}
    )

    assert response.status_code == 201
    data = response.json()

    assert data["gross_revenue_cents"] == 0
    assert data["stripe_fees_cents"] == 0  # No transactions
    assert data["total_expenses_cents"] == 3500  # $35 in expenses
    assert data["net_cents"] == -3500  # Negative net

    # Payouts should be 0 when net is negative
    split = data["split_config"][0]
    assert split["payout_cents"] == 0


async def test_admin_only_settlement_calculation(client, event_with_co_creator):
    """Test that only admins can calculate settlements."""
    response = await client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={"notes": "Unauthorized attempt"}
    )
    assert response.status_code == 401


async def test_settlement_with_split_overrides(auth_client, event_with_co_creator, sample_co_creator, completed_registrations):
    """Test settlement calculation with custom split percentages."""
    # Calculate with 100% override (instead of default 50%)
    response = await auth_client.post(
        f"/api/v1/events/{event_with_co_creator.id}/settlement",
        json={
            "split_overrides": [
                {
                    "co_creator_id": str(sample_co_creator.id),
                    "percentage": 100.0
                }
            ],
            "notes": "100% to co-creator"
        }
    )

    assert response.status_code == 201
    data = response.json()

    # Co-creator should get 100% of net
    split = data["split_config"][0]
    assert split["percentage"] == 100.0
    assert split["payout_cents"] == data["net_cents"]