/**
 * canno3D packs + 虎皮椒(xunhupay) checkout / notify.
 * Secrets: HUJIAO_APPID (or XUNHUPAY_APPID), HUJIAO_APPSECRET (or XUNHUPAY_APPSECRET)
 * Optional: HUJIAO_GATEWAY (default https://api.xunhupay.com)
 */

import {
  requireUser,
  applyPaidPack,
  ensureSchema,
  json,
  corsHeaders,
  ADMIN_EMAIL,
} from './auth.js'

/** @typedef {'1K'|'2K'|'4K'} ResTier */

export const PACKS = Object.freeze([
  {
    id: 'pack_promo_4k',
    priceYuan: '19.90',
    generations: 100,
    maxResolution: '4K',
    badgeZh: '限时体验',
    badgeEn: 'Limited promo',
    titleZh: '限时体验',
    titleEn: 'Limited promo',
    descZh: '100次 · 4K',
    descEn: '100 gens · 4K',
  },
  {
    id: 'pack_classic_2k',
    priceYuan: '19.90',
    generations: 100,
    maxResolution: '2K',
    badgeZh: '',
    badgeEn: '',
    titleZh: '个人版',
    titleEn: 'Personal',
    descZh: '100次 · 1K / 2K',
    descEn: '100 gens · 1K / 2K',
  },
  {
    id: 'pack_personal_2k',
    priceYuan: '29.90',
    generations: 200,
    maxResolution: '2K',
    badgeZh: '',
    badgeEn: '',
    titleZh: '个人版',
    titleEn: 'Personal',
    descZh: '200次 · 1K / 2K',
    descEn: '200 gens · 1K / 2K',
  },
  {
    id: 'pack_enterprise_4k',
    priceYuan: '49.90',
    generations: 300,
    maxResolution: '4K',
    badgeZh: '',
    badgeEn: '',
    titleZh: '企业版',
    titleEn: 'Enterprise',
    descZh: '300次 · 4K',
    descEn: '300 gens · 4K',
  },
])

function packById(id) {
  return PACKS.find((p) => p.id === id) || null
}

function cleanCred(v) {
  let s = String(v ?? '').replace(/^\uFEFF/, '').trim()
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function fingerprintAppid(appid) {
  const s = String(appid || '')
  if (!s) return { len: 0, head: '', tail: '' }
  return {
    len: s.length,
    head: s.slice(0, Math.min(4, s.length)),
    tail: s.slice(Math.max(0, s.length - 4)),
  }
}

const DEFAULT_GATEWAYS = Object.freeze([
  'https://api.xunhupay.com',
  'https://api.dpweixin.com',
])

/** Prefer complete HUJIAO_* pair, then complete XUNHUPAY_* pair. Never mix appid/secret across brands. */
function listHujiaoPairs(env) {
  const preferredGateway = cleanCred(env.HUJIAO_GATEWAY || env.XUNHUPAY_GATEWAY || '').replace(
    /\/+$/,
    '',
  )
  const gateways = []
  if (preferredGateway) gateways.push(preferredGateway)
  for (const g of DEFAULT_GATEWAYS) {
    if (!gateways.includes(g)) gateways.push(g)
  }

  const hApp = cleanCred(env.HUJIAO_APPID)
  const hSec = cleanCred(env.HUJIAO_APPSECRET)
  const xApp = cleanCred(env.XUNHUPAY_APPID)
  const xSec = cleanCred(env.XUNHUPAY_APPSECRET)

  const pairs = []
  const push = (source, appid, secret) => {
    if (!appid || !secret) return
    if (appid.length <= 4 || secret.length <= 8) return
    if (pairs.some((p) => p.appid === appid && p.secret === secret)) return
    pairs.push({ source, appid, secret })
  }
  push('HUJIAO', hApp, hSec)
  push('XUNHUPAY', xApp, xSec)
  if (!pairs.length) {
    push('MIXED', hApp || xApp, hSec || xSec)
  }
  return {
    pairs,
    gateways,
    meta: {
      hasHujiaoAppid: !!hApp,
      hasHujiaoSecret: !!hSec,
      hasXunhuAppid: !!xApp,
      hasXunhuSecret: !!xSec,
      hujiaoFp: fingerprintAppid(hApp),
      xunhuFp: fingerprintAppid(xApp),
      sameAppid: !!(hApp && xApp && hApp === xApp),
      sameSecret: !!(hSec && xSec && hSec === xSec),
    },
  }
}

function getHujiaoCreds(env) {
  const { pairs, gateways } = listHujiaoPairs(env)
  const primary = pairs[0] || { source: 'NONE', appid: '', secret: '' }
  const gateway = gateways[0] || DEFAULT_GATEWAYS[0]
  return {
    appid: primary.appid,
    secret: primary.secret,
    gateway,
    source: primary.source,
    configured: !!(
      primary.appid &&
      primary.secret &&
      primary.appid.length > 4 &&
      primary.secret.length > 8
    ),
    pairCount: pairs.length,
  }
}

function isUnknownAppidError(errmsg) {
  const s = String(errmsg || '')
  return /未知的?\s*APPID|unknown\s*appid|invalid\s*appid|appid\s*not\s*found/i.test(s)
}

async function postXunhupayCreate(gateway, params, bodyMode = 'json') {
  const headers =
    bodyMode === 'form'
      ? {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        }
      : {
          'Content-Type': 'application/json;charset=UTF-8',
          Accept: 'application/json',
        }
  const body =
    bodyMode === 'form' ? new URLSearchParams(params).toString() : JSON.stringify(params)
  const res = await fetch(`${gateway}/payment/do.html`, {
    method: 'POST',
    headers,
    body,
  })
  const text = await res.text()
  let upstream
  try {
    upstream = text ? JSON.parse(text) : {}
  } catch {
    upstream = { errcode: 502, errmsg: text.slice(0, 200) || 'non-json' }
  }
  return { upstream, httpStatus: res.status, bodyMode }
}

/** Minimal MD5 (hex lowercase) for 虎皮椒 hash — WebCrypto has no MD5. */
function md5Hex(str) {
  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0
    return (((a << s) | (a >>> (32 - s))) + b) | 0
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t)
  }
  function toUtf8(input) {
    return unescape(encodeURIComponent(input))
  }
  const msg = toUtf8(str)
  const n = msg.length
  const words = []
  for (let i = 0; i < n; i++) {
    words[i >> 2] |= (msg.charCodeAt(i) & 0xff) << ((i % 4) * 8)
  }
  words[n >> 2] |= 0x80 << ((n % 4) * 8)
  words[(((n + 8) >> 6) << 4) + 14] = n * 8
  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878
  for (let i = 0; i < words.length; i += 16) {
    const oa = a
    const ob = b
    const oc = c
    const od = d
    const w = []
    for (let j = 0; j < 16; j++) w[j] = words[i + j] | 0
    a = ff(a, b, c, d, w[0], 7, -680876936)
    d = ff(d, a, b, c, w[1], 12, -389564586)
    c = ff(c, d, a, b, w[2], 17, 606105819)
    b = ff(b, c, d, a, w[3], 22, -1044525330)
    a = ff(a, b, c, d, w[4], 7, -176418897)
    d = ff(d, a, b, c, w[5], 12, 1200080426)
    c = ff(c, d, a, b, w[6], 17, -1473231341)
    b = ff(b, c, d, a, w[7], 22, -45705983)
    a = ff(a, b, c, d, w[8], 7, 1770035416)
    d = ff(d, a, b, c, w[9], 12, -1958414417)
    c = ff(c, d, a, b, w[10], 17, -42063)
    b = ff(b, c, d, a, w[11], 22, -1990404162)
    a = ff(a, b, c, d, w[12], 7, 1804603682)
    d = ff(d, a, b, c, w[13], 12, -40341101)
    c = ff(c, d, a, b, w[14], 17, -1502002290)
    b = ff(b, c, d, a, w[15], 22, 1236535329)
    a = gg(a, b, c, d, w[1], 5, -165796510)
    d = gg(d, a, b, c, w[6], 9, -1069501632)
    c = gg(c, d, a, b, w[11], 14, 643717713)
    b = gg(b, c, d, a, w[0], 20, -373897302)
    a = gg(a, b, c, d, w[5], 5, -701558691)
    d = gg(d, a, b, c, w[10], 9, 38016083)
    c = gg(c, d, a, b, w[15], 14, -660478335)
    b = gg(b, c, d, a, w[4], 20, -405537848)
    a = gg(a, b, c, d, w[9], 5, 568446438)
    d = gg(d, a, b, c, w[14], 9, -1019803690)
    c = gg(c, d, a, b, w[3], 14, -187363961)
    b = gg(b, c, d, a, w[8], 20, 1163531501)
    a = gg(a, b, c, d, w[13], 5, -1444681467)
    d = gg(d, a, b, c, w[2], 9, -51403784)
    c = gg(c, d, a, b, w[7], 14, 1735328473)
    b = gg(b, c, d, a, w[12], 20, -1926607734)
    a = hh(a, b, c, d, w[5], 4, -378558)
    d = hh(d, a, b, c, w[8], 11, -2022574463)
    c = hh(c, d, a, b, w[11], 16, 1839030562)
    b = hh(b, c, d, a, w[14], 23, -35309556)
    a = hh(a, b, c, d, w[1], 4, -1530992060)
    d = hh(d, a, b, c, w[4], 11, 1272893353)
    c = hh(c, d, a, b, w[7], 16, -155497632)
    b = hh(b, c, d, a, w[10], 23, -1094730640)
    a = hh(a, b, c, d, w[13], 4, 681279174)
    d = hh(d, a, b, c, w[0], 11, -358537222)
    c = hh(c, d, a, b, w[3], 16, -722521979)
    b = hh(b, c, d, a, w[6], 23, 76029189)
    a = hh(a, b, c, d, w[9], 4, -640364487)
    d = hh(d, a, b, c, w[12], 11, -421815835)
    c = hh(c, d, a, b, w[15], 16, 530742520)
    b = hh(b, c, d, a, w[2], 23, -995338651)
    a = ii(a, b, c, d, w[0], 6, -198630844)
    d = ii(d, a, b, c, w[7], 10, 1126891415)
    c = ii(c, d, a, b, w[14], 15, -1416354905)
    b = ii(b, c, d, a, w[5], 21, -57434055)
    a = ii(a, b, c, d, w[12], 6, 1700485571)
    d = ii(d, a, b, c, w[3], 10, -1894986606)
    c = ii(c, d, a, b, w[10], 15, -1051523)
    b = ii(b, c, d, a, w[1], 21, -2054922799)
    a = ii(a, b, c, d, w[8], 6, 1873313359)
    d = ii(d, a, b, c, w[15], 10, -30611744)
    c = ii(c, d, a, b, w[6], 15, -1560198380)
    b = ii(b, c, d, a, w[13], 21, 1309151649)
    a = ii(a, b, c, d, w[4], 6, -145523070)
    d = ii(d, a, b, c, w[11], 10, -1120210379)
    c = ii(c, d, a, b, w[2], 15, 718787259)
    b = ii(b, c, d, a, w[9], 21, -343485551)
    a = (a + oa) | 0
    b = (b + ob) | 0
    c = (c + oc) | 0
    d = (d + od) | 0
  }
  function hex(n) {
    let s = ''
    for (let j = 0; j < 4; j++) {
      s += ((n >> (j * 8)) & 0xff).toString(16).padStart(2, '0')
    }
    return s
  }
  return hex(a) + hex(b) + hex(c) + hex(d)
}

function makeSign(params, secret) {
  const filtered = {}
  for (const [k, v] of Object.entries(params || {})) {
    if (k === 'hash') continue
    if (v === null || v === undefined || v === '') continue
    filtered[k] = String(v)
  }
  const keys = Object.keys(filtered).sort()
  const query = keys.map((k) => `${k}=${filtered[k]}`).join('&')
  return md5Hex(query + secret)
}

function sanitizePayTitle(raw) {
  // 虎皮椒: no emoji / % ; keep ASCII + CJK
  return String(raw || '')
    .replace(/[%]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .trim()
    .slice(0, 120)
}

function nonceStr(len = 24) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

function publicOrigin(request) {
  const host = new URL(request.url).hostname
  if (host === 'canno3d.com' || host.endsWith('.canno3d.com')) return 'https://canno3d.com'
  if (host.endsWith('.workers.dev')) return 'https://canno3d.com'
  return new URL(request.url).origin
}

async function dbFirst(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).first()
}

async function dbRun(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).run()
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

async function readFormOrJson(request) {
  const ctype = (request.headers.get('Content-Type') || '').toLowerCase()
  if (ctype.includes('application/json')) {
    const j = await readJson(request)
    return j && typeof j === 'object' ? j : {}
  }
  try {
    const form = await request.formData()
    const out = {}
    for (const [k, v] of form.entries()) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    // fallback: try urlencoded text
    try {
      const text = await request.text()
      const params = new URLSearchParams(text)
      const out = {}
      for (const [k, v] of params.entries()) out[k] = v
      return out
    } catch {
      return {}
    }
  }
}

function feesEqual(a, b) {
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return String(a) === String(b)
  return Math.abs(na - nb) < 0.001
}

async function handlePacks(env) {
  const creds = getHujiaoCreds(env)
  return json(200, {
    ok: true,
    packs: PACKS,
    paymentConfigured: creds.configured,
    currency: 'CNY',
    channel: 'hujiao',
    credSource: creds.source,
    pairCount: creds.pairCount,
  })
}

async function handlePayDiag(request, env) {
  const listed = listHujiaoPairs(env)
  const u = new URL(request.url)
  const wantProbe = u.searchParams.get('probe') === '1'
  const base = {
    ok: true,
    meta: listed.meta,
    pairCount: listed.pairs.length,
    gateways: listed.gateways,
  }
  if (!wantProbe) {
    return json(200, { ...base, probes: [], note: 'pass ?probe=1 as admin to run live gateway probes' })
  }
  const user = await requireUser(request, env)
  if (!user || user.email !== ADMIN_EMAIL) {
    return json(403, { error: 'diag probe 仅管理员可用。', code: 'FORBIDDEN' })
  }
  const probes = []
  for (const pair of listed.pairs) {
    for (const gateway of listed.gateways.slice(0, 2)) {
      for (const bodyMode of ['json', 'form']) {
        const trade_order_id = `diag${Date.now().toString(36)}${nonceStr(6)}`.slice(0, 32)
        const params = {
          version: '1.1',
          appid: pair.appid,
          trade_order_id,
          total_fee: '0.01',
          title: 'canno3D diag',
          time: String(Math.floor(Date.now() / 1000)),
          notify_url: 'https://canno3d.com/api/pay/notify',
          nonce_str: nonceStr(32),
        }
        params.hash = makeSign(params, pair.secret)
        try {
          const { upstream, httpStatus } = await postXunhupayCreate(gateway, params, bodyMode)
          probes.push({
            source: pair.source,
            gateway,
            bodyMode,
            appidFp: fingerprintAppid(pair.appid),
            secretLen: pair.secret.length,
            httpStatus,
            errcode: upstream.errcode ?? null,
            errmsg: String(upstream.errmsg || '').slice(0, 160),
            ok: Number(upstream.errcode) === 0,
            hasPayUrl: !!(upstream.url || (upstream.data && upstream.data.url)),
          })
          // stop bodyMode loop early if success
          if (Number(upstream.errcode) === 0) break
        } catch (err) {
          probes.push({
            source: pair.source,
            gateway,
            bodyMode,
            appidFp: fingerprintAppid(pair.appid),
            secretLen: pair.secret.length,
            error: String(err && err.message ? err.message : err).slice(0, 160),
          })
        }
      }
    }
  }
  return json(200, {
    ok: true,
    meta: listed.meta,
    pairCount: listed.pairs.length,
    gateways: listed.gateways,
    probes,
  })
}

async function handleCreate(request, env) {
  await ensureSchema(env)
  const user = await requireUser(request, env)
  if (!user) return json(401, { error: '请先登录后再购买。', code: 'UNAUTHORIZED' })
  if (user.email === ADMIN_EMAIL) {
    return json(400, { error: '管理员账户无需购买额度。', code: 'ADMIN_NO_PAY' })
  }

  const creds = getHujiaoCreds(env)
  if (!creds.configured) {
    return json(503, {
      error: '支付通道尚未配置商户密钥。请联系管理员在 Worker secrets 填入 HUJIAO_APPID / HUJIAO_APPSECRET。',
      code: 'PAY_NOT_CONFIGURED',
    })
  }

  const body = await readJson(request)
  const pack = packById(String(body.packId || body.pack_id || ''))
  if (!pack) return json(400, { error: '无效套餐。', code: 'BAD_PACK' })

  const tradeOrderId = `c${Date.now().toString(36)}${nonceStr(10)}`.slice(0, 32)
  const origin = publicOrigin(request)
  const notifyUrl = `${origin}/api/pay/notify`
  const returnUrl = `${origin}/?pay=return&order=${encodeURIComponent(tradeOrderId)}`
  const callbackUrl = `${origin}/?pay=cancel`
  const title = sanitizePayTitle(`canno3D ${pack.titleZh}`)
  const nowIso = new Date().toISOString()

  await dbRun(
    env,
    `INSERT INTO orders (
      trade_order_id, email, pack_id, title, total_fee, generations, max_resolution,
      status, transaction_id, open_order_id, created_at, paid_at, raw_notify
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, NULL, NULL)`,
    tradeOrderId,
    user.email,
    pack.id,
    title,
    pack.priceYuan,
    pack.generations,
    pack.maxResolution,
    nowIso,
  )

  let params = {
    version: '1.1',
    appid: creds.appid,
    trade_order_id: tradeOrderId,
    total_fee: pack.priceYuan,
    title,
    time: String(Math.floor(Date.now() / 1000)),
    notify_url: notifyUrl,
    return_url: returnUrl,
    callback_url: callbackUrl,
    plugins: 'canno3d',
    attach: JSON.stringify({ email: user.email, packId: pack.id }),
    nonce_str: nonceStr(32),
  }

  const listed = listHujiaoPairs(env)
  let upstream = null
  let used = {
    source: creds.source,
    gateway: creds.gateway,
    bodyMode: 'json',
    appidFp: fingerprintAppid(creds.appid),
  }
  const attempts = []
  let lastErr = null

  try {
    outer: for (const pair of listed.pairs) {
      for (const gateway of listed.gateways) {
        for (const bodyMode of ['json', 'form']) {
          const tryParams = { ...params, appid: pair.appid }
          tryParams.hash = makeSign(tryParams, pair.secret)
          const { upstream: up } = await postXunhupayCreate(gateway, tryParams, bodyMode)
          const errcodeTry = Number(up.errcode)
          attempts.push({
            source: pair.source,
            gateway,
            bodyMode,
            appidFp: fingerprintAppid(pair.appid),
            errcode: Number.isFinite(errcodeTry) ? errcodeTry : null,
            errmsg: String(up.errmsg || '').slice(0, 120),
          })
          if (!Number.isFinite(errcodeTry) || errcodeTry === 0) {
            upstream = up
            used = {
              source: pair.source,
              gateway,
              bodyMode,
              appidFp: fingerprintAppid(pair.appid),
            }
            params = tryParams
            break outer
          }
          lastErr = up
          const msg = String(up.errmsg || '')
          // Rotate on APPID/sign style errors; stop on other business errors
          if (isUnknownAppidError(msg) || /invalid\s*sign|错误的签名|请核对appid|APPID|签名|sign/i.test(msg)) {
            continue
          }
          upstream = up
          used = {
            source: pair.source,
            gateway,
            bodyMode,
            appidFp: fingerprintAppid(pair.appid),
          }
          break outer
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json(502, { error: `支付网关请求失败：${message.slice(0, 160)}`, code: 'PAY_GATEWAY' })
  }

  if (!upstream) upstream = lastErr || { errcode: 502, errmsg: '支付网关无响应' }

  const errcode = Number(upstream.errcode)
  if (Number.isFinite(errcode) && errcode !== 0) {
    await dbRun(
      env,
      `UPDATE orders SET status = 'failed', raw_notify = ? WHERE trade_order_id = ?`,
      JSON.stringify({ create: upstream, attempts, used }).slice(0, 4000),
      tradeOrderId,
    )
    return json(502, {
      error: String(upstream.errmsg || '发起支付失败').slice(0, 200),
      code: 'PAY_CREATE_FAIL',
      hint: {
        source: used.source,
        gateway: used.gateway,
        bodyMode: used.bodyMode,
        appidFp: used.appidFp,
        pairCount: listed.pairs.length,
        attempts: attempts.slice(0, 8),
      },
    })
  }

  const data = upstream.data && typeof upstream.data === 'object' ? upstream.data : upstream
  const payUrl = data.url || upstream.url || null
  const qrcode = data.url_qrcode || upstream.url_qrcode || null
  const openOrderId = data.open_order_id || upstream.open_order_id || upstream.openid || null
  if (openOrderId) {
    await dbRun(
      env,
      `UPDATE orders SET open_order_id = ? WHERE trade_order_id = ?`,
      String(openOrderId),
      tradeOrderId,
    )
  }

  if (!payUrl && !qrcode) {
    return json(502, { error: '支付网关未返回付款链接。', code: 'PAY_NO_URL', raw: { errcode: upstream.errcode } })
  }

  return json(200, {
    ok: true,
    tradeOrderId,
    packId: pack.id,
    totalFee: pack.priceYuan,
    payUrl,
    qrcodeUrl: qrcode,
    openOrderId,
  })
}

async function fulfillPaidOrder(env, order, notify) {
  if (order.status === 'paid') {
    return { already: true }
  }
  const paidAt = new Date().toISOString()
  await dbRun(
    env,
    `UPDATE orders SET status = 'paid', paid_at = ?, transaction_id = ?, open_order_id = COALESCE(?, open_order_id), raw_notify = ? WHERE trade_order_id = ? AND status != 'paid'`,
    paidAt,
    notify.transaction_id ? String(notify.transaction_id) : null,
    notify.open_order_id ? String(notify.open_order_id) : null,
    JSON.stringify(notify).slice(0, 4000),
    order.trade_order_id,
  )
  // Re-check for race: only credit if we own the transition or already paid
  const refreshed = await dbFirst(
    env,
    `SELECT trade_order_id, email, pack_id, generations, max_resolution, status FROM orders WHERE trade_order_id = ?`,
    order.trade_order_id,
  )
  if (!refreshed || refreshed.status !== 'paid') {
    return { already: false, skipped: true }
  }
  await applyPaidPack(env, {
    email: refreshed.email,
    tradeOrderId: refreshed.trade_order_id,
    generations: Number(refreshed.generations) || 0,
    maxResolution: refreshed.max_resolution || '1K',
    packId: refreshed.pack_id,
  })
  return { already: false, credited: true }
}

async function handleNotify(request, env) {
  await ensureSchema(env)
  const listedNotify = listHujiaoPairs(env)
  if (!listedNotify.pairs.length) {
    return new Response('fail', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const data = await readFormOrJson(request)
  const receivedHash = String(data.hash || '')
  let hashOk = false
  if (receivedHash) {
    for (const pair of listedNotify.pairs) {
      const expect = makeSign(data, pair.secret)
      if (receivedHash.toLowerCase() === expect.toLowerCase()) {
        hashOk = true
        break
      }
    }
  }
  if (!hashOk) {
    return new Response('fail', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const tradeOrderId = String(data.trade_order_id || '')
  const status = String(data.status || '')
  if (!tradeOrderId) {
    return new Response('fail', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const order = await dbFirst(
    env,
    `SELECT trade_order_id, email, pack_id, title, total_fee, generations, max_resolution, status
     FROM orders WHERE trade_order_id = ?`,
    tradeOrderId,
  )
  if (!order) {
    // Unknown order — ack to stop retries but do not credit
    return new Response('success', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  if (status === 'OD') {
    if (!feesEqual(data.total_fee, order.total_fee)) {
      await dbRun(
        env,
        `UPDATE orders SET raw_notify = ? WHERE trade_order_id = ?`,
        JSON.stringify({ mismatch: true, data }).slice(0, 4000),
        tradeOrderId,
      )
      return new Response('fail', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
    try {
      await fulfillPaidOrder(env, order, data)
    } catch (err) {
      console.log('pay notify fulfill error', String(err && err.message ? err.message : err).slice(0, 200))
      return new Response('fail', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
  }

  return new Response('success', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

async function handleOrderStatus(request, env) {
  await ensureSchema(env)
  const user = await requireUser(request, env)
  if (!user) return json(401, { error: '未登录。', code: 'UNAUTHORIZED' })
  const u = new URL(request.url)
  const id = u.searchParams.get('id') || u.searchParams.get('order') || ''
  if (!id) return json(400, { error: '缺少订单号。', code: 'BAD_ORDER' })
  const order = await dbFirst(
    env,
    `SELECT trade_order_id, email, pack_id, total_fee, generations, max_resolution, status, paid_at, created_at
     FROM orders WHERE trade_order_id = ?`,
    id,
  )
  if (!order || order.email !== user.email) {
    return json(404, { error: '订单不存在。', code: 'NOT_FOUND' })
  }
  return json(200, {
    ok: true,
    order: {
      tradeOrderId: order.trade_order_id,
      packId: order.pack_id,
      totalFee: order.total_fee,
      generations: order.generations,
      maxResolution: order.max_resolution,
      status: order.status,
      paidAt: order.paid_at,
      createdAt: order.created_at,
    },
  })
}

export async function handlePayRoutes(request, env, path) {
  if (!env.DB) {
    return json(503, { error: '数据库未绑定（DB）。', code: 'NO_DB' })
  }
  if (path === '/api/pay/packs' && request.method === 'GET') {
    return handlePacks(env)
  }
  if (path === '/api/pay/diag' && request.method === 'GET') {
    return handlePayDiag(request, env)
  }
  if (path === '/api/pay/create' && request.method === 'POST') {
    return handleCreate(request, env)
  }
  if (path === '/api/pay/notify' && request.method === 'POST') {
    return handleNotify(request, env)
  }
  if ((path === '/api/pay/order' || path === '/api/pay/status') && request.method === 'GET') {
    if (path === '/api/pay/status' && !new URL(request.url).searchParams.get('id')) {
      const creds = getHujiaoCreds(env)
      const listed = listHujiaoPairs(env)
      return json(200, {
        ok: true,
        paymentConfigured: creds.configured,
        channel: 'hujiao',
        credSource: creds.source,
        pairCount: creds.pairCount,
        meta: listed.meta,
        gateway: creds.gateway,
      })
    }
    return handleOrderStatus(request, env)
  }
  return null
}

export { makeSign, md5Hex, getHujiaoCreds, listHujiaoPairs, cleanCred }
