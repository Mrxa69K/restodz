# RestaurantOS — Deployment & Keys Notes

## ⚠️ API keys to replace before staging / production

### GROQ_API_KEY (OCR Menu Import)
Location: `/app/backend/.env`

```
GROQ_API_KEY="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"
GROQ_MODEL="meta-llama/llama-4-scout-17b-16e-instruct"
```

**Before deploying:**
1. Create a new Groq API key dedicated to staging and another for production at <https://console.groq.com/keys>.
2. Replace the dev key above in each environment's `.env`.
3. Never commit production keys to git — use a secret manager (AWS Secrets Manager, Doppler, 1Password, etc.).
4. Rotate the dev key you've shared with the team periodically.
5. If Groq deprecates `llama-4-scout-17b-16e-instruct`, swap `GROQ_MODEL` to the latest vision-capable Groq model (check `GET /openai/v1/models` on Groq for current list).

**Where it is used:**
- `POST /api/menu/ocr` → sends uploaded menu photo to Groq, returns structured JSON
- `POST /api/menu/ocr/apply` → writes the extracted categories + items into the tenant's menu
- Frontend: button **"Import par photo (IA)"** in `/app/menu` (Menu Maker)

### Admin/owner default credentials
Location: `/app/backend/.env`
```
ADMIN_EMAIL="karim@restaurantos.dz"
ADMIN_PASSWORD="Karim2026!"
```
Also replace in production, or disable the auto-seed (`seed_demo` in `server.py`) entirely.

### JWT secret
```
JWT_SECRET="…"
```
Generate a new 64-char hex secret per environment:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Cookies & HTTPS
In `server.py`, `set_auth_cookie` uses `secure=False` for dev. Flip to `secure=True` behind HTTPS in prod.

## Rate limiting (TODO before prod)
- `POST /api/public/restaurant/{slug}/order`
- `POST /api/public/restaurant/{slug}/feedback`
- `POST /api/menu/ocr` (expensive — protect with per-user quota)

Add a middleware like `slowapi` or a Redis-backed limiter.

## Test accounts (safe to remove in prod)
All four are seeded on backend startup inside `Chez Karim`:

| Role | Email | Password |
|---|---|---|
| Owner | `karim@restaurantos.dz` | `Karim2026!` |
| Manager | `manager@restaurantos.dz` | `Manager2026!` |
| Kitchen | `kitchen@restaurantos.dz` | `Kitchen2026!` |
| Waiter | `waiter@restaurantos.dz` | `Waiter2026!` |

Delete the `seed_demo()` call in `server.py` `startup()` for production, or make it conditional on `ENV=dev`.
