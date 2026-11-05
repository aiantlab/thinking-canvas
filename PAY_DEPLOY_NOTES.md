# canno3D 虎皮椒支付 / 额度 — deploy notes

## Product rules (server-enforced)

| Rule | Implementation |
|------|----------------|
| Admin `aiantlab@gmail.com` unlimited | `worker/auth.js` `ADMIN_EMAIL` + `upsertAdminEntitlement` on `/me` / generate gate |
| New free users | `FREE_GENERATION_LIMIT = 30`, `max_resolution = 2K` (1K+2K OK; 4K blocked) |
| Packs | `worker/pay.js` `PACKS`: ¥19.90 限时体验→100×4K; ¥19.90/¥29.90 个人版→100×2K / 200×2K; ¥49.90 企业版→300×unlock 4K |
| Payment | 虎皮椒 / xunhupay create + notify; idempotent via `orders` + `applied_order_ids` |

## Worker secrets Boss must set (do not commit)

```bash
# 虎皮椒商户（二选一命名均可）
npx wrangler secret put HUJIAO_APPID      # or XUNHUPAY_APPID
npx wrangler secret put HUJIAO_APPSECRET  # or XUNHUPAY_APPSECRET — paused until Boss notifies
# optional gateway override (default https://api.xunhupay.com)
# npx wrangler secret put HUJIAO_GATEWAY
```

Keep existing: `AUTH_SESSION_SECRET`, `SUCHUANG_*`, `FAL_KEY`, `HUJIAO_APPID`. Deploy with `keep_bindings: ['secret_text']`.

## Callback URL (configure in 虎皮椒商户后台 as default notify if needed)

`https://canno3d.com/api/pay/notify`

Also accepted: create-order sends `notify_url` / `return_url` per order.

Return page: `https://canno3d.com/?pay=ok`

## API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/pay/packs` | Catalog + `paymentConfigured` |
| POST | `/api/pay/create` | Bearer auth, `{ packId }` → `payUrl` |
| POST | `/api/pay/notify` | 虎皮椒 async; body must verify hash; response plain `success` |
| GET | `/api/pay/status?trade_order_id=` | Bearer; order status |

## Smoke (no real pay)

1. `GET https://canno3d.com/api/pay/packs` → four packs (19.9 限时4K / 19.9+29.9 个人版2K / 49.9 企业版4K); `paymentConfigured: false` until APPSECRET set.
2. Login as admin → entitlement `unlimited: true`, `plan: admin`.
3. Register new user → `generation_limit: 30`, `max_resolution: 2K`.
4. After secrets: create order → open payUrl → pay → notify credits; re-hit status/me.

## UI

TopBar「购买」→ PricingModal → `/api/pay/create` → opens 虎皮椒收银台.
