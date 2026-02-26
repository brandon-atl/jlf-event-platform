import pytest

from app.services.auth_service import create_access_token

pytestmark = pytest.mark.asyncio


async def test_login_valid_credentials(client, sample_user):
    """Login with correct email/password returns JWT token."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "testpassword123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client, sample_user):
    """Login with wrong password returns 401."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


async def test_me_with_valid_token(client, sample_user):
    """GET /auth/me with valid JWT returns user info."""
    token = create_access_token(
        {"sub": str(sample_user.id), "email": sample_user.email, "role": sample_user.role.value}
    )
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@justloveforest.com"
    assert data["name"] == "Admin User"
    assert data["role"] == "admin"


async def test_me_without_token(client):
    """GET /auth/me without token returns 401/403."""
    response = await client.get("/api/v1/auth/me")

    assert response.status_code in (401, 403)
