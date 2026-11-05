# canno3D auth — deploy notes

Parent deploys; this file documents what the Worker needs.

## Binding already in `wrangler.toml`

- D1: `DB` → database `canno` (`8075aa29-04d3-4c79-bc44-e6880e8f3813`)
- Assets: `ASSETS` → `./dist` (SPA)
- `run_worker_first = ["/api/*"]`

## Secret (required for sessions)

```bash
npx wrangler secret put AUTH_SESSION_SECRET
```

Use a long random string (≥32 chars). HMAC signs session tokens. Without it, login/register return 503.

## Schema (already on D1 `canno`)

Tables expected: `users`, `entitlements`, `auth_tokens`, `app_state`.

Free plan: `generation_limit = 30`, `max_resolution = 2K` on register (`FREE_GENERATION_LIMIT=30`; 4K blocked until paid).

## Auth API surface (captcha removed 2026-11-04)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | `{ email, password }` — free plan; **no** captcha; auto-login after register (client) |
| POST | `/api/auth/login` | `{ email, password }` → session token + entitlement |
| GET | `/api/auth/me` | Bearer session |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/consume` | `{ amount }` after successful generate |
| GET/POST | `/api/captcha/*` | **410 CAPTCHA_DISABLED** (kept for old clients) |

Brand in UI: **canno3D** / **CANNO ACCOUNT** only (never OutFitrev).

## Frontend behavior

- Modal: tabs 登录|注册, strength meter; **no** puzzle/slider captcha.
- Register success → client auto-login; session token payload is JSON (email dots safe).
- Login success → enter app with session; quota pill only when logged in.
- Generate requires login; quota consume hits `/api/auth/consume`.

## Build / deploy order

```bash
cd thinking-canvas
npm run build
# bundle worker for MCP put (single module):
npx esbuild worker/index.js --bundle --format=esm --outfile=../thinking-canvas-deploy/worker-bundle.js
npx wrangler deploy   # or parent MCP PUT
```

Ensure `AUTH_SESSION_SECRET` is set in the Worker env before testing login.
