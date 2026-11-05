/**
 * canno3D email/password auth + entitlements (D1). Captcha disabled.
 * Binding: env.DB (D1 canno). Secret: env.AUTH_SESSION_SECRET
 */

const FREE_GENERATION_LIMIT = 30
const ADMIN_EMAIL = 'aiantlab@gmail.com'
const ADMIN_GENERATION_LIMIT = 999999999
const RES_RANK = { '1K': 1, '2K': 2, '4K': 4 }

const PBKDF2_ITERATIONS = 100000
const CAPTCHA_TTL_MS = 5 * 60 * 1000
const CAPTCHA_TOKEN_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const CAPTCHA_TOLERANCE = 28
const TEXT_WORDS = ['CANNO', 'CANVAS', 'SKETCH', 'RENDER', 'DESIGN', 'STUDIO', 'PIXEL', 'FRAME']

function enc() {
  return new TextEncoder()
}

function b64url(bytes) {
  let s = ''
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text) {
  const dig = await crypto.subtle.digest('SHA-256', enc().encode(text))
  return hex(dig)
}

function randomId() {
  return crypto.randomUUID()
}

function nowMs() {
  return Date.now()
}

function monthPeriod(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1))
  const end = new Date(Date.UTC(y, m + 1, 1))
  return {
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  }
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function derivePasswordHash(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256,
  )
  return hex(bits)
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc().encode(message))
  return hex(sig)
}

async function makeSessionToken(secret, email) {
  const sid = randomId()
  const exp = nowMs() + SESSION_TTL_MS
  // JSON payload avoids email dots breaking sid.email.exp splits (e.g. user@gmail.com).
  const payload = JSON.stringify({ sid, email, exp })
  const sig = await hmacSign(secret || 'canno-dev-insecure', payload)
  return { token: `${b64url(enc().encode(payload))}.${sig}`, sid, exp, email }
}

function parseSessionPayload(payload) {
  if (!payload) return null
  // Preferred: JSON { sid, email, exp }
  if (payload.startsWith('{')) {
    try {
      const obj = JSON.parse(payload)
      const sid = String(obj.sid || '')
      const email = normalizeEmail(obj.email)
      const exp = Number(obj.exp)
      if (!sid || !email || !Number.isFinite(exp)) return null
      return { sid, email, exp }
    } catch {
      return null
    }
  }
  // Legacy sid.email.exp — email may contain dots; take first + last segments.
  const firstDot = payload.indexOf('.')
  const lastDot = payload.lastIndexOf('.')
  if (firstDot <= 0 || lastDot <= firstDot) return null
  const sid = payload.slice(0, firstDot)
  const email = normalizeEmail(payload.slice(firstDot + 1, lastDot))
  const exp = Number(payload.slice(lastDot + 1))
  if (!sid || !email || !Number.isFinite(exp)) return null
  return { sid, email, exp }
}

async function verifySessionToken(secret, token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  let payload
  try {
    payload = new TextDecoder().decode(fromB64url(payloadB64))
  } catch {
    return null
  }
  const expect = await hmacSign(secret || 'canno-dev-insecure', payload)
  if (expect !== sig) return null
  const parsed = parseSessionPayload(payload)
  if (!parsed || parsed.exp < nowMs()) return null
  return parsed
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

function getBearer(request) {
  const h = request.headers.get('Authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  if (m) return m[1].trim()
  const cookie = request.headers.get('Cookie') || ''
  const cm = /(?:^|;\s*)canno_session=([^;]+)/.exec(cookie)
  return cm ? decodeURIComponent(cm[1]) : ''
}

async function dbAll(env, sql, ...binds) {
  if (!env.DB) throw new Error('DB binding missing')
  return env.DB.prepare(sql).bind(...binds).all()
}

async function dbFirst(env, sql, ...binds) {
  if (!env.DB) throw new Error('DB binding missing')
  return env.DB.prepare(sql).bind(...binds).first()
}

async function dbRun(env, sql, ...binds) {
  if (!env.DB) throw new Error('DB binding missing')
  return env.DB.prepare(sql).bind(...binds).run()
}

async function appStateSet(env, key, value, expiresAt) {
  await dbRun(
    env,
    `INSERT INTO app_state (key, value, expires_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at, updated_at=excluded.updated_at`,
    key,
    typeof value === 'string' ? value : JSON.stringify(value),
    expiresAt ?? null,
    nowMs(),
  )
}

async function appStateGet(env, key) {
  const row = await dbFirst(env, `SELECT value, expires_at FROM app_state WHERE key = ?`, key)
  if (!row) return null
  if (row.expires_at != null && Number(row.expires_at) < nowMs()) {
    await dbRun(env, `DELETE FROM app_state WHERE key = ?`, key)
    return null
  }
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

async function appStateDel(env, key) {
  await dbRun(env, `DELETE FROM app_state WHERE key = ?`, key)
}

function normalizeResolution(v) {
  const s = String(v || '1K').toUpperCase()
  if (s === '4K' || s === '2K' || s === '1K') return s
  return '1K'
}

function pickHigherResolution(a, b) {
  const ra = RES_RANK[normalizeResolution(a)] || 1
  const rb = RES_RANK[normalizeResolution(b)] || 1
  return ra >= rb ? normalizeResolution(a) : normalizeResolution(b)
}

function isAdminEmail(email) {
  return normalizeEmail(email) === ADMIN_EMAIL
}

function entitlementPayload(row) {
  if (!row) {
    return {
      plan: 'free',
      status: 'active',
      usage: 0,
      generation_limit: FREE_GENERATION_LIMIT,
      remaining: FREE_GENERATION_LIMIT,
      max_resolution: '2K',
      unlimited: false,
      period_start: null,
      period_end: null,
    }
  }
  const plan = row.plan || 'free'
  const unlimited = plan === 'admin' || Number(row.generation_limit) >= ADMIN_GENERATION_LIMIT
  const limit = unlimited ? ADMIN_GENERATION_LIMIT : Number(row.generation_limit) || 0
  const usage = Number(row.usage) || 0
  return {
    plan,
    status: row.status || 'active',
    usage,
    generation_limit: limit,
    remaining: unlimited ? ADMIN_GENERATION_LIMIT : Math.max(0, limit - usage),
    max_resolution: unlimited ? '4K' : normalizeResolution(row.max_resolution || '1K'),
    unlimited: !!unlimited,
    period_start: row.period_start,
    period_end: row.period_end,
  }
}

/** One-time credit packs: do NOT wipe usage on calendar month. */
async function ensurePeriod(env, email, row) {
  return row || null
}

async function ensureSchema(env) {
  if (!env.DB) return
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
      trade_order_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      title TEXT,
      total_fee TEXT NOT NULL,
      generations INTEGER NOT NULL,
      max_resolution TEXT NOT NULL DEFAULT '1K',
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_id TEXT,
      open_order_id TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      raw_notify TEXT
    )`,
  ).run()
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)`,
  ).run()
  try {
    await env.DB.prepare(
      `ALTER TABLE entitlements ADD COLUMN max_resolution TEXT DEFAULT '1K'`,
    ).run()
  } catch (_) {
    /* column may already exist */
  }
}

async function upsertAdminEntitlement(env, email) {
  const updated = new Date().toISOString()
  const { period_start, period_end } = monthPeriod()
  await dbRun(
    env,
    `INSERT INTO entitlements (email, plan, status, usage, generation_limit, period_start, period_end, updated_at, applied_order_ids, max_resolution)
     VALUES (?, 'admin', 'active', 0, ?, ?, ?, ?, '[]', '4K')
     ON CONFLICT(email) DO UPDATE SET
       plan = 'admin',
       status = 'active',
       generation_limit = excluded.generation_limit,
       max_resolution = '4K',
       updated_at = excluded.updated_at`,
    email,
    ADMIN_GENERATION_LIMIT,
    period_start,
    period_end,
    updated,
  )
}

async function getEntitlement(env, email) {
  await ensureSchema(env)
  if (isAdminEmail(email)) {
    await upsertAdminEntitlement(env, email)
  }
  let row = await dbFirst(
    env,
    `SELECT email, plan, status, usage, generation_limit, period_start, period_end, updated_at, applied_order_ids, max_resolution
     FROM entitlements WHERE email = ?`,
    email,
  )
  if (!row) {
    // older DBs without max_resolution column may fail SELECT — fallback
    try {
      row = await dbFirst(
        env,
        `SELECT email, plan, status, usage, generation_limit, period_start, period_end, updated_at, applied_order_ids
         FROM entitlements WHERE email = ?`,
        email,
      )
      if (row) row.max_resolution = '1K'
    } catch {
      row = null
    }
  }
  row = await ensurePeriod(env, email, row)
  return entitlementPayload(row)
}

async function createFreeEntitlement(env, email) {
  await ensureSchema(env)
  if (isAdminEmail(email)) {
    await upsertAdminEntitlement(env, email)
    return getEntitlement(env, email)
  }
  const { period_start, period_end } = monthPeriod()
  const updated = new Date().toISOString()
  await dbRun(
    env,
    `INSERT INTO entitlements (email, plan, status, usage, generation_limit, period_start, period_end, updated_at, applied_order_ids, max_resolution)
     VALUES (?, 'free', 'active', 0, ?, ?, ?, ?, '[]', '2K')
     ON CONFLICT(email) DO NOTHING`,
    email,
    FREE_GENERATION_LIMIT,
    period_start,
    period_end,
    updated,
  )
  return getEntitlement(env, email)
}

async function applyPaidPack(env, { email, tradeOrderId, generations, maxResolution, packId }) {
  await ensureSchema(env)
  if (isAdminEmail(email)) {
    await upsertAdminEntitlement(env, email)
    return getEntitlement(env, email)
  }
  const gens = Math.max(0, Number(generations) || 0)
  const res = normalizeResolution(maxResolution)
  let row = await dbFirst(
    env,
    `SELECT email, plan, status, usage, generation_limit, period_start, period_end, applied_order_ids, max_resolution
     FROM entitlements WHERE email = ?`,
    email,
  )
  if (!row) {
    await createFreeEntitlement(env, email)
    row = await dbFirst(
      env,
      `SELECT email, plan, status, usage, generation_limit, period_start, period_end, applied_order_ids, max_resolution
       FROM entitlements WHERE email = ?`,
      email,
    )
  }
  let applied = []
  try {
    applied = JSON.parse(row.applied_order_ids || '[]')
    if (!Array.isArray(applied)) applied = []
  } catch {
    applied = []
  }
  if (applied.includes(tradeOrderId)) {
    return getEntitlement(env, email)
  }
  applied.push(tradeOrderId)
  const nextLimit = (Number(row.generation_limit) || 0) + gens
  const nextRes = pickHigherResolution(row.max_resolution || '1K', res)
  const nextPlan = packId && String(packId).startsWith('pack_') ? 'paid' : row.plan || 'paid'
  await dbRun(
    env,
    `UPDATE entitlements SET plan = ?, generation_limit = ?, max_resolution = ?, applied_order_ids = ?, updated_at = ? WHERE email = ?`,
    nextPlan === 'admin' ? 'admin' : 'paid',
    nextLimit,
    nextRes,
    JSON.stringify(applied),
    new Date().toISOString(),
    email,
  )
  return getEntitlement(env, email)
}

/**
 * Server-side gate before generate/inpaint. Returns { ok, user, entitlement, errorResponse }.
 * Does not consume; call consumeGeneration after upstream accepts the job.
 */
async function assertCanGenerate(request, env, { size, amount = 1 } = {}) {
  await ensureSchema(env)
  const user = await requireUser(request, env)
  if (!user) {
    return {
      ok: false,
      errorResponse: json(401, {
        error: '请先登录后再生成。',
        code: 'UNAUTHORIZED',
      }),
    }
  }
  const entitlement = await getEntitlement(env, user.email)
  if (!entitlement.unlimited) {
    const need = Math.max(1, Math.min(10, Number(amount) || 1))
    if ((entitlement.remaining || 0) < need) {
      return {
        ok: false,
        user,
        entitlement,
        errorResponse: json(403, {
          error: '额度不足，请购买套餐后续费。',
          code: 'QUOTA_EXCEEDED',
          entitlement,
        }),
      }
    }
    const want = normalizeResolution(size || '1K')
    const allow = normalizeResolution(entitlement.max_resolution || '1K')
    if ((RES_RANK[want] || 1) > (RES_RANK[allow] || 1)) {
      return {
        ok: false,
        user,
        entitlement,
        errorResponse: json(403, {
          error: `当前套餐最高支持 ${allow}，请升级解锁 ${want}。`,
          code: 'RESOLUTION_LOCKED',
          entitlement,
          max_resolution: allow,
        }),
      }
    }
  }
  return { ok: true, user, entitlement }
}

async function consumeGeneration(env, email, amount = 1) {
  if (isAdminEmail(email)) {
    return getEntitlement(env, email)
  }
  const need = Math.max(1, Math.min(10, Number(amount) || 1))
  let row = await dbFirst(
    env,
    `SELECT email, plan, status, usage, generation_limit, period_start, period_end, max_resolution FROM entitlements WHERE email = ?`,
    email,
  )
  if (!row) {
    await createFreeEntitlement(env, email)
    row = await dbFirst(
      env,
      `SELECT email, plan, status, usage, generation_limit, period_start, period_end, max_resolution FROM entitlements WHERE email = ?`,
      email,
    )
  }
  if (row.plan === 'admin' || Number(row.generation_limit) >= ADMIN_GENERATION_LIMIT) {
    return entitlementPayload({ ...row, plan: 'admin', max_resolution: '4K' })
  }
  const usage = Number(row.usage) || 0
  const limit = Number(row.generation_limit) || 0
  if (usage + need > limit) {
    const err = new Error('QUOTA_EXCEEDED')
    err.code = 'QUOTA_EXCEEDED'
    err.entitlement = entitlementPayload(row)
    throw err
  }
  const nextUsage = usage + need
  await dbRun(
    env,
    `UPDATE entitlements SET usage = ?, updated_at = ? WHERE email = ?`,
    nextUsage,
    new Date().toISOString(),
    email,
  )
  return entitlementPayload({ ...row, usage: nextUsage })
}

async function handleCaptchaChallenge(env) {
  const id = randomId()
  const width = 360
  const height = 120
  const pieceWidth = 150
  const maxOffset = width - Math.floor(pieceWidth * 0.55)
  // Center-ish target so flashlight-on-word UX matches verify
  const center = Math.floor(maxOffset / 2)
  const jitter = Math.floor((Math.random() - 0.5) * Math.min(40, maxOffset * 0.15))
  const target = Math.max(16, Math.min(maxOffset - 16, center + jitter))
  const word = 'canno3D'
  await appStateSet(
    env,
    `captcha:${id}`,
    { target, word, attempts: 0 },
    nowMs() + CAPTCHA_TTL_MS,
  )
  return json(200, {
    id,
    mode: 'text',
    width,
    height,
    pieceTop: 0,
    pieceWidth,
    pieceHeight: height,
    maxOffset,
    wordHint: word.length,
  })
}

async function handleCaptchaVerify(request, env) {
  const body = await readJson(request)
  const challengeId = String(body.challengeId || '')
  const offset = Number(body.offset)
  if (!challengeId || !Number.isFinite(offset)) {
    return json(400, { error: '参数无效。', code: 'BAD_REQUEST' })
  }
  const state = await appStateGet(env, `captcha:${challengeId}`)
  if (!state || typeof state !== 'object') {
    return json(400, { error: '验证已过期，请刷新验证码。', code: 'CAPTCHA_EXPIRED' })
  }
  const attempts = Number(state.attempts || 0) + 1
  if (attempts > 8) {
    await appStateDel(env, `captcha:${challengeId}`)
    return json(400, { error: '验证次数过多，请刷新。', code: 'CAPTCHA_LOCKED' })
  }
  const ok = Math.abs(offset - Number(state.target)) <= CAPTCHA_TOLERANCE
  if (!ok) {
    await appStateSet(
      env,
      `captcha:${challengeId}`,
      { ...state, attempts },
      nowMs() + CAPTCHA_TTL_MS,
    )
    return json(400, { error: '拼图验证失败，请重试。', code: 'CAPTCHA_MISMATCH' })
  }
  await appStateDel(env, `captcha:${challengeId}`)
  const token = randomId()
  await appStateSet(
    env,
    `captchaToken:${token}`,
    { ok: true, challengeId },
    nowMs() + CAPTCHA_TOKEN_TTL_MS,
  )
  return json(200, { token, word: state.word })
}

async function consumeCaptchaToken(env, captchaToken) {
  if (!captchaToken || typeof captchaToken !== 'string') return false
  const key = `captchaToken:${captchaToken}`
  const state = await appStateGet(env, key)
  if (!state) return false
  await appStateDel(env, key)
  return true
}

async function handleRegister(request, env) {
  await ensureSchema(env)
  const body = await readJson(request)
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  if (!validEmail(email)) return json(400, { error: '请输入有效邮箱。', code: 'BAD_EMAIL' })
  if (password.length < 8) return json(400, { error: '密码至少 8 位。', code: 'WEAK_PASSWORD' })
  if (!/^[A-Z]/.test(password)) {
    return json(400, { error: '密码首字母必须大写。', code: 'WEAK_PASSWORD' })
  }

  const existing = await dbFirst(env, `SELECT email FROM users WHERE email = ?`, email)
  if (existing) return json(409, { error: '该邮箱已注册，请直接登录。', code: 'EMAIL_EXISTS' })

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const password_hash = await derivePasswordHash(password, salt)
  const password_salt = hex(salt)
  const id = randomId()
  const ts = new Date().toISOString()
  await dbRun(
    env,
    `INSERT INTO users (email, id, phone, password_hash, password_salt, status, created_at, updated_at, email_verified_at, last_login_at)
     VALUES (?, ?, NULL, ?, ?, 'active', ?, ?, NULL, NULL)`,
    email,
    id,
    password_hash,
    password_salt,
    ts,
    ts,
  )
  await createFreeEntitlement(env, email)
  return json(200, {
    ok: true,
    message: '账号注册成功，请登录。',
    email,
  })
}

async function handleLogin(request, env) {
  await ensureSchema(env)
  const body = await readJson(request)
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  if (!validEmail(email)) return json(400, { error: '请输入有效邮箱。', code: 'BAD_EMAIL' })
  if (password.length < 6) return json(400, { error: '密码至少需要 6 位。', code: 'BAD_PASSWORD' })

  const user = await dbFirst(
    env,
    `SELECT email, id, password_hash, password_salt, status FROM users WHERE email = ?`,
    email,
  )
  if (!user || !user.password_hash || !user.password_salt) {
    return json(401, { error: '邮箱或密码不正确。', code: 'AUTH_FAILED' })
  }
  if (user.status && user.status !== 'active') {
    return json(403, { error: '账号不可用。', code: 'ACCOUNT_DISABLED' })
  }

  const saltBytes = new Uint8Array(
    user.password_salt.match(/.{1,2}/g).map((h) => parseInt(h, 16)),
  )
  const hash = await derivePasswordHash(password, saltBytes)
  if (hash !== user.password_hash) {
    return json(401, { error: '邮箱或密码不正确。', code: 'AUTH_FAILED' })
  }

  const secret = (env.AUTH_SESSION_SECRET || '').trim()
  const session = await makeSessionToken(secret, email)
  const tokenHash = await sha256Hex(session.token)
  await dbRun(
    env,
    `INSERT INTO auth_tokens (token_hash, email, purpose, payload, created_at, expires_at)
     VALUES (?, ?, 'session', ?, ?, ?)
     ON CONFLICT(token_hash) DO UPDATE SET email=excluded.email, purpose=excluded.purpose, payload=excluded.payload, created_at=excluded.created_at, expires_at=excluded.expires_at`,
    tokenHash,
    email,
    JSON.stringify({ sid: session.sid }),
    nowMs(),
    session.exp,
  )
  await dbRun(
    env,
    `UPDATE users SET last_login_at = ?, updated_at = ? WHERE email = ?`,
    new Date().toISOString(),
    new Date().toISOString(),
    email,
  )

  let entitlement = await getEntitlement(env, email)
  if (entitlement.generation_limit === 0 && entitlement.plan === 'free') {
    entitlement = await createFreeEntitlement(env, email)
  }

  const cookie = `canno_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  return json(
    200,
    {
      ok: true,
      email,
      token: session.token,
      entitlement,
    },
    { 'Set-Cookie': cookie },
  )
}

async function requireUser(request, env) {
  const token = getBearer(request)
  const secret = (env.AUTH_SESSION_SECRET || '').trim()
  const parsed = await verifySessionToken(secret, token)
  if (!parsed) return null
  const tokenHash = await sha256Hex(token)
  const row = await dbFirst(
    env,
    `SELECT email, expires_at FROM auth_tokens WHERE token_hash = ? AND purpose = 'session'`,
    tokenHash,
  )
  if (!row || Number(row.expires_at) < nowMs()) return null
  return { email: row.email, token }
}

async function handleMe(request, env) {
  const user = await requireUser(request, env)
  if (!user) return json(401, { error: '未登录。', code: 'UNAUTHORIZED' })
  const entitlement = await getEntitlement(env, user.email)
  return json(200, { ok: true, email: user.email, entitlement })
}

async function handleLogout(request, env) {
  const token = getBearer(request)
  if (token) {
    const tokenHash = await sha256Hex(token)
    await dbRun(env, `DELETE FROM auth_tokens WHERE token_hash = ?`, tokenHash)
  }
  return json(
    200,
    { ok: true },
    {
      'Set-Cookie':
        'canno_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  )
}

async function handleConsume(request, env) {
  const user = await requireUser(request, env)
  if (!user) return json(401, { error: '未登录。', code: 'UNAUTHORIZED' })
  const body = await readJson(request)
  const amount = Math.max(1, Math.min(10, Number(body.amount) || 1))
  try {
    const entitlement = await consumeGeneration(env, user.email, amount)
    return json(200, { ok: true, entitlement })
  } catch (err) {
    if (err && err.code === 'QUOTA_EXCEEDED') {
      return json(403, {
        error: '额度不足。',
        code: 'QUOTA_EXCEEDED',
        entitlement: err.entitlement,
      })
    }
    throw err
  }
}

export async function handleAuthRoutes(request, env, path) {
  if (!env.DB) {
    return json(503, { error: '数据库未绑定（DB）。', code: 'NO_DB' })
  }

  if (path === '/api/captcha/challenge' && request.method === 'GET') {
    return json(410, { error: '安全验证已关闭。', code: 'CAPTCHA_DISABLED' })
  }
  if (path === '/api/captcha/verify' && request.method === 'POST') {
    return json(410, { error: '安全验证已关闭。', code: 'CAPTCHA_DISABLED' })
  }
  if (path === '/api/auth/register' && request.method === 'POST') {
    return handleRegister(request, env)
  }
  if (path === '/api/auth/login' && request.method === 'POST') {
    return handleLogin(request, env)
  }
  if (path === '/api/auth/me' && request.method === 'GET') {
    return handleMe(request, env)
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return handleLogout(request, env)
  }
  if (path === '/api/auth/consume' && request.method === 'POST') {
    return handleConsume(request, env)
  }
  return null
}

export {
  corsHeaders,
  json,
  FREE_GENERATION_LIMIT,
  ADMIN_EMAIL,
  requireUser,
  ensureSchema,
  applyPaidPack,
  assertCanGenerate,
  consumeGeneration,
  getEntitlement,
  normalizeResolution,
}
