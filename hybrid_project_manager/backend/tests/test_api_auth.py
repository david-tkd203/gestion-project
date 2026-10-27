import pytest
from rest_framework import status


@pytest.mark.django_db
def test_login_valid_credentials(api_client, user):
    response = api_client.post(
        "/api/token/",
        {"username": "testuser", "password": "testpass123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access" in data
    assert "refresh" in data


@pytest.mark.django_db
def test_login_invalid_credentials(api_client, user):
    response = api_client.post(
        "/api/token/",
        {"username": "testuser", "password": "wrongpassword"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_token_refresh_valid(api_client, user):
    login_res = api_client.post(
        "/api/token/",
        {"username": "testuser", "password": "testpass123"},
        format="json",
    )
    refresh_token = login_res.json()["refresh"]

    response = api_client.post(
        "/api/token/refresh/",
        {"refresh": refresh_token},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access" in data


@pytest.mark.django_db
def test_token_refresh_invalid(api_client):
    response = api_client.post(
        "/api/token/refresh/",
        {"refresh": "invalid-or-expired-token"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
