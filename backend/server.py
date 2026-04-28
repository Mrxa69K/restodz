from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import base64
import uuid
import logging
import bcrypt
import jwt
import qrcode
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import csv
import json as jsonlib
from openai import AsyncOpenAI


# ---------- config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "karim@restaurantos.dz")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Karim2026!")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="RestaurantOS API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("restaurantos")


# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "):
            token = ah[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/",
    )


# ---------- models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    restaurant_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class Localized(BaseModel):
    fr: str = ""
    ar: str = ""
    en: str = ""


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    theme_color: Optional[str] = None
    currency: Optional[str] = None


class CategoryIn(BaseModel):
    name: Localized
    order: int = 0


class ItemIn(BaseModel):
    category_id: str
    name: Localized
    description: Localized = Field(default_factory=Localized)
    price: float
    image_url: Optional[str] = ""
    available: bool = True
    order: int = 0


class TableIn(BaseModel):
    label: str
    seats: int = 4


class OrderItemIn(BaseModel):
    item_id: str
    quantity: int = 1
    note: str = ""


class OrderIn(BaseModel):
    table_id: Optional[str] = None
    type: str = "dine_in"  # dine_in | takeaway
    items: List[OrderItemIn]
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    note: str = ""


class OrderStatusIn(BaseModel):
    status: str  # pending | preparing | ready | served | cancelled


class StockIn(BaseModel):
    name: str
    unit: str = "unit"
    quantity: float = 0
    low_threshold: float = 0
    cost: float = 0


class FeedbackIn(BaseModel):
    rating: int
    comment: str = ""
    customer_name: str = ""
    order_id: Optional[str] = None


class StaffIn(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)
    role: str  # manager | kitchen | waiter


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


ROLES = {"owner", "manager", "kitchen", "waiter"}
ROLE_PERMS = {
    "owner": {"all"},
    "manager": {"dashboard", "orders", "kitchen", "menu", "tables", "analytics", "stock", "feedback", "settings", "export"},
    "kitchen": {"kitchen", "orders"},
    "waiter": {"orders", "tables", "kitchen"},
}


def require_role(user: Dict[str, Any], *roles: str):
    if user.get("role") not in roles:
        raise HTTPException(status_code=403, detail="Permission refusée")


# ---------- utilities ----------
def strip_mongo(d: dict) -> dict:
    if not d:
        return d
    d.pop("_id", None)
    return d


def slugify(text: str) -> str:
    import re
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return s or "restaurant"


# ---------- AUTH ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    restaurant_id = str(uuid.uuid4())
    slug_base = slugify(payload.restaurant_name)
    slug = slug_base
    i = 1
    while await db.restaurants.find_one({"slug": slug}):
        i += 1
        slug = f"{slug_base}-{i}"
    user_doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "restaurant_id": restaurant_id,
        "role": "owner",
        "created_at": now_iso(),
    }
    restaurant_doc = {
        "id": restaurant_id,
        "owner_id": user_id,
        "name": payload.restaurant_name,
        "slug": slug,
        "phone": "",
        "address": "",
        "logo_url": "",
        "theme_color": "#F97316",
        "currency": "DZD",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    await db.restaurants.insert_one(restaurant_doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    user_doc.pop("password_hash")
    return {"user": strip_mongo(user_doc), "restaurant": strip_mongo(restaurant_doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    return {"user": strip_mongo(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    restaurant = await db.restaurants.find_one(
        {"id": user["restaurant_id"]}, {"_id": 0}
    )
    return {"user": user, "restaurant": restaurant}


# ---------- RESTAURANT ----------
@api.patch("/restaurant")
async def update_restaurant(payload: RestaurantUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "slug" in updates:
        updates["slug"] = slugify(updates["slug"])
        existing = await db.restaurants.find_one(
            {"slug": updates["slug"], "id": {"$ne": user["restaurant_id"]}}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Slug already taken")
    if updates:
        await db.restaurants.update_one(
            {"id": user["restaurant_id"]}, {"$set": updates}
        )
    r = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    return r


# ---------- CATEGORIES ----------
@api.get("/categories")
async def list_categories(user=Depends(get_current_user)):
    rows = await db.categories.find(
        {"restaurant_id": user["restaurant_id"]}, {"_id": 0}
    ).sort("order", 1).to_list(500)
    return rows


@api.post("/categories")
async def create_category(payload: CategoryIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": user["restaurant_id"],
        "name": payload.name.model_dump(),
        "order": payload.order,
        "created_at": now_iso(),
    }
    await db.categories.insert_one(doc)
    return strip_mongo(doc)


@api.patch("/categories/{cat_id}")
async def update_category(cat_id: str, payload: CategoryIn, user=Depends(get_current_user)):
    res = await db.categories.update_one(
        {"id": cat_id, "restaurant_id": user["restaurant_id"]},
        {"$set": {"name": payload.name.model_dump(), "order": payload.order}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    row = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    return row


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user=Depends(get_current_user)):
    await db.categories.delete_one({"id": cat_id, "restaurant_id": user["restaurant_id"]})
    await db.items.delete_many({"category_id": cat_id, "restaurant_id": user["restaurant_id"]})
    return {"ok": True}


# ---------- ITEMS ----------
@api.get("/items")
async def list_items(user=Depends(get_current_user)):
    rows = await db.items.find(
        {"restaurant_id": user["restaurant_id"]}, {"_id": 0}
    ).sort("order", 1).to_list(2000)
    return rows


@api.post("/items")
async def create_item(payload: ItemIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": user["restaurant_id"],
        "category_id": payload.category_id,
        "name": payload.name.model_dump(),
        "description": payload.description.model_dump(),
        "price": payload.price,
        "image_url": payload.image_url or "",
        "available": payload.available,
        "order": payload.order,
        "created_at": now_iso(),
    }
    await db.items.insert_one(doc)
    return strip_mongo(doc)


@api.patch("/items/{item_id}")
async def update_item(item_id: str, payload: ItemIn, user=Depends(get_current_user)):
    updates = {
        "category_id": payload.category_id,
        "name": payload.name.model_dump(),
        "description": payload.description.model_dump(),
        "price": payload.price,
        "image_url": payload.image_url or "",
        "available": payload.available,
        "order": payload.order,
    }
    res = await db.items.update_one(
        {"id": item_id, "restaurant_id": user["restaurant_id"]}, {"$set": updates}
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    row = await db.items.find_one({"id": item_id}, {"_id": 0})
    return row


@api.delete("/items/{item_id}")
async def delete_item(item_id: str, user=Depends(get_current_user)):
    await db.items.delete_one({"id": item_id, "restaurant_id": user["restaurant_id"]})
    return {"ok": True}


# ---------- TABLES ----------
@api.get("/tables")
async def list_tables(user=Depends(get_current_user)):
    rows = await db.tables.find(
        {"restaurant_id": user["restaurant_id"]}, {"_id": 0}
    ).sort("label", 1).to_list(500)
    return rows


@api.post("/tables")
async def create_table(payload: TableIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": user["restaurant_id"],
        "label": payload.label,
        "seats": payload.seats,
        "created_at": now_iso(),
    }
    await db.tables.insert_one(doc)
    return strip_mongo(doc)


@api.delete("/tables/{table_id}")
async def delete_table(table_id: str, user=Depends(get_current_user)):
    await db.tables.delete_one({"id": table_id, "restaurant_id": user["restaurant_id"]})
    return {"ok": True}


@api.get("/tables/{table_id}/qr")
async def table_qr(table_id: str, user=Depends(get_current_user)):
    table = await db.tables.find_one(
        {"id": table_id, "restaurant_id": user["restaurant_id"]}, {"_id": 0}
    )
    if not table:
        raise HTTPException(status_code=404, detail="Not found")
    r = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    # client URL — frontend will be served at same origin
    url = f"/m/{r['slug']}?table={table_id}"
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"table": table, "url": url, "qr_png_base64": b64}


# ---------- ORDERS ----------
async def enrich_order(order: dict) -> dict:
    items_ids = [i["item_id"] for i in order.get("items", [])]
    items_map = {}
    if items_ids:
        docs = await db.items.find(
            {"id": {"$in": items_ids}}, {"_id": 0}
        ).to_list(2000)
        items_map = {d["id"]: d for d in docs}
    enriched_items = []
    for it in order.get("items", []):
        d = items_map.get(it["item_id"], {})
        enriched_items.append({
            **it,
            "name": d.get("name", {"fr": "?"}),
            "price": d.get("price", it.get("price", 0)),
        })
    order["items_detail"] = enriched_items
    if order.get("table_id"):
        t = await db.tables.find_one({"id": order["table_id"]}, {"_id": 0})
        order["table_label"] = t["label"] if t else None
    return order


@api.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    limit: int = 200,
    user=Depends(get_current_user),
):
    q = {"restaurant_id": user["restaurant_id"]}
    if status:
        q["status"] = status
    rows = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [await enrich_order(r) for r in rows]


@api.post("/orders")
async def create_order(payload: OrderIn, user=Depends(get_current_user)):
    return await _create_order(user["restaurant_id"], payload)


async def _create_order(restaurant_id: str, payload: OrderIn) -> dict:
    item_ids = [i.item_id for i in payload.items]
    items = await db.items.find(
        {"id": {"$in": item_ids}, "restaurant_id": restaurant_id}, {"_id": 0}
    ).to_list(500)
    price_map = {i["id"]: i["price"] for i in items}
    total = 0
    lines = []
    for it in payload.items:
        price = price_map.get(it.item_id, 0)
        lines.append({
            "item_id": it.item_id,
            "quantity": it.quantity,
            "note": it.note,
            "price": price,
        })
        total += price * it.quantity
    count_today = await db.orders.count_documents({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
    })
    doc = {
        "id": str(uuid.uuid4()),
        "number": f"#{(count_today + 1):04d}",
        "restaurant_id": restaurant_id,
        "table_id": payload.table_id,
        "type": payload.type,
        "items": lines,
        "total": total,
        "status": "pending",
        "customer_name": payload.customer_name or "",
        "customer_phone": payload.customer_phone or "",
        "note": payload.note,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.insert_one(doc)
    return await enrich_order(strip_mongo(doc))


@api.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str, payload: OrderStatusIn, user=Depends(get_current_user)
):
    valid = {"pending", "preparing", "ready", "served", "cancelled"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.orders.update_one(
        {"id": order_id, "restaurant_id": user["restaurant_id"]},
        {"$set": {"status": payload.status, "updated_at": now_iso()}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return await enrich_order(order)


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    order = await db.orders.find_one(
        {"id": order_id, "restaurant_id": user["restaurant_id"]}, {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    return await enrich_order(order)


# ---------- STOCK ----------
@api.get("/stock")
async def list_stock(user=Depends(get_current_user)):
    rows = await db.stock.find(
        {"restaurant_id": user["restaurant_id"]}, {"_id": 0}
    ).sort("name", 1).to_list(500)
    return rows


@api.post("/stock")
async def create_stock(payload: StockIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": user["restaurant_id"],
        **payload.model_dump(),
        "created_at": now_iso(),
    }
    await db.stock.insert_one(doc)
    return strip_mongo(doc)


@api.patch("/stock/{stock_id}")
async def update_stock(stock_id: str, payload: StockIn, user=Depends(get_current_user)):
    res = await db.stock.update_one(
        {"id": stock_id, "restaurant_id": user["restaurant_id"]},
        {"$set": payload.model_dump()},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    row = await db.stock.find_one({"id": stock_id}, {"_id": 0})
    return row


@api.delete("/stock/{stock_id}")
async def delete_stock(stock_id: str, user=Depends(get_current_user)):
    await db.stock.delete_one({"id": stock_id, "restaurant_id": user["restaurant_id"]})
    return {"ok": True}


# ---------- FEEDBACK ----------
@api.get("/feedback")
async def list_feedback(user=Depends(get_current_user)):
    rows = await db.feedback.find(
        {"restaurant_id": user["restaurant_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return rows


# ---------- STAFF (owner + manager) ----------
@api.get("/staff")
async def list_staff(user=Depends(get_current_user)):
    require_role(user, "owner", "manager")
    rows = await db.users.find(
        {"restaurant_id": user["restaurant_id"]},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(200)
    return rows


@api.post("/staff")
async def create_staff(payload: StaffIn, user=Depends(get_current_user)):
    require_role(user, "owner", "manager")
    if payload.role not in {"manager", "kitchen", "waiter"}:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    # only owner can create managers
    if payload.role == "manager" and user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut créer un manager")
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "restaurant_id": user["restaurant_id"],
        "role": payload.role,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    return strip_mongo(doc)


@api.patch("/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffUpdate, user=Depends(get_current_user)):
    require_role(user, "owner", "manager")
    target = await db.users.find_one(
        {"id": staff_id, "restaurant_id": user["restaurant_id"]}
    )
    if not target:
        raise HTTPException(status_code=404, detail="Introuvable")
    if target["role"] == "owner":
        raise HTTPException(status_code=403, detail="Impossible de modifier le propriétaire")
    updates: Dict[str, Any] = {}
    if payload.name:
        updates["name"] = payload.name
    if payload.role:
        if payload.role not in {"manager", "kitchen", "waiter"}:
            raise HTTPException(status_code=400, detail="Rôle invalide")
        if payload.role == "manager" and user["role"] != "owner":
            raise HTTPException(status_code=403, detail="Seul le propriétaire peut créer un manager")
        updates["role"] = payload.role
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
    if updates:
        await db.users.update_one({"id": staff_id}, {"$set": updates})
    row = await db.users.find_one(
        {"id": staff_id}, {"_id": 0, "password_hash": 0}
    )
    return row


@api.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user=Depends(get_current_user)):
    require_role(user, "owner", "manager")
    target = await db.users.find_one(
        {"id": staff_id, "restaurant_id": user["restaurant_id"]}
    )
    if not target:
        raise HTTPException(status_code=404, detail="Introuvable")
    if target["role"] == "owner":
        raise HTTPException(status_code=403, detail="Impossible de supprimer le propriétaire")
    if target["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer")
    await db.users.delete_one({"id": staff_id})
    return {"ok": True}


# ---------- EXPORT CSV ----------
def _csv_response(rows: List[List[Any]], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.get("/export/orders.csv")
async def export_orders(user=Depends(get_current_user)):
    rid = user["restaurant_id"]
    orders = await db.orders.find({"restaurant_id": rid}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    items = await db.items.find({"restaurant_id": rid}, {"_id": 0}).to_list(5000)
    items_map = {i["id"]: i for i in items}
    tables = await db.tables.find({"restaurant_id": rid}, {"_id": 0}).to_list(500)
    tmap = {t["id"]: t["label"] for t in tables}
    rows = [["numero", "date", "heure", "type", "table", "articles", "total_DZD", "statut"]]
    for o in orders:
        dt = o.get("created_at", "")
        date, _, time = dt.partition("T")
        arts = ", ".join(
            f"{li['quantity']}x {items_map.get(li['item_id'], {}).get('name', {}).get('fr', '?')}"
            for li in o.get("items", [])
        )
        rows.append([
            o.get("number", ""), date, time[:5],
            o.get("type", ""), tmap.get(o.get("table_id"), ""),
            arts, int(o.get("total", 0)), o.get("status", ""),
        ])
    return _csv_response(rows, "commandes.csv")


@api.get("/export/stock.csv")
async def export_stock(user=Depends(get_current_user)):
    rows = [["ingredient", "unite", "quantite", "seuil_bas", "cout_unitaire_DZD", "valeur_DZD"]]
    stock = await db.stock.find({"restaurant_id": user["restaurant_id"]}, {"_id": 0}).to_list(1000)
    for s in stock:
        rows.append([s["name"], s["unit"], s["quantity"], s["low_threshold"], s["cost"], s["cost"] * s["quantity"]])
    return _csv_response(rows, "stock.csv")


@api.get("/export/items.csv")
async def export_items(user=Depends(get_current_user)):
    rid = user["restaurant_id"]
    cats = await db.categories.find({"restaurant_id": rid}, {"_id": 0}).to_list(500)
    cmap = {c["id"]: c["name"].get("fr", "") for c in cats}
    rows = [["categorie", "nom_fr", "nom_ar", "nom_en", "prix_DZD", "disponible"]]
    items = await db.items.find({"restaurant_id": rid}, {"_id": 0}).to_list(5000)
    for i in items:
        rows.append([
            cmap.get(i.get("category_id"), ""),
            i["name"].get("fr", ""), i["name"].get("ar", ""), i["name"].get("en", ""),
            int(i.get("price", 0)), "oui" if i.get("available") else "non",
        ])
    return _csv_response(rows, "menu.csv")


# ---------- OCR Menu Import (Groq Vision) ----------
OCR_SYSTEM_PROMPT = """You are an expert menu extraction system for Algerian restaurants.

Given a photograph of a restaurant menu (printed, handwritten, or chalkboard), extract a structured JSON describing the menu.

Rules:
1. Detect the language of each item (French, Arabic, English, or mixed) and produce localized versions in ALL THREE languages.
2. For French and English names: use natural, concise, menu-appropriate wording.
3. For Arabic names: use proper Arabic script (not transliteration). If a dish is specifically Algerian/Maghrebi, use the authentic Arabic name (e.g., كسكس, طاجين, شربة فريك, بوراك, محاجب, مقرود, بقلاوة).
4. Prices: extract as plain integers in DZD (Algerian Dinar). Strip currency symbols, "DA", "DZD", commas, spaces. If a range is given, take the median. If unreadable, use 0.
5. Categories: infer reasonable categories from the menu layout ("Entrées", "Plats", "Boissons", "Desserts", "Sandwiches", "Pizzas", etc.). Each category also gets localized names in FR/AR/EN.
6. If a short description is visible, include it, also translated to FR/AR/EN. If no description, leave empty strings.

Return STRICT JSON ONLY, no prose, no code fences. Schema:
{
  "categories": [
    { "name": {"fr": "Entrées", "ar": "المقبلات", "en": "Starters"} }
  ],
  "items": [
    {
      "category_name_fr": "Entrées",
      "name": {"fr": "...", "ar": "...", "en": "..."},
      "description": {"fr": "...", "ar": "...", "en": "..."},
      "price": 250
    }
  ]
}"""


@api.post("/menu/ocr")
async def menu_ocr(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="OCR non configuré (GROQ_API_KEY manquante)")
    if user["role"] not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Permission refusée")
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 8 Mo)")
    mime = file.content_type or "image/jpeg"
    if not mime.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fichier image requis")
    b64 = base64.b64encode(content).decode()
    data_url = f"data:{mime};base64,{b64}"

    client_groq = AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    try:
        completion = await client_groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": OCR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extrais le menu complet en JSON strict."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        log.exception("Groq OCR error: %s", e)
        raise HTTPException(status_code=502, detail=f"Échec OCR: {str(e)[:200]}")

    raw = completion.choices[0].message.content or "{}"
    try:
        parsed = jsonlib.loads(raw)
    except Exception:
        # try to strip code fences
        cleaned = raw.strip().strip("`").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        try:
            parsed = jsonlib.loads(cleaned)
        except Exception:
            raise HTTPException(status_code=502, detail="OCR: JSON invalide renvoyé par le modèle")

    categories = parsed.get("categories") or []
    items = parsed.get("items") or []
    # normalize
    norm_cats = []
    for c in categories[:30]:
        n = c.get("name") or {}
        norm_cats.append({"name": {
            "fr": n.get("fr", "") or "",
            "ar": n.get("ar", "") or "",
            "en": n.get("en", "") or "",
        }})
    norm_items = []
    for it in items[:200]:
        n = it.get("name") or {}
        d = it.get("description") or {}
        try:
            price = int(round(float(it.get("price", 0))))
        except Exception:
            price = 0
        norm_items.append({
            "category_name_fr": (it.get("category_name_fr") or "").strip(),
            "name": {"fr": n.get("fr", "") or "", "ar": n.get("ar", "") or "", "en": n.get("en", "") or ""},
            "description": {"fr": d.get("fr", "") or "", "ar": d.get("ar", "") or "", "en": d.get("en", "") or ""},
            "price": price,
        })

    return {
        "categories": norm_cats,
        "items": norm_items,
        "model": GROQ_MODEL,
    }


class OcrApplyIn(BaseModel):
    categories: List[Dict[str, Any]]
    items: List[Dict[str, Any]]


@api.post("/menu/ocr/apply")
async def menu_ocr_apply(payload: OcrApplyIn, user=Depends(get_current_user)):
    if user["role"] not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Permission refusée")
    rid = user["restaurant_id"]

    # load existing categories by fr-name to dedupe
    existing = await db.categories.find({"restaurant_id": rid}, {"_id": 0}).to_list(500)
    fr_to_id = {c["name"].get("fr", "").strip().lower(): c["id"] for c in existing}
    created_cats = 0
    next_order = max([c.get("order", 0) for c in existing], default=-1) + 1

    for c in payload.categories:
        name = c.get("name", {})
        key = (name.get("fr", "") or "").strip().lower()
        if not key or key in fr_to_id:
            continue
        cid = str(uuid.uuid4())
        await db.categories.insert_one({
            "id": cid,
            "restaurant_id": rid,
            "name": {"fr": name.get("fr", ""), "ar": name.get("ar", ""), "en": name.get("en", "")},
            "order": next_order,
            "created_at": now_iso(),
        })
        fr_to_id[key] = cid
        created_cats += 1
        next_order += 1

    # items
    existing_items = await db.items.find({"restaurant_id": rid}, {"_id": 0}).to_list(5000)
    next_item_order = max([i.get("order", 0) for i in existing_items], default=-1) + 1
    created_items = 0
    for it in payload.items:
        cat_key = (it.get("category_name_fr") or "").strip().lower()
        category_id = fr_to_id.get(cat_key)
        if not category_id:
            # create a fallback category
            cid = str(uuid.uuid4())
            fallback_fr = it.get("category_name_fr") or "Divers"
            await db.categories.insert_one({
                "id": cid, "restaurant_id": rid,
                "name": {"fr": fallback_fr, "ar": "", "en": fallback_fr},
                "order": next_order, "created_at": now_iso(),
            })
            fr_to_id[cat_key or fallback_fr.lower()] = cid
            next_order += 1
            category_id = cid
            created_cats += 1
        name = it.get("name", {})
        desc = it.get("description", {})
        await db.items.insert_one({
            "id": str(uuid.uuid4()),
            "restaurant_id": rid,
            "category_id": category_id,
            "name": {"fr": name.get("fr", ""), "ar": name.get("ar", ""), "en": name.get("en", "")},
            "description": {"fr": desc.get("fr", ""), "ar": desc.get("ar", ""), "en": desc.get("en", "")},
            "price": float(it.get("price", 0) or 0),
            "image_url": "",
            "available": True,
            "order": next_item_order,
            "created_at": now_iso(),
        })
        next_item_order += 1
        created_items += 1

    return {"created_categories": created_cats, "created_items": created_items}


# ---------- ANALYTICS ----------
@api.get("/analytics/dashboard")
async def analytics_dashboard(user=Depends(get_current_user)):
    rid = user["restaurant_id"]
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    today_orders = await db.orders.find(
        {"restaurant_id": rid, "created_at": {"$gte": today_str}, "status": {"$ne": "cancelled"}},
        {"_id": 0},
    ).to_list(2000)
    yesterday_orders = await db.orders.find(
        {
            "restaurant_id": rid,
            "created_at": {"$gte": yesterday_str, "$lt": today_str},
            "status": {"$ne": "cancelled"},
        },
        {"_id": 0},
    ).to_list(2000)

    def _summary(orders):
        revenue = sum(o.get("total", 0) for o in orders)
        count = len(orders)
        avg = revenue / count if count else 0
        return revenue, count, avg

    rev_t, cnt_t, avg_t = _summary(today_orders)
    rev_y, cnt_y, avg_y = _summary(yesterday_orders)

    # hourly revenue (today)
    hourly = {h: 0 for h in range(8, 24)}
    for o in today_orders:
        try:
            h = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00")).hour
            if h in hourly:
                hourly[h] += o.get("total", 0)
        except Exception:
            pass
    hourly_list = [{"hour": f"{h:02d}h", "revenue": v} for h, v in sorted(hourly.items())]

    # best sellers
    sold: Dict[str, int] = {}
    for o in today_orders:
        for li in o.get("items", []):
            sold[li["item_id"]] = sold.get(li["item_id"], 0) + li["quantity"]
    top_ids = sorted(sold.items(), key=lambda x: -x[1])[:5]
    items_map = {}
    if top_ids:
        docs = await db.items.find(
            {"id": {"$in": [x[0] for x in top_ids]}}, {"_id": 0}
        ).to_list(100)
        items_map = {d["id"]: d for d in docs}
    best_sellers = [
        {
            "item_id": iid,
            "quantity": qty,
            "name": items_map.get(iid, {}).get("name", {"fr": "?"}),
            "price": items_map.get(iid, {}).get("price", 0),
        }
        for iid, qty in top_ids
    ]

    # active tables
    tables = await db.tables.count_documents({"restaurant_id": rid})
    active_orders = await db.orders.find(
        {"restaurant_id": rid, "status": {"$in": ["pending", "preparing", "ready"]}},
        {"_id": 0},
    ).to_list(200)
    active_tables = len({o["table_id"] for o in active_orders if o.get("table_id")})

    return {
        "revenue_today": rev_t,
        "revenue_yesterday": rev_y,
        "orders_today": cnt_t,
        "orders_yesterday": cnt_y,
        "avg_ticket_today": avg_t,
        "avg_ticket_yesterday": avg_y,
        "active_tables": active_tables,
        "total_tables": tables,
        "hourly_revenue": hourly_list,
        "best_sellers": best_sellers,
        "active_orders": [await enrich_order(o) for o in active_orders[:10]],
    }


@api.get("/analytics/trends")
async def analytics_trends(days: int = 7, user=Depends(get_current_user)):
    rid = user["restaurant_id"]
    start = datetime.now(timezone.utc) - timedelta(days=days)
    orders = await db.orders.find(
        {
            "restaurant_id": rid,
            "created_at": {"$gte": start.strftime("%Y-%m-%d")},
            "status": {"$ne": "cancelled"},
        },
        {"_id": 0},
    ).to_list(5000)

    daily: Dict[str, Dict[str, float]] = {}
    peak_hours: Dict[int, float] = {h: 0 for h in range(24)}
    for o in orders:
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            dkey = dt.strftime("%Y-%m-%d")
            daily.setdefault(dkey, {"revenue": 0, "orders": 0})
            daily[dkey]["revenue"] += o.get("total", 0)
            daily[dkey]["orders"] += 1
            peak_hours[dt.hour] += o.get("total", 0)
        except Exception:
            pass

    daily_list = [
        {"date": d, "revenue": v["revenue"], "orders": v["orders"]}
        for d, v in sorted(daily.items())
    ]
    peak_list = [
        {"hour": f"{h:02d}h", "revenue": v} for h, v in sorted(peak_hours.items())
    ]
    return {"daily": daily_list, "peak_hours": peak_list}


# ---------- PUBLIC (customer menu) ----------
@api.get("/public/restaurant/{slug}")
async def public_restaurant(slug: str):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    cats = await db.categories.find(
        {"restaurant_id": r["id"]}, {"_id": 0}
    ).sort("order", 1).to_list(500)
    items = await db.items.find(
        {"restaurant_id": r["id"], "available": True}, {"_id": 0}
    ).sort("order", 1).to_list(2000)
    tables = await db.tables.find(
        {"restaurant_id": r["id"]}, {"_id": 0, "seats": 0}
    ).to_list(500)
    return {
        "restaurant": {
            "id": r["id"],
            "name": r["name"],
            "slug": r["slug"],
            "logo_url": r.get("logo_url", ""),
            "theme_color": r.get("theme_color", "#F97316"),
            "currency": r.get("currency", "DZD"),
        },
        "categories": cats,
        "items": items,
        "tables": tables,
    }


@api.post("/public/restaurant/{slug}/order")
async def public_place_order(slug: str, payload: OrderIn):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return await _create_order(r["id"], payload)


@api.post("/public/restaurant/{slug}/feedback")
async def public_feedback(slug: str, payload: FeedbackIn):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": r["id"],
        "rating": max(1, min(5, payload.rating)),
        "comment": payload.comment,
        "customer_name": payload.customer_name,
        "order_id": payload.order_id,
        "created_at": now_iso(),
    }
    await db.feedback.insert_one(doc)
    return strip_mongo(doc)


@api.get("/")
async def root():
    return {"service": "RestaurantOS API", "status": "ok"}


# ---------- seeding ----------
async def seed_demo():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.restaurants.create_index("slug", unique=True)
    await db.orders.create_index("restaurant_id")
    await db.orders.create_index("created_at")

    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        user_id = str(uuid.uuid4())
        restaurant_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "email": ADMIN_EMAIL,
            "name": "Karim Benali",
            "password_hash": hash_password(ADMIN_PASSWORD),
            "restaurant_id": restaurant_id,
            "role": "owner",
            "created_at": now_iso(),
        })
        await db.restaurants.insert_one({
            "id": restaurant_id,
            "owner_id": user_id,
            "name": "Chez Karim",
            "slug": "chez-karim",
            "phone": "+213 555 12 34 56",
            "address": "Rue Didouche Mourad, Alger",
            "logo_url": "",
            "theme_color": "#F97316",
            "currency": "DZD",
            "created_at": now_iso(),
        })
        # categories
        cats = [
            {"fr": "Entrées", "ar": "المقبلات", "en": "Starters"},
            {"fr": "Plats", "ar": "الأطباق الرئيسية", "en": "Main"},
            {"fr": "Boissons", "ar": "المشروبات", "en": "Drinks"},
            {"fr": "Desserts", "ar": "الحلويات", "en": "Desserts"},
        ]
        cat_ids = []
        for i, c in enumerate(cats):
            cid = str(uuid.uuid4())
            await db.categories.insert_one({
                "id": cid,
                "restaurant_id": restaurant_id,
                "name": c,
                "order": i,
                "created_at": now_iso(),
            })
            cat_ids.append(cid)
        # items
        sample_items = [
            (0, {"fr": "Chorba Frik", "ar": "شربة فريك", "en": "Freekeh Soup"}, {"fr": "Soupe traditionnelle au blé vert", "ar": "حساء تقليدي", "en": "Traditional green wheat soup"}, 300, "https://images.unsplash.com/photo-1547592180-85f173990554?w=400"),
            (0, {"fr": "Bourek", "ar": "بوراك", "en": "Bourek"}, {"fr": "Feuilles de brick garnies", "ar": "", "en": ""}, 250, ""),
            (1, {"fr": "Couscous Royal", "ar": "كسكس ملكي", "en": "Royal Couscous"}, {"fr": "Semoule, légumes, viande, merguez", "ar": "", "en": "Semolina, veggies, meat, merguez"}, 1800, "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400"),
            (1, {"fr": "Tajine de Poulet", "ar": "طاجين الدجاج", "en": "Chicken Tajine"}, {"fr": "Poulet mijoté aux olives", "ar": "", "en": ""}, 1500, ""),
            (1, {"fr": "Mhadjeb", "ar": "محاجب", "en": "Mhadjeb"}, {"fr": "Crêpe farcie aux oignons et tomates", "ar": "", "en": ""}, 400, ""),
            (1, {"fr": "Hamburger Maison", "ar": "همبرغر", "en": "House Burger"}, {"fr": "Steak 200g, fromage, frites", "ar": "", "en": ""}, 1200, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"),
            (2, {"fr": "Thé à la menthe", "ar": "شاي بالنعناع", "en": "Mint Tea"}, {"fr": "", "ar": "", "en": ""}, 150, ""),
            (2, {"fr": "Café", "ar": "قهوة", "en": "Coffee"}, {"fr": "", "ar": "", "en": ""}, 100, ""),
            (2, {"fr": "Hamoud Boualem", "ar": "حمود بوعلام", "en": "Hamoud Soda"}, {"fr": "Limonade algérienne", "ar": "", "en": ""}, 120, ""),
            (3, {"fr": "Makroud", "ar": "مقرود", "en": "Makroud"}, {"fr": "Pâtisserie aux dattes", "ar": "", "en": ""}, 200, ""),
            (3, {"fr": "Baklawa", "ar": "بقلاوة", "en": "Baklava"}, {"fr": "", "ar": "", "en": ""}, 250, ""),
        ]
        item_ids = []
        for i, (cat_idx, n, d, p, img) in enumerate(sample_items):
            iid = str(uuid.uuid4())
            await db.items.insert_one({
                "id": iid,
                "restaurant_id": restaurant_id,
                "category_id": cat_ids[cat_idx],
                "name": n,
                "description": d,
                "price": p,
                "image_url": img,
                "available": True,
                "order": i,
                "created_at": now_iso(),
            })
            item_ids.append(iid)
        # tables
        table_ids = []
        for n in range(1, 9):
            tid = str(uuid.uuid4())
            await db.tables.insert_one({
                "id": tid,
                "restaurant_id": restaurant_id,
                "label": f"Table {n:02d}",
                "seats": 4,
                "created_at": now_iso(),
            })
            table_ids.append(tid)
        # stock
        stock = [
            ("Farine", "kg", 50, 10, 120),
            ("Semoule", "kg", 40, 10, 140),
            ("Huile d'olive", "L", 20, 5, 900),
            ("Poulet", "kg", 15, 5, 750),
            ("Viande hachée", "kg", 10, 3, 1700),
        ]
        for n, u, q, t, c in stock:
            await db.stock.insert_one({
                "id": str(uuid.uuid4()),
                "restaurant_id": restaurant_id,
                "name": n, "unit": u, "quantity": q, "low_threshold": t, "cost": c,
                "created_at": now_iso(),
            })
        # sample orders (today + past 6 days)
        import random
        random.seed(7)
        for day_offset in range(7):
            day = datetime.now(timezone.utc) - timedelta(days=day_offset)
            n_orders = random.randint(20, 45) if day_offset == 0 else random.randint(15, 40)
            for _ in range(n_orders):
                hour = random.choice([11, 12, 13, 14, 18, 19, 20, 21])
                dt = day.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)
                chosen = random.sample(item_ids, k=random.randint(1, 4))
                lines = []
                total = 0
                items_docs = await db.items.find({"id": {"$in": chosen}}, {"_id": 0}).to_list(10)
                price_map = {d["id"]: d["price"] for d in items_docs}
                for iid in chosen:
                    qty = random.randint(1, 3)
                    lines.append({"item_id": iid, "quantity": qty, "note": "", "price": price_map[iid]})
                    total += price_map[iid] * qty
                status = random.choices(
                    ["served", "served", "served", "ready", "preparing", "pending"],
                    weights=[5, 5, 5, 1, 1, 1],
                )[0] if day_offset > 0 else random.choice(["pending", "preparing", "ready", "served", "served"])
                await db.orders.insert_one({
                    "id": str(uuid.uuid4()),
                    "number": f"#{random.randint(1, 9999):04d}",
                    "restaurant_id": restaurant_id,
                    "table_id": random.choice(table_ids) if random.random() > 0.3 else None,
                    "type": random.choice(["dine_in", "dine_in", "takeaway"]),
                    "items": lines,
                    "total": total,
                    "status": status,
                    "customer_name": "",
                    "customer_phone": "",
                    "note": "",
                    "created_at": dt.isoformat(),
                    "updated_at": dt.isoformat(),
                })
        log.info("Seed complete")

    # Always ensure staff test accounts exist (idempotent)
    restaurant_doc = await db.restaurants.find_one({"slug": "chez-karim"}, {"_id": 0})
    if restaurant_doc:
        staff_seeds = [
            ("manager@restaurantos.dz", "Manager2026!", "Amina Hadj", "manager"),
            ("kitchen@restaurantos.dz", "Kitchen2026!", "Yacine Chef", "kitchen"),
            ("waiter@restaurantos.dz", "Waiter2026!", "Samir Serveur", "waiter"),
        ]
        for email, pw, name, role in staff_seeds:
            existing = await db.users.find_one({"email": email})
            if not existing:
                await db.users.insert_one({
                    "id": str(uuid.uuid4()),
                    "email": email,
                    "name": name,
                    "password_hash": hash_password(pw),
                    "restaurant_id": restaurant_doc["id"],
                    "role": role,
                    "created_at": now_iso(),
                })

        # sample feedback if none
        if await db.feedback.count_documents({"restaurant_id": restaurant_doc["id"]}) == 0:
            import random as _rd
            _rd.seed(9)
            sample_fb = [
                (5, "Couscous excellent comme chez ma grand-mère. Je reviendrai !", "Leila"),
                (4, "Service rapide, bonne ambiance. Le thé à la menthe est parfait.", "Mehdi"),
                (5, "Meilleur Mhadjeb d'Alger. Bravo à l'équipe.", "Nadir"),
                (3, "Plat bon mais un peu long à arriver.", "Sarah"),
                (5, "شربة فريك لذيذة جداً", "Fatima"),
                (4, "Baklawa maison excellente. Un peu bruyant le vendredi soir.", "Karim M."),
            ]
            for r, c, n in sample_fb:
                days_ago = _rd.randint(0, 6)
                dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=_rd.randint(0, 23))
                await db.feedback.insert_one({
                    "id": str(uuid.uuid4()),
                    "restaurant_id": restaurant_doc["id"],
                    "rating": r,
                    "comment": c,
                    "customer_name": n,
                    "order_id": None,
                    "created_at": dt.isoformat(),
                })


@app.on_event("startup")
async def startup():
    try:
        await seed_demo()
    except Exception as e:
        log.exception("seed error: %s", e)


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # cookies work cross-origin only with specific origin
    allow_methods=["*"],
    allow_headers=["*"],
)
