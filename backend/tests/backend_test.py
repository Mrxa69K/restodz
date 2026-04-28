"""
RestaurantOS backend integration tests.
Covers: auth, categories, items, tables, QR, stock, orders lifecycle,
analytics (dashboard + trends), public menu, public order, multi-tenant isolation.
"""
import os
import base64
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resto-analytics-31.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "karim@restaurantos.dz"
SEED_PASSWORD = "Karim2026!"
SEED_SLUG = "chez-karim"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def owner_token(s):
    r = s.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == SEED_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_valid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert d["user"]["email"] == SEED_EMAIL
        assert "password_hash" not in d["user"]

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, s, auth_headers):
        r = s.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == SEED_EMAIL
        assert d["restaurant"]["slug"] == SEED_SLUG

    def test_me_no_auth(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_new(self, s):
        unique = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_{unique}@example.com",
            "password": "Passw0rd!",
            "name": "TEST User",
            "restaurant_name": f"TEST Resto {unique}",
        }
        # use fresh session so cookies don't leak into other tests
        fresh = requests.Session()
        r = fresh.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d
        assert d["user"]["email"] == payload["email"].lower()
        assert d["restaurant"]["slug"].startswith(f"test-resto-{unique}")
        # duplicate email
        r2 = fresh.post(f"{API}/auth/register", json=payload)
        assert r2.status_code == 400


# ---------- CATEGORIES + ITEMS ----------
class TestCategoriesItems:
    def test_list_categories(self, s, auth_headers):
        r = s.get(f"{API}/categories", headers=auth_headers)
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list) and len(cats) >= 4

    def test_list_items(self, s, auth_headers):
        r = s.get(f"{API}/items", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 11

    def test_category_crud_cycle(self, s, auth_headers):
        # create
        payload = {"name": {"fr": "TEST_Cat", "ar": "تست", "en": "TEST_Cat"}, "order": 99}
        r = s.post(f"{API}/categories", json=payload, headers=auth_headers)
        assert r.status_code == 200
        cid = r.json()["id"]
        # update
        payload2 = {"name": {"fr": "TEST_Cat_upd", "ar": "تست", "en": "TEST"}, "order": 50}
        r = s.patch(f"{API}/categories/{cid}", json=payload2, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name"]["fr"] == "TEST_Cat_upd"
        # verify via list
        r = s.get(f"{API}/categories", headers=auth_headers)
        assert any(c["id"] == cid and c["name"]["fr"] == "TEST_Cat_upd" for c in r.json())
        # delete
        r = s.delete(f"{API}/categories/{cid}", headers=auth_headers)
        assert r.status_code == 200
        # verify gone
        r = s.get(f"{API}/categories", headers=auth_headers)
        assert not any(c["id"] == cid for c in r.json())

    def test_item_crud_cycle(self, s, auth_headers):
        cats = s.get(f"{API}/categories", headers=auth_headers).json()
        cat_id = cats[0]["id"]
        payload = {
            "category_id": cat_id,
            "name": {"fr": "TEST_Item", "ar": "", "en": ""},
            "description": {"fr": "", "ar": "", "en": ""},
            "price": 500.0, "image_url": "", "available": True, "order": 10,
        }
        r = s.post(f"{API}/items", json=payload, headers=auth_headers)
        assert r.status_code == 200
        iid = r.json()["id"]
        # update
        payload["price"] = 700.0
        payload["name"]["fr"] = "TEST_Item_upd"
        r = s.patch(f"{API}/items/{iid}", json=payload, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["price"] == 700.0
        # delete
        r = s.delete(f"{API}/items/{iid}", headers=auth_headers)
        assert r.status_code == 200


# ---------- TABLES + QR ----------
class TestTables:
    def test_list_tables(self, s, auth_headers):
        r = s.get(f"{API}/tables", headers=auth_headers)
        assert r.status_code == 200
        tables = r.json()
        assert len(tables) >= 8

    def test_table_qr(self, s, auth_headers):
        tables = s.get(f"{API}/tables", headers=auth_headers).json()
        tid = tables[0]["id"]
        r = s.get(f"{API}/tables/{tid}/qr", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "qr_png_base64" in d and len(d["qr_png_base64"]) > 100
        # valid base64 png
        raw = base64.b64decode(d["qr_png_base64"])
        assert raw[:8] == b"\x89PNG\r\n\x1a\n"
        assert SEED_SLUG in d["url"]


# ---------- STOCK ----------
class TestStock:
    def test_list_stock(self, s, auth_headers):
        r = s.get(f"{API}/stock", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_stock_crud(self, s, auth_headers):
        payload = {"name": "TEST_ingredient", "unit": "kg", "quantity": 10, "low_threshold": 2, "cost": 500}
        r = s.post(f"{API}/stock", json=payload, headers=auth_headers)
        assert r.status_code == 200
        sid = r.json()["id"]
        payload["quantity"] = 20
        r = s.patch(f"{API}/stock/{sid}", json=payload, headers=auth_headers)
        assert r.status_code == 200 and r.json()["quantity"] == 20
        r = s.delete(f"{API}/stock/{sid}", headers=auth_headers)
        assert r.status_code == 200


# ---------- ORDERS ----------
class TestOrders:
    def test_list_orders(self, s, auth_headers):
        r = s.get(f"{API}/orders", headers=auth_headers)
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        # enrichment
        if orders:
            o = orders[0]
            assert "items_detail" in o

    def test_order_lifecycle(self, s, auth_headers):
        items = s.get(f"{API}/items", headers=auth_headers).json()
        tables = s.get(f"{API}/tables", headers=auth_headers).json()
        payload = {
            "table_id": tables[0]["id"],
            "type": "dine_in",
            "items": [{"item_id": items[0]["id"], "quantity": 2, "note": "TEST"}],
            "customer_name": "TEST_Customer",
            "customer_phone": "",
            "note": "TEST order",
        }
        r = s.post(f"{API}/orders", json=payload, headers=auth_headers)
        assert r.status_code == 200
        order = r.json()
        oid = order["id"]
        assert order["status"] == "pending"
        assert order["total"] == items[0]["price"] * 2
        assert order.get("table_label") == tables[0]["label"]
        # transitions
        for st in ["preparing", "ready", "served"]:
            r = s.patch(f"{API}/orders/{oid}/status", json={"status": st}, headers=auth_headers)
            assert r.status_code == 200, r.text
            assert r.json()["status"] == st
        # invalid status
        r = s.patch(f"{API}/orders/{oid}/status", json={"status": "bogus"}, headers=auth_headers)
        assert r.status_code == 400


# ---------- ANALYTICS ----------
class TestAnalytics:
    def test_dashboard(self, s, auth_headers):
        r = s.get(f"{API}/analytics/dashboard", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["revenue_today", "orders_today", "hourly_revenue", "best_sellers", "active_orders"]:
            assert k in d
        assert isinstance(d["hourly_revenue"], list) and len(d["hourly_revenue"]) > 0
        # best sellers include name localized
        if d["best_sellers"]:
            assert "name" in d["best_sellers"][0]
            assert "fr" in d["best_sellers"][0]["name"]
        # active_orders enriched
        if d["active_orders"]:
            assert "items_detail" in d["active_orders"][0]

    def test_trends(self, s, auth_headers):
        r = s.get(f"{API}/analytics/trends?days=7", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "daily" in d and "peak_hours" in d
        assert isinstance(d["daily"], list)
        assert len(d["peak_hours"]) == 24


# ---------- PUBLIC (customer menu, no auth) ----------
class TestPublic:
    def test_public_menu_no_auth(self):
        r = requests.get(f"{API}/public/restaurant/{SEED_SLUG}")
        assert r.status_code == 200
        d = r.json()
        assert d["restaurant"]["slug"] == SEED_SLUG
        assert len(d["categories"]) >= 4
        assert len(d["items"]) >= 11

    def test_public_menu_404(self):
        r = requests.get(f"{API}/public/restaurant/does-not-exist-xyz")
        assert r.status_code == 404

    def test_public_place_order(self):
        menu = requests.get(f"{API}/public/restaurant/{SEED_SLUG}").json()
        item = menu["items"][0]
        payload = {
            "type": "takeaway",
            "items": [{"item_id": item["id"], "quantity": 1, "note": ""}],
            "customer_name": "TEST_Public",
            "customer_phone": "0555000000",
            "note": "TEST_public_order",
        }
        r = requests.post(f"{API}/public/restaurant/{SEED_SLUG}/order", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "pending"
        assert d["total"] == item["price"]


# ---------- MULTI-TENANT ISOLATION ----------
class TestMultiTenant:
    def test_isolation(self, s):
        # register a brand new tenant with isolated session
        unique = uuid.uuid4().hex[:8]
        iso = requests.Session()
        reg = iso.post(f"{API}/auth/register", json={
            "email": f"TEST_iso_{unique}@example.com",
            "password": "Passw0rd!",
            "name": "Iso",
            "restaurant_name": f"TEST Iso {unique}",
        }).json()
        token2 = reg["token"]
        # use a fresh session (no cookie) with only bearer header
        iso2 = requests.Session()
        h2 = {"Authorization": f"Bearer {token2}"}
        # New tenant should see 0 categories/items/tables/stock/orders
        for ep in ["categories", "items", "tables", "stock", "orders"]:
            r = iso2.get(f"{API}/{ep}", headers=h2)
            assert r.status_code == 200
            assert r.json() == [], f"{ep} should be empty for new tenant but got {len(r.json())}"
