import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["KERAS_BACKEND"] = "torch"
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    print("Health check passed:", data)

def test_auth_and_users():
    # Login
    resp = client.post("/api/auth/login", json={"email": "sarah.chen@hien-network.io", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Me
    resp_me = client.get("/api/auth/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["email"] == "sarah.chen@hien-network.io"

    # Switch role
    resp_switch = client.post("/api/auth/switch-role", json={"role": "inspector"}, headers=headers)
    assert resp_switch.status_code == 200
    assert resp_switch.json()["user"]["role"] == "inspector"
    print("Auth tests passed.")

def test_hubs_and_products():
    resp_hubs = client.get("/api/hubs")
    assert resp_hubs.status_code == 200
    hubs = resp_hubs.json()
    assert len(hubs) >= 5
    print(f"Hubs test passed: {len(hubs)} hubs found.")

    resp_prod = client.get("/api/products")
    assert resp_prod.status_code == 200
    products = resp_prod.json()
    assert len(products) >= 10
    print(f"Products test passed: {len(products)} products found.")

def test_returns_and_assessments():
    resp_returns = client.get("/api/returns")
    assert resp_returns.status_code == 200
    rets = resp_returns.json()
    assert len(rets) > 0
    first_ret = rets[0]
    print(f"Returns test passed: {len(rets)} returns found. First return ID: {first_ret['id']}")

    # Test RF prediction endpoint
    resp_rf = client.post("/api/assessments/predict-disposition", json={
        "product_category": "Audio & Sound",
        "return_reason": "Customer_Changed_Mind",
        "packaging_damage_score": 12.0
    })
    assert resp_rf.status_code == 200
    rf_data = resp_rf.json()
    assert "predicted_disposition" in rf_data
    print("RF prediction passed:", rf_data["predicted_disposition"], rf_data["confidence_score"])

    # Test CNN prediction with synthetic image
    import io
    from PIL import Image
    img = Image.new("RGB", (224, 224), color=(150, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    resp_cnn = client.post("/api/assessments/predict-condition", files={"file": ("mug.jpg", buf, "image/jpeg")})
    assert resp_cnn.status_code == 200
    cnn_data = resp_cnn.json()
    assert "predicted_condition" in cnn_data
    print("CNN condition prediction passed:", cnn_data["predicted_condition"], cnn_data["probabilities"])

def test_inventory_and_forecasts():
    resp_inv = client.get("/api/inventory")
    assert resp_inv.status_code == 200
    assert len(resp_inv.json()) > 0
    print(f"Inventory test passed: {len(resp_inv.json())} items found.")

    resp_fc = client.get("/api/forecasts")
    assert resp_fc.status_code == 200
    fcs = resp_fc.json()
    assert len(fcs) > 0
    print(f"Forecasts test passed: {len(fcs)} forecasts found.")

def test_recommendations_and_analytics():
    resp_rec = client.get("/api/recommendations")
    assert resp_rec.status_code == 200
    print(f"Recommendations test passed: {len(resp_rec.json())} recommendations found.")

    resp_analytics = client.get("/api/analytics/impact")
    assert resp_analytics.status_code == 200
    data = resp_analytics.json()
    assert "totalReturnsProcessed" in data
    assert "baselineLogisticsCost" in data
    assert "emissionsAvoidedKg" in data
    print(f"Impact Analytics test passed: Avoided CO2: {data['emissionsAvoidedKg']} kg, Cost Saved: ${data['costAvoided']}")

if __name__ == "__main__":
    test_health()
    test_auth_and_users()
    test_hubs_and_products()
    test_returns_and_assessments()
    test_inventory_and_forecasts()
    test_recommendations_and_analytics()
    print("\nALL BACKEND & ML INTEGRATION TESTS PASSED CLEANLY!")
