"""
RestaurantOS iteration-2 backend tests.
Covers: 4 seeded role accounts, /api/staff RBAC, /api/export/*.csv, public feedback,
kitchen role can still hit orders, and a quick regression smoke.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resto-analytics-31.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ACCOUNTS = {
    "owner":   ("karim@restaurantos.dz",   "Karim2026!"),
    "manager": ("manager@restaurantos.dz", "Manager2026!"),
    "kitchen": ("kitchen@restaurantos.dz", "Kitchen2026!"),
    "waiter":  ("waiter@restaurantos.dz",  "Waiter2026!"),
}

SEED_SLUG = "chez-karim"


def _login(email: str, password: str):
    """Use a fresh session per login so cookies don't leak across roles."""
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for role, (email, pw) in ACCOUNTS.items():
        tok, user = _login(email, pw)
        out[role] = {"token": tok, "user": user, "headers": {"Authorization": f"Bearer {tok}"}}
    return out


# ---------- 1. SEEDED ACCOUNTS LOGIN ----------
class TestSeededAccountsLogin:
    @pytest.mark.parametrize("role", list(ACCOUNTS.keys()))
    def test_login(self, role):
        email, pw = ACCOUNTS[role]
        tok, user = _login(email, pw)
        assert isinstance(tok, str) and len(tok) > 20
        assert user["email"] == email
        assert user["role"] == role


# ---------- 2. /api/staff RBAC ----------
class TestStaffRBAC:
    def test_owner_can_list_staff(self, tokens):
        r = requests.get(f"{API}/staff", headers=tokens["owner"]["headers"])
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 4
        emails = {u["email"] for u in rows}
        for _, (em, _pw) in ACCOUNTS.items():
            assert em in emails
        # password_hash must not leak
        assert all("password_hash" not in u for u in rows)

    def test_manager_can_list_staff(self, tokens):
        r = requests.get(f"{API}/staff", headers=tokens["manager"]["headers"])
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_kitchen_forbidden_list(self, tokens):
        r = requests.get(f"{API}/staff", headers=tokens["kitchen"]["headers"])
        assert r.status_code == 403

    def test_waiter_forbidden_list(self, tokens):
        r = requests.get(f"{API}/staff", headers=tokens["waiter"]["headers"])
        assert r.status_code == 403

    def test_kitchen_forbidden_create(self, tokens):
        r = requests.post(f"{API}/staff",
                          headers=tokens["kitchen"]["headers"],
                          json={"email": f"TEST_{uuid.uuid4().hex[:6]}@x.com",
                                "name": "X", "password": "Pass1234!", "role": "waiter"})
        assert r.status_code == 403

    def test_waiter_forbidden_create(self, tokens):
        r = requests.post(f"{API}/staff",
                          headers=tokens["waiter"]["headers"],
                          json={"email": f"TEST_{uuid.uuid4().hex[:6]}@x.com",
                                "name": "X", "password": "Pass1234!", "role": "kitchen"})
        assert r.status_code == 403

    def test_owner_create_kitchen_then_delete(self, tokens):
        email = f"TEST_kit_{uuid.uuid4().hex[:6]}@x.com"
        r = requests.post(f"{API}/staff",
                          headers=tokens["owner"]["headers"],
                          json={"email": email, "name": "TEST Kit",
                                "password": "Pass1234!", "role": "kitchen"})
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert r.json()["role"] == "kitchen"
        assert r.json()["email"] == email.lower()
        # PATCH update name
        r = requests.patch(f"{API}/staff/{sid}",
                           headers=tokens["owner"]["headers"],
                           json={"name": "TEST Kit Updated"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Kit Updated"
        # cleanup
        r = requests.delete(f"{API}/staff/{sid}", headers=tokens["owner"]["headers"])
        assert r.status_code == 200

    def test_manager_cannot_create_manager(self, tokens):
        r = requests.post(f"{API}/staff",
                          headers=tokens["manager"]["headers"],
                          json={"email": f"TEST_mgr_{uuid.uuid4().hex[:6]}@x.com",
                                "name": "TEST Mgr", "password": "Pass1234!",
                                "role": "manager"})
        assert r.status_code == 403

    def test_manager_can_create_waiter(self, tokens):
        email = f"TEST_wai_{uuid.uuid4().hex[:6]}@x.com"
        r = requests.post(f"{API}/staff",
                          headers=tokens["manager"]["headers"],
                          json={"email": email, "name": "TEST Wai",
                                "password": "Pass1234!", "role": "waiter"})
        assert r.status_code == 200
        sid = r.json()["id"]
        # cleanup
        requests.delete(f"{API}/staff/{sid}", headers=tokens["owner"]["headers"])

    def test_cannot_modify_owner(self, tokens):
        # find owner id from staff list
        rows = requests.get(f"{API}/staff", headers=tokens["owner"]["headers"]).json()
        owner = next(u for u in rows if u["role"] == "owner")
        r = requests.patch(f"{API}/staff/{owner['id']}",
                           headers=tokens["owner"]["headers"],
                           json={"name": "Hacked"})
        assert r.status_code == 403

    def test_cannot_delete_owner(self, tokens):
        rows = requests.get(f"{API}/staff", headers=tokens["owner"]["headers"]).json()
        owner = next(u for u in rows if u["role"] == "owner")
        r = requests.delete(f"{API}/staff/{owner['id']}", headers=tokens["owner"]["headers"])
        assert r.status_code == 403

    def test_cannot_delete_self(self, tokens):
        # manager tries to delete itself
        mgr_id = tokens["manager"]["user"]["id"]
        r = requests.delete(f"{API}/staff/{mgr_id}", headers=tokens["manager"]["headers"])
        assert r.status_code == 400


# ---------- 3. CSV EXPORTS ----------
class TestCSVExports:
    @pytest.mark.parametrize("path,filename", [
        ("/export/orders.csv", "commandes.csv"),
        ("/export/stock.csv", "stock.csv"),
        ("/export/items.csv", "menu.csv"),
    ])
    def test_csv_export(self, tokens, path, filename):
        r = requests.get(f"{API}{path}", headers=tokens["owner"]["headers"])
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct, f"content-type was {ct}"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert filename in cd
        # must have at least one row (header) with newline
        body = r.text
        assert "\n" in body or "\r" in body
        first_line = body.splitlines()[0]
        # header line must contain a comma
        assert "," in first_line


# ---------- 4. FEEDBACK ----------
class TestFeedback:
    def test_owner_lists_feedback(self, tokens):
        r = requests.get(f"{API}/feedback", headers=tokens["owner"]["headers"])
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) >= 6, f"expected >=6 seeded feedback, got {len(rows)}"
        for f in rows:
            assert 1 <= f["rating"] <= 5
            assert "comment" in f

    def test_public_post_feedback_no_auth(self):
        payload = {
            "rating": 5,
            "comment": "TEST_excellent",
            "customer_name": "TEST_Pub",
            "order_id": None,
        }
        r = requests.post(f"{API}/public/restaurant/{SEED_SLUG}/feedback", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["rating"] == 5
        assert d["comment"] == "TEST_excellent"
        assert "id" in d

    def test_public_feedback_rating_clamped_high(self):
        r = requests.post(f"{API}/public/restaurant/{SEED_SLUG}/feedback",
                          json={"rating": 99, "comment": "TEST_clamp_hi", "customer_name": "T"})
        assert r.status_code == 200
        assert r.json()["rating"] == 5

    def test_public_feedback_rating_clamped_low(self):
        r = requests.post(f"{API}/public/restaurant/{SEED_SLUG}/feedback",
                          json={"rating": -7, "comment": "TEST_clamp_lo", "customer_name": "T"})
        assert r.status_code == 200
        assert r.json()["rating"] == 1

    def test_public_feedback_404(self):
        r = requests.post(f"{API}/public/restaurant/does-not-exist-zzz/feedback",
                          json={"rating": 3, "comment": "x", "customer_name": "x"})
        assert r.status_code == 404


# ---------- 5. KITCHEN ROLE CAN STILL ACCESS ORDERS ----------
class TestKitchenRoleOrders:
    def test_kitchen_can_get_orders(self, tokens):
        r = requests.get(f"{API}/orders", headers=tokens["kitchen"]["headers"])
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_kitchen_can_patch_order_status(self, tokens):
        # owner creates a quick order, kitchen advances status
        items = requests.get(f"{API}/items", headers=tokens["owner"]["headers"]).json()
        tables = requests.get(f"{API}/tables", headers=tokens["owner"]["headers"]).json()
        payload = {
            "table_id": tables[0]["id"],
            "type": "dine_in",
            "items": [{"item_id": items[0]["id"], "quantity": 1, "note": "TEST_kit"}],
            "customer_name": "TEST_KitFlow",
            "customer_phone": "",
            "note": "TEST",
        }
        r = requests.post(f"{API}/orders", json=payload, headers=tokens["owner"]["headers"])
        assert r.status_code == 200
        oid = r.json()["id"]
        # kitchen advances
        r = requests.patch(f"{API}/orders/{oid}/status",
                           json={"status": "preparing"},
                           headers=tokens["kitchen"]["headers"])
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "preparing"


# ---------- 6. REGRESSION SMOKE ----------
class TestRegressionSmoke:
    def test_owner_dashboard(self, tokens):
        r = requests.get(f"{API}/analytics/dashboard", headers=tokens["owner"]["headers"])
        assert r.status_code == 200
        for k in ["revenue_today", "orders_today", "hourly_revenue", "best_sellers", "active_orders"]:
            assert k in r.json()

    def test_public_menu(self):
        r = requests.get(f"{API}/public/restaurant/{SEED_SLUG}")
        assert r.status_code == 200
        d = r.json()
        assert d["restaurant"]["slug"] == SEED_SLUG
        assert len(d["items"]) >= 11

    def test_manager_can_see_categories(self, tokens):
        r = requests.get(f"{API}/categories", headers=tokens["manager"]["headers"])
        assert r.status_code == 200
        assert len(r.json()) >= 4
