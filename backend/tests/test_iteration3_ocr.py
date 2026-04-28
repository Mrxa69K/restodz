"""
RestaurantOS iteration 3 — OCR Menu Import (Groq Vision) backend tests.

Covers:
- POST /api/menu/ocr        (owner, kitchen=403, waiter=403, no-auth=401, non-image=400, real image happy path)
- POST /api/menu/ocr/apply  (owner happy path + fallback category + kitchen=403 + waiter=403)
"""
import io
import os
import time
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

USERS = {
    "owner":   ("karim@restaurantos.dz",   "Karim2026!"),
    "manager": ("manager@restaurantos.dz", "Manager2026!"),
    "kitchen": ("kitchen@restaurantos.dz", "Kitchen2026!"),
    "waiter":  ("waiter@restaurantos.dz",  "Waiter2026!"),
}

# A tiny real JPEG (1x1 pixel) — valid image/jpeg bytes.
TINY_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB"
    "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB"
    "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA"
    "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA"
    "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3"
    "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm"
    "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMB"
    "AAIRAxEAPwD+/iiiigD/2Q=="
)


# ------------- fixtures -------------
@pytest.fixture(scope="module")
def tokens():
    """Login each role once; return {role: {'token':..., 'headers':...}}."""
    out = {}
    for role, (email, pw) in USERS.items():
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
        assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
        d = r.json()
        tok = d["token"]
        out[role] = {
            "token": tok,
            "user": d["user"],
            "headers": {"Authorization": f"Bearer {tok}"},
        }
    return out


# ------------- /api/menu/ocr auth/validation -------------
class TestMenuOcrAuth:
    def test_no_auth_returns_401(self):
        img = base64.b64decode(TINY_JPEG_B64)
        files = {"file": ("t.jpg", img, "image/jpeg")}
        r = requests.post(f"{API}/menu/ocr", files=files, timeout=30)
        # HTTPBearer with auto_error -> 403; backend may also return 401.
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text}"

    def test_kitchen_forbidden(self, tokens):
        img = base64.b64decode(TINY_JPEG_B64)
        files = {"file": ("t.jpg", img, "image/jpeg")}
        r = requests.post(
            f"{API}/menu/ocr", files=files, headers=tokens["kitchen"]["headers"], timeout=30
        )
        assert r.status_code == 403, f"kitchen should be 403, got {r.status_code}: {r.text}"

    def test_waiter_forbidden(self, tokens):
        img = base64.b64decode(TINY_JPEG_B64)
        files = {"file": ("t.jpg", img, "image/jpeg")}
        r = requests.post(
            f"{API}/menu/ocr", files=files, headers=tokens["waiter"]["headers"], timeout=30
        )
        assert r.status_code == 403, f"waiter should be 403, got {r.status_code}: {r.text}"

    def test_non_image_returns_400(self, tokens):
        files = {"file": ("t.txt", b"hello world", "text/plain")}
        r = requests.post(
            f"{API}/menu/ocr", files=files, headers=tokens["owner"]["headers"], timeout=30
        )
        assert r.status_code == 400, f"non-image should be 400, got {r.status_code}: {r.text}"
        assert "image" in r.text.lower()


# ------------- /api/menu/ocr real Groq call (owner happy path) -------------
class TestMenuOcrOwnerHappy:
    """Hits Groq Vision with a minimal real image. Accept 200 (schema ok)
    OR 502 (transient Groq / model error) — we just don't want 5xx other than 502."""

    def test_owner_ocr_shape(self, tokens):
        # Prefer a real menu photo if present; else fallback to tiny (may 502 -> skip).
        real = "/tmp/menu.jpg"
        if os.path.exists(real) and os.path.getsize(real) > 1000:
            with open(real, "rb") as f:
                img = f.read()
        else:
            img = base64.b64decode(TINY_JPEG_B64)
        files = {"file": ("menu.jpg", img, "image/jpeg")}
        r = requests.post(
            f"{API}/menu/ocr",
            files=files,
            headers=tokens["owner"]["headers"],
            timeout=120,
        )
        # Treat 502 as acceptable per spec (Groq transient/vision restriction on tiny img).
        if r.status_code == 502:
            pytest.skip(f"Groq transient/unreachable: {r.text[:200]}")
        assert r.status_code == 200, f"owner OCR failed: {r.status_code} {r.text}"
        d = r.json()
        assert "categories" in d and isinstance(d["categories"], list)
        assert "items" in d and isinstance(d["items"], list)
        assert d.get("model") == "meta-llama/llama-4-scout-17b-16e-instruct", \
            f"model mismatch: {d.get('model')}"
        # each item must carry tri-lingual fields + int price
        for it in d["items"]:
            assert "name" in it and set(it["name"].keys()) >= {"fr", "ar", "en"}
            assert "description" in it and set(it["description"].keys()) >= {"fr", "ar", "en"}
            assert "price" in it and isinstance(it["price"], (int, float))
            assert "category_name_fr" in it


# ------------- /api/menu/ocr/apply -------------
class TestMenuOcrApply:
    def test_apply_kitchen_forbidden(self, tokens):
        r = requests.post(
            f"{API}/menu/ocr/apply",
            json={"categories": [], "items": []},
            headers=tokens["kitchen"]["headers"],
            timeout=30,
        )
        assert r.status_code == 403

    def test_apply_waiter_forbidden(self, tokens):
        r = requests.post(
            f"{API}/menu/ocr/apply",
            json={"categories": [], "items": []},
            headers=tokens["waiter"]["headers"],
            timeout=30,
        )
        assert r.status_code == 403

    def test_apply_creates_categories_and_items(self, tokens):
        # Unique suffix to avoid dedupe collision across reruns.
        suffix = f"TEST_{int(time.time())}"
        payload = {
            "categories": [
                {"name": {"fr": f"Entrées {suffix}", "ar": "المقبلات", "en": "Starters"}},
                {"name": {"fr": f"Plats {suffix}",   "ar": "أطباق",    "en": "Mains"}},
            ],
            "items": [
                {
                    "category_name_fr": f"Entrées {suffix}",
                    "name": {"fr": "Chorba", "ar": "شربة", "en": "Soup"},
                    "description": {"fr": "Soupe", "ar": "حساء", "en": "Soup"},
                    "price": 250,
                },
                {
                    "category_name_fr": f"Plats {suffix}",
                    "name": {"fr": "Couscous", "ar": "كسكس", "en": "Couscous"},
                    "description": {"fr": "", "ar": "", "en": ""},
                    "price": 900,
                },
            ],
        }
        r = requests.post(
            f"{API}/menu/ocr/apply",
            json=payload,
            headers=tokens["owner"]["headers"],
            timeout=30,
        )
        assert r.status_code == 200, f"apply failed: {r.status_code} {r.text}"
        d = r.json()
        assert d.get("created_categories", 0) >= 2, f"expected >=2 cats, got {d}"
        assert d.get("created_items", 0) == 2, f"expected 2 items, got {d}"

        # Verify persistence via /api/categories + /api/items
        rc = requests.get(f"{API}/categories", headers=tokens["owner"]["headers"], timeout=30)
        assert rc.status_code == 200, f"/categories failed: {rc.status_code} {rc.text}"
        cats = rc.json()
        cat_names_fr = [c["name"].get("fr", "") for c in cats]
        assert f"Entrées {suffix}" in cat_names_fr
        assert f"Plats {suffix}"   in cat_names_fr

        ri = requests.get(f"{API}/items", headers=tokens["owner"]["headers"], timeout=30)
        assert ri.status_code == 200, f"/items failed: {ri.status_code} {ri.text}"
        items = ri.json()
        item_fr = [i["name"].get("fr", "") for i in items]
        assert "Chorba" in item_fr
        assert "Couscous" in item_fr

    def test_apply_fallback_category_when_unmatched(self, tokens):
        """Item references a category that was NOT provided and doesn't exist — should create fallback."""
        suffix = f"TEST_FB_{int(time.time())}"
        fallback_name = f"Ghost-Cat-{suffix}"
        payload = {
            "categories": [],
            "items": [
                {
                    "category_name_fr": fallback_name,
                    "name": {"fr": "Mystère", "ar": "لغز", "en": "Mystery"},
                    "description": {"fr": "", "ar": "", "en": ""},
                    "price": 100,
                }
            ],
        }
        r = requests.post(
            f"{API}/menu/ocr/apply",
            json=payload,
            headers=tokens["owner"]["headers"],
            timeout=30,
        )
        assert r.status_code == 200, f"fallback apply failed: {r.status_code} {r.text}"
        d = r.json()
        # The server increments created_categories for the fallback as well.
        assert d.get("created_categories", 0) >= 1
        assert d.get("created_items", 0) == 1

        # Check fallback category exists via /api/categories
        rc = requests.get(f"{API}/categories", headers=tokens["owner"]["headers"], timeout=30)
        assert rc.status_code == 200, f"/categories failed: {rc.status_code} {rc.text}"
        cat_names_fr = [c["name"].get("fr", "") for c in rc.json()]
        assert fallback_name in cat_names_fr, f"fallback cat not created: {cat_names_fr[-10:]}"
