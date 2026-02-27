"""Tests for message template CRUD and rendering."""

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _get_auth_headers(client: AsyncClient, sample_user: User) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "testpassword123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_create_message_template(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)
    resp = await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Test Reminder",
            "category": "reminder",
            "channel": "both",
            "subject": "Reminder: {{event_name}}",
            "body": "Hi {{first_name}}, {{event_name}} is coming up!",
            "variables": ["first_name", "event_name"],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Reminder"
    assert data["category"] == "reminder"
    assert data["channel"] == "both"
    assert "first_name" in data["variables"]


async def test_list_message_templates(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)

    # Create two templates
    await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Template A",
            "category": "reminder",
            "channel": "sms",
            "body": "Hi {{first_name}}!",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Template B",
            "category": "day_of",
            "channel": "email",
            "body": "Today is {{event_name}}!",
        },
        headers=headers,
    )

    # List all
    resp = await client.get("/api/v1/message-templates", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    # Filter by category
    resp = await client.get(
        "/api/v1/message-templates?category=reminder", headers=headers
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Template A"

    # Filter by channel
    resp = await client.get(
        "/api/v1/message-templates?channel=email", headers=headers
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Template B"


async def test_update_message_template(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)

    # Create
    resp = await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Original",
            "category": "custom",
            "channel": "sms",
            "body": "Hello!",
        },
        headers=headers,
    )
    template_id = resp.json()["id"]

    # Update
    resp = await client.put(
        f"/api/v1/message-templates/{template_id}",
        json={"name": "Updated", "body": "New body"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"
    assert resp.json()["body"] == "New body"


async def test_delete_message_template(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)

    # Create
    resp = await client.post(
        "/api/v1/message-templates",
        json={
            "name": "To Delete",
            "category": "custom",
            "channel": "sms",
            "body": "Goodbye!",
        },
        headers=headers,
    )
    template_id = resp.json()["id"]

    # Delete
    resp = await client.delete(
        f"/api/v1/message-templates/{template_id}", headers=headers
    )
    assert resp.status_code == 204

    # Verify gone
    resp = await client.get("/api/v1/message-templates", headers=headers)
    assert len(resp.json()) == 0


async def test_preview_message_template(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)

    # Create
    resp = await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Preview Test",
            "category": "reminder",
            "channel": "both",
            "subject": "Hi {{first_name}}, about {{event_name}}",
            "body": "Dear {{first_name}}, {{event_name}} is on {{event_date}}.",
            "variables": ["first_name", "event_name", "event_date"],
        },
        headers=headers,
    )
    template_id = resp.json()["id"]

    # Preview with defaults
    resp = await client.post(
        f"/api/v1/message-templates/{template_id}/preview",
        json={},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Jane" in data["rendered_body"]
    assert "Emerging from Winter Retreat" in data["rendered_body"]
    assert "Jane" in data["rendered_subject"]

    # Preview with custom data
    resp = await client.post(
        f"/api/v1/message-templates/{template_id}/preview",
        json={"sample_data": {"first_name": "Bala", "event_name": "Forest Therapy"}},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Bala" in data["rendered_body"]
    assert "Forest Therapy" in data["rendered_body"]


async def test_invalid_category(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)
    resp = await client.post(
        "/api/v1/message-templates",
        json={
            "name": "Bad",
            "category": "invalid_category",
            "channel": "sms",
            "body": "test",
        },
        headers=headers,
    )
    assert resp.status_code == 422
