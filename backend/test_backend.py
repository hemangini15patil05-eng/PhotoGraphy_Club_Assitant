"""
Automated Backend Test Suite for FRAME AI
=============================================================================
Tests health endpoints, Pydantic validation, rate limiting, and chat responses.
=============================================================================
"""

import os
import sys
# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app, ip_request_timestamps

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "FRAME AI API"
    assert "version" in data

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "frame-ai-backend"
    assert "gemini_configured" in data
    assert "model" in data

def test_chat_empty_message_rejected():
    response = client.post("/chat", json={"message": "   "})
    assert response.status_code == 422 or response.status_code == 400

def test_chat_missing_message_rejected():
    response = client.post("/chat", json={})
    assert response.status_code == 422

def test_chat_message_exceeding_max_length_rejected():
    long_msg = "A" * 1005
    response = client.post("/chat", json={"message": long_msg})
    assert response.status_code == 422

def test_chat_valid_preview_response():
    response = client.post("/chat", json={"message": "Explain aperture and f-stop"})
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20

def test_chat_with_bounded_history():
    payload = {
        "message": "Give me an example for portraits.",
        "history": [
            {"role": "user", "content": "Explain aperture."},
            {"role": "model", "content": "Aperture controls light and depth of field."}
        ]
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data

def test_rate_limiting():
    # Clear timestamps for test client
    test_ip = "testclient"
    ip_request_timestamps[test_ip] = []

    # Send up to limit
    for _ in range(20):
        res = client.post("/chat", json={"message": "Test ping"})
        assert res.status_code == 200

    # 21st request should be rate-limited
    res_exceeded = client.post("/chat", json={"message": "Overflow ping"})
    assert res_exceeded.status_code == 429
    assert "Rate limit exceeded" in res_exceeded.json()["detail"]

    # Reset
    ip_request_timestamps[test_ip] = []

if __name__ == "__main__":
    print("Running FRAME AI automated test suite...")
    test_root_endpoint()
    print("[PASS] GET / passed")
    test_health_endpoint()
    print("[PASS] GET /health passed")
    test_chat_empty_message_rejected()
    print("[PASS] Empty message rejection passed")
    test_chat_missing_message_rejected()
    print("[PASS] Missing payload rejection passed")
    test_chat_message_exceeding_max_length_rejected()
    print("[PASS] Long message length rejection passed")
    test_chat_valid_preview_response()
    print("[PASS] Valid chat preview response passed")
    test_chat_with_bounded_history()
    print("[PASS] Conversation history context passed")
    test_rate_limiting()
    print("[PASS] In-memory rate limiting passed (429 enforced)")
    print("\nALL BACKEND AUTOMATED TESTS PASSED!")
