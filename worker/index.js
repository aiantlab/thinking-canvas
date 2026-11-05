import { handleAuthRoutes, assertCanGenerate, consumeGeneration } from './auth.js'
import { handlePayRoutes } from './pay.js'

/**
 * thinking-canvas Worker: SPA assets + SCAPI SCAPI image HMAC proxy.
 * Secrets: SUCHUANG_API_KEY, SUCHUANG_SIGN_KEY, FAL_KEY (optional for native mask inpaint)
 */

const MODEL_ENDPOINTS = {
  image_nanoBanana2Lite: 'https://api.scapi.net/api/async/image_nanoBanana2Lite',
  image_nanoBanana2: 'https://api.scapi.net/api/async/image_nanoBanana2',
  'NanoBanana2.1': 'https://api.scapi.net/api/async/NanoBanana2.1',
  image_nanoBanana_pro: 'https://api.scapi.net/api/async/image_nanoBanana_pro',
  'image_gpt_2.5': 'https://api.scapi.net/api/async/image_gpt_2.5',
}
const DEFAULT_SUBMIT = MODEL_ENDPOINTS.image_nanoBanana2Lite

function resolveSubmitUrl(body) {
  if (body && typeof body.endpoint === 'string' && body.endpoint.startsWith('https://api.scapi.net/api/async/')) {
    return body.endpoint
  }
  const model = body && typeof body.model === 'string' ? body.model : ''
  if (model && MODEL_ENDPOINTS[model]) return MODEL_ENDPOINTS[model]
  if (model && !model.includes('://')) {
    return `https://api.scapi.net/api/async/${model}`
  }
  return DEFAULT_SUBMIT
}

const DETAIL = 'https://api.scapi.net/api/async/detail'
const DEFAULT_SIZE = '4K'
const DEFAULT_ASPECT = '16:9'
const POLL_MS = 3000
const WORKER_POLL_BUDGET_MS = 22000

const DEMO_PUBLIC_MAP = {
  '/demo/line_sketch.png': 'https://canno3d.com/demo/line_sketch.png',
  '/demo/line_to_render.png': 'https://canno3d.com/demo/line_to_render.png',
  '/templates/facade_brick_render.webp': 'https://canno3d.com/templates/facade_brick_render.webp',
  '/templates/facade_brick_sketch.webp': 'https://canno3d.com/templates/facade_brick_sketch.webp',
  '/templates/facade_brick_thumb.webp': 'https://canno3d.com/templates/facade_brick_thumb.webp',
  '/templates/facade_glass_render.webp': 'https://canno3d.com/templates/facade_glass_render.webp',
  '/templates/facade_glass_sketch.webp': 'https://canno3d.com/templates/facade_glass_sketch.webp',
  '/templates/facade_glass_thumb.webp': 'https://canno3d.com/templates/facade_glass_thumb.webp',
  '/templates/facade_night_render.webp': 'https://canno3d.com/templates/facade_night_render.webp',
  '/templates/facade_night_sketch.webp': 'https://canno3d.com/templates/facade_night_sketch.webp',
  '/templates/facade_night_thumb.webp': 'https://canno3d.com/templates/facade_night_thumb.webp',
  '/templates/facade_white_render.webp': 'https://canno3d.com/templates/facade_white_render.webp',
  '/templates/facade_white_sketch.webp': 'https://canno3d.com/templates/facade_white_sketch.webp',
  '/templates/facade_white_thumb.webp': 'https://canno3d.com/templates/facade_white_thumb.webp',
  '/templates/int_bedroom_render.webp': 'https://canno3d.com/templates/int_bedroom_render.webp',
  '/templates/int_bedroom_sketch.webp': 'https://canno3d.com/templates/int_bedroom_sketch.webp',
  '/templates/int_bedroom_thumb.webp': 'https://canno3d.com/templates/int_bedroom_thumb.webp',
  '/templates/int_kitchen_render.webp': 'https://canno3d.com/templates/int_kitchen_render.webp',
  '/templates/int_kitchen_sketch.webp': 'https://canno3d.com/templates/int_kitchen_sketch.webp',
  '/templates/int_kitchen_thumb.webp': 'https://canno3d.com/templates/int_kitchen_thumb.webp',
  '/templates/int_living_render.webp': 'https://canno3d.com/templates/int_living_render.webp',
  '/templates/int_living_sketch.webp': 'https://canno3d.com/templates/int_living_sketch.webp',
  '/templates/int_living_thumb.webp': 'https://canno3d.com/templates/int_living_thumb.webp',
  '/templates/int_lobby_render.webp': 'https://canno3d.com/templates/int_lobby_render.webp',
  '/templates/int_lobby_sketch.webp': 'https://canno3d.com/templates/int_lobby_sketch.webp',
  '/templates/int_lobby_thumb.webp': 'https://canno3d.com/templates/int_lobby_thumb.webp',
  '/templates/land_garden_render.webp': 'https://canno3d.com/templates/land_garden_render.webp',
  '/templates/land_garden_sketch.webp': 'https://canno3d.com/templates/land_garden_sketch.webp',
  '/templates/land_garden_thumb.webp': 'https://canno3d.com/templates/land_garden_thumb.webp',
  '/templates/land_park_render.webp': 'https://canno3d.com/templates/land_park_render.webp',
  '/templates/land_park_sketch.webp': 'https://canno3d.com/templates/land_park_sketch.webp',
  '/templates/land_park_thumb.webp': 'https://canno3d.com/templates/land_park_thumb.webp',
  '/templates/land_plaza_render.webp': 'https://canno3d.com/templates/land_plaza_render.webp',
  '/templates/land_plaza_sketch.webp': 'https://canno3d.com/templates/land_plaza_sketch.webp',
  '/templates/land_plaza_thumb.webp': 'https://canno3d.com/templates/land_plaza_thumb.webp',
  '/templates/villa_render.webp': 'https://canno3d.com/templates/villa_render.webp',
  '/templates/villa_sketch.webp': 'https://canno3d.com/templates/villa_sketch.webp',
  '/templates/villa_thumb.webp': 'https://canno3d.com/templates/villa_thumb.webp',
  'facade_brick_render.webp': 'https://canno3d.com/templates/facade_brick_render.webp',
  'facade_brick_sketch.webp': 'https://canno3d.com/templates/facade_brick_sketch.webp',
  'facade_brick_thumb.webp': 'https://canno3d.com/templates/facade_brick_thumb.webp',
  'facade_glass_render.webp': 'https://canno3d.com/templates/facade_glass_render.webp',
  'facade_glass_sketch.webp': 'https://canno3d.com/templates/facade_glass_sketch.webp',
  'facade_glass_thumb.webp': 'https://canno3d.com/templates/facade_glass_thumb.webp',
  'facade_night_render.webp': 'https://canno3d.com/templates/facade_night_render.webp',
  'facade_night_sketch.webp': 'https://canno3d.com/templates/facade_night_sketch.webp',
  'facade_night_thumb.webp': 'https://canno3d.com/templates/facade_night_thumb.webp',
  'facade_white_render.webp': 'https://canno3d.com/templates/facade_white_render.webp',
  'facade_white_sketch.webp': 'https://canno3d.com/templates/facade_white_sketch.webp',
  'facade_white_thumb.webp': 'https://canno3d.com/templates/facade_white_thumb.webp',
  'int_bedroom_render.webp': 'https://canno3d.com/templates/int_bedroom_render.webp',
  'int_bedroom_sketch.webp': 'https://canno3d.com/templates/int_bedroom_sketch.webp',
  'int_bedroom_thumb.webp': 'https://canno3d.com/templates/int_bedroom_thumb.webp',
  'int_kitchen_render.webp': 'https://canno3d.com/templates/int_kitchen_render.webp',
  'int_kitchen_sketch.webp': 'https://canno3d.com/templates/int_kitchen_sketch.webp',
  'int_kitchen_thumb.webp': 'https://canno3d.com/templates/int_kitchen_thumb.webp',
  'int_living_render.webp': 'https://canno3d.com/templates/int_living_render.webp',
  'int_living_sketch.webp': 'https://canno3d.com/templates/int_living_sketch.webp',
  'int_living_thumb.webp': 'https://canno3d.com/templates/int_living_thumb.webp',
  'int_lobby_render.webp': 'https://canno3d.com/templates/int_lobby_render.webp',
  'int_lobby_sketch.webp': 'https://canno3d.com/templates/int_lobby_sketch.webp',
  'int_lobby_thumb.webp': 'https://canno3d.com/templates/int_lobby_thumb.webp',
  'land_garden_render.webp': 'https://canno3d.com/templates/land_garden_render.webp',
  'land_garden_sketch.webp': 'https://canno3d.com/templates/land_garden_sketch.webp',
  'land_garden_thumb.webp': 'https://canno3d.com/templates/land_garden_thumb.webp',
  'land_park_render.webp': 'https://canno3d.com/templates/land_park_render.webp',
  'land_park_sketch.webp': 'https://canno3d.com/templates/land_park_sketch.webp',
  'land_park_thumb.webp': 'https://canno3d.com/templates/land_park_thumb.webp',
  'land_plaza_render.webp': 'https://canno3d.com/templates/land_plaza_render.webp',
  'land_plaza_sketch.webp': 'https://canno3d.com/templates/land_plaza_sketch.webp',
  'land_plaza_thumb.webp': 'https://canno3d.com/templates/land_plaza_thumb.webp',
  'line_sketch.png': 'https://canno3d.com/demo/line_sketch.png',
  'line_to_render.png': 'https://canno3d.com/demo/line_to_render.png',
  'villa_render.webp': 'https://canno3d.com/templates/villa_render.webp',
  'villa_sketch.webp': 'https://canno3d.com/templates/villa_sketch.webp',
  'villa_thumb.webp': 'https://canno3d.com/templates/villa_thumb.webp',
  '/templates/line_basic_render.webp': 'https://canno3d.com/templates/line_basic_render.webp',
  'line_basic_render.webp': 'https://canno3d.com/templates/line_basic_render.webp',
  '/templates/line_basic_sketch.webp': 'https://canno3d.com/templates/line_basic_sketch.webp',
  'line_basic_sketch.webp': 'https://canno3d.com/templates/line_basic_sketch.webp',
  '/templates/line_basic_thumb.webp': 'https://canno3d.com/templates/line_basic_thumb.webp',
  'line_basic_thumb.webp': 'https://canno3d.com/templates/line_basic_thumb.webp',
  '/templates/plan_master_render.webp': 'https://canno3d.com/templates/plan_master_render.webp',
  'plan_master_render.webp': 'https://canno3d.com/templates/plan_master_render.webp',
  '/templates/plan_master_sketch.webp': 'https://canno3d.com/templates/plan_master_sketch.webp',
  'plan_master_sketch.webp': 'https://canno3d.com/templates/plan_master_sketch.webp',
  '/templates/plan_master_thumb.webp': 'https://canno3d.com/templates/plan_master_thumb.webp',
  'plan_master_thumb.webp': 'https://canno3d.com/templates/plan_master_thumb.webp',
  '/templates/facade_day_render.webp': 'https://canno3d.com/templates/facade_day_render.webp',
  'facade_day_render.webp': 'https://canno3d.com/templates/facade_day_render.webp',
  '/templates/facade_day_sketch.webp': 'https://canno3d.com/templates/facade_day_sketch.webp',
  'facade_day_sketch.webp': 'https://canno3d.com/templates/facade_day_sketch.webp',
  '/templates/facade_day_thumb.webp': 'https://canno3d.com/templates/facade_day_thumb.webp',
  'facade_day_thumb.webp': 'https://canno3d.com/templates/facade_day_thumb.webp',
  '/templates/aerial_block_render.webp': 'https://canno3d.com/templates/aerial_block_render.webp',
  'aerial_block_render.webp': 'https://canno3d.com/templates/aerial_block_render.webp',
  '/templates/aerial_block_sketch.webp': 'https://canno3d.com/templates/aerial_block_sketch.webp',
  'aerial_block_sketch.webp': 'https://canno3d.com/templates/aerial_block_sketch.webp',
  '/templates/aerial_block_thumb.webp': 'https://canno3d.com/templates/aerial_block_thumb.webp',
  'aerial_block_thumb.webp': 'https://canno3d.com/templates/aerial_block_thumb.webp',
  '/templates/int_office_render.webp': 'https://canno3d.com/templates/int_office_render.webp',
  'int_office_render.webp': 'https://canno3d.com/templates/int_office_render.webp',
  '/templates/int_office_sketch.webp': 'https://canno3d.com/templates/int_office_sketch.webp',
  'int_office_sketch.webp': 'https://canno3d.com/templates/int_office_sketch.webp',
  '/templates/int_office_thumb.webp': 'https://canno3d.com/templates/int_office_thumb.webp',
  'int_office_thumb.webp': 'https://canno3d.com/templates/int_office_thumb.webp',
  '/templates/int_dining_render.webp': 'https://canno3d.com/templates/int_dining_render.webp',
  'int_dining_render.webp': 'https://canno3d.com/templates/int_dining_render.webp',
  '/templates/int_dining_sketch.webp': 'https://canno3d.com/templates/int_dining_sketch.webp',
  'int_dining_sketch.webp': 'https://canno3d.com/templates/int_dining_sketch.webp',
  '/templates/int_dining_thumb.webp': 'https://canno3d.com/templates/int_dining_thumb.webp',
  'int_dining_thumb.webp': 'https://canno3d.com/templates/int_dining_thumb.webp',
  '/templates/land_water_render.webp': 'https://canno3d.com/templates/land_water_render.webp',
  'land_water_render.webp': 'https://canno3d.com/templates/land_water_render.webp',
  '/templates/land_water_sketch.webp': 'https://canno3d.com/templates/land_water_sketch.webp',
  'land_water_sketch.webp': 'https://canno3d.com/templates/land_water_sketch.webp',
  '/templates/land_water_thumb.webp': 'https://canno3d.com/templates/land_water_thumb.webp',
  'land_water_thumb.webp': 'https://canno3d.com/templates/land_water_thumb.webp',
  '/templates/land_court_render.webp': 'https://canno3d.com/templates/land_court_render.webp',
  'land_court_render.webp': 'https://canno3d.com/templates/land_court_render.webp',
  '/templates/land_court_sketch.webp': 'https://canno3d.com/templates/land_court_sketch.webp',
  'land_court_sketch.webp': 'https://canno3d.com/templates/land_court_sketch.webp',
  '/templates/land_court_thumb.webp': 'https://canno3d.com/templates/land_court_thumb.webp',
  'land_court_thumb.webp': 'https://canno3d.com/templates/land_court_thumb.webp',
  '/templates/demo_inpaint_render.webp': 'https://canno3d.com/templates/demo_inpaint_render.webp',
  'demo_inpaint_render.webp': 'https://canno3d.com/templates/demo_inpaint_render.webp',
  '/templates/demo_inpaint_sketch.webp': 'https://canno3d.com/templates/demo_inpaint_sketch.webp',
  'demo_inpaint_sketch.webp': 'https://canno3d.com/templates/demo_inpaint_sketch.webp',
  '/templates/demo_inpaint_thumb.webp': 'https://canno3d.com/templates/demo_inpaint_thumb.webp',
  'demo_inpaint_thumb.webp': 'https://canno3d.com/templates/demo_inpaint_thumb.webp',
  '/templates/demo_material_render.webp': 'https://canno3d.com/templates/demo_material_render.webp',
  'demo_material_render.webp': 'https://canno3d.com/templates/demo_material_render.webp',
  '/templates/demo_material_sketch.webp': 'https://canno3d.com/templates/demo_material_sketch.webp',
  'demo_material_sketch.webp': 'https://canno3d.com/templates/demo_material_sketch.webp',
  '/templates/demo_material_thumb.webp': 'https://canno3d.com/templates/demo_material_thumb.webp',
  'demo_material_thumb.webp': 'https://canno3d.com/templates/demo_material_thumb.webp',
  '/templates/demo_multiview_render.webp': 'https://canno3d.com/templates/demo_multiview_render.webp',
  'demo_multiview_render.webp': 'https://canno3d.com/templates/demo_multiview_render.webp',
  '/templates/demo_multiview_sketch.webp': 'https://canno3d.com/templates/demo_multiview_sketch.webp',
  'demo_multiview_sketch.webp': 'https://canno3d.com/templates/demo_multiview_sketch.webp',
  '/templates/demo_multiview_thumb.webp': 'https://canno3d.com/templates/demo_multiview_thumb.webp',
  'demo_multiview_thumb.webp': 'https://canno3d.com/templates/demo_multiview_thumb.webp',
  '/templates/plan_floor_render.webp': 'https://canno3d.com/templates/plan_floor_render.webp',
  'plan_floor_render.webp': 'https://canno3d.com/templates/plan_floor_render.webp',
  '/templates/plan_floor_sketch.webp': 'https://canno3d.com/templates/plan_floor_sketch.webp',
  'plan_floor_sketch.webp': 'https://canno3d.com/templates/plan_floor_sketch.webp',
  '/templates/plan_floor_thumb.webp': 'https://canno3d.com/templates/plan_floor_thumb.webp',
  'plan_floor_thumb.webp': 'https://canno3d.com/templates/plan_floor_thumb.webp'
}

/** Old cached scapi.net demo hashes → live canno3d.com demos */
const LEGACY_DEMO_URL_REWRITE = {
  'https://scapi.net/b2462737c7c140819e801978b50882b3.png':
    'https://canno3d.com/demo/line_sketch.png',
  'https://scapi.net/febcfbdb46f2410ba953d00ee88e00f0.png':
    'https://canno3d.com/demo/line_to_render.png',
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(),
    },
  })
}

async function hmacSign(key, secret) {
  const ts = String(Math.floor(Date.now() / 1000))
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    enc.encode(`key=${key}&timestamp=${ts}`),
  )
  const sign = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Authorization: key,
    'X-Api-Key': key,
    'X-Api-Timestamp': ts,
    'X-Api-Sign': sign,
    Origin: 'https://api.scapi.net',
    Referer: 'https://api.scapi.net/doc/65',
  }
}

async function scapiFetch(method, url, key, secret, body) {
  const headers = await hmacSign(key, secret)
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { code: res.status, msg: text.slice(0, 300) || '非 JSON 响应' }
  }
  return { ok: res.ok, status: res.status, json: parsed }
}

function extractImageUrl(data) {
  if (!data || typeof data !== 'object') return undefined
  const result = data.result
  if (typeof result === 'string' && result.startsWith('http')) return result
  if (Array.isArray(result) && result.length) {
    const first = result[0]
    if (typeof first === 'string' && first.startsWith('http')) return first
    if (first && typeof first === 'object') {
      for (const k of ['url', 'image_url', 'image']) {
        if (typeof first[k] === 'string' && first[k].startsWith('http')) {
          return first[k]
        }
      }
    }
  }
  if (result && typeof result === 'object') {
    for (const k of ['image_url', 'url', 'image', 'output']) {
      if (typeof result[k] === 'string' && result[k].startsWith('http')) {
        return result[k]
      }
    }
  }
  return undefined
}

function rewriteDemoUrl(u) {
  if (typeof u !== 'string') return u
  if (LEGACY_DEMO_URL_REWRITE[u]) return LEGACY_DEMO_URL_REWRITE[u]
  // bare /demo path
  if (u.startsWith('/demo/') || u.startsWith('/templates/')) {
    return DEMO_PUBLIC_MAP[u] || `https://canno3d.com${u}`
  }
  return u
}

function resolveUrls(body) {
  const out = []
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(rewriteDemoUrl(u))
      else if (typeof u === 'string' && (u.startsWith('/demo/') || u.startsWith('/templates/'))) out.push(rewriteDemoUrl(u))
    }
  }
  if (typeof body.refUrl === 'string' && /^https?:\/\//i.test(body.refUrl)) {
    out.push(rewriteDemoUrl(body.refUrl))
  }
  if (typeof body.refPath === 'string' && body.refPath.trim()) {
    const hit =
      DEMO_PUBLIC_MAP[body.refPath] ||
      DEMO_PUBLIC_MAP[body.refPath.replace(/^\//, '')] ||
      (body.refPath.startsWith('/demo/') ? `https://canno3d.com${body.refPath}` : null)
    if (hit) out.push(hit)
  }
  const uniq = [...new Set(out)]
  return uniq.length ? uniq : undefined
}

async function pollUntilDone(taskId, key, secret, budgetMs) {
  const t0 = Date.now()
  let last = {}
  while (Date.now() - t0 < budgetMs) {
    const url = `${DETAIL}?key=${encodeURIComponent(key)}&id=${encodeURIComponent(taskId)}`
    const { json } = await scapiFetch('GET', url, key, secret)
    last = json
    const data = json.data ?? {}
    const imageUrl = extractImageUrl(data)
    if (imageUrl) return { imageUrl, taskId, raw: json }
    const st = data.status
    if (
      st === 3 ||
      st === '3' ||
      st === 'fail' ||
      st === 'failed' ||
      st === 'error'
    ) {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        (typeof json.msg === 'string' && json.msg) ||
        '生图生成失败'
      return { taskId, raw: json, error: msg }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  return { taskId, raw: last, pending: true }
}

async function handleGenerate(request, env) {
  const key = (env.SUCHUANG_API_KEY || '').trim()
  const secret = (env.SUCHUANG_SIGN_KEY || '').trim()
  if (!key || !secret) {
    return json(503, {
      error: '生图服务暂不可用，请稍后重试。',
      code: 'NO_KEYS',
    })
  }
  // Guard against connector redaction placeholders
  if (key.length < 16 || secret.length < 16 || key.startsWith('[R')) {
    return json(503, {
      error: '生图服务配置异常，请联系管理员。',
      code: 'BAD_KEYS',
      keyLen: key.length,
      secretLen: secret.length,
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return json(400, { error: '缺少 prompt' })

  const size = String(body.size || DEFAULT_SIZE).toUpperCase()
  // NanoBanana2 Lite only supports 1K
  const sizeForced =
    body.model === 'image_nanoBanana2Lite' || /image_nanoBanana2Lite/.test(String(body.endpoint || ''))
      ? '1K'
      : size
  const sizeFinal = sizeForced

  const gate = await assertCanGenerate(request, env, { size: sizeFinal, amount: 1 })
  if (!gate.ok) return gate.errorResponse
  const rawAspect = body.aspectRatio
  const urls = resolveUrls(body)
  const submitBase = resolveSubmitUrl(body)
  // NanoBanana2.1 / GPT 2.5 reject unbound `size` on SCAPI
  const omitSize =
    /\/(NanoBanana2\.1|image_gpt_2\.5)(\?|$)/.test(submitBase) ||
    body.model === 'NanoBanana2.1' ||
    body.model === 'image_gpt_2.5'
  // Explicit ratio → send; 'auto' / empty / absent → omit (let SCAPI infer)
  const useAspect =
    typeof rawAspect === 'string' &&
    rawAspect.trim() !== '' &&
    rawAspect.trim().toLowerCase() !== 'auto'
  const payload = omitSize ? { prompt } : { prompt, size: sizeFinal }
  if (useAspect) payload.aspectRatio = String(rawAspect).trim()
  // SCAPI rejects unbound `n` on these image models — multi-count is done client-side
  // by repeating submit. Never forward n/count into the SCAPI body.
  if (urls) payload.urls = urls

  
  const submitUrl = `${submitBase}?key=${encodeURIComponent(key)}`
  const { json: submitted } = await scapiFetch(
    'POST',
    submitUrl,
    key,
    secret,
    payload,
  )
  const code = submitted.code
  if (code !== 200 && code !== '200') {
    const msg =
      (typeof submitted.msg === 'string' && submitted.msg) || '生图提交失败'
    return json(502, { error: msg, raw: submitted })
  }
  const data = submitted.data ?? {}
  const taskId =
    (typeof data.id === 'string' && data.id) ||
    (typeof data.task_id === 'string' && data.task_id) ||
    ''
  if (!taskId) return json(502, { error: '未返回 task id', raw: submitted })

  let entitlementAfter = gate.entitlement
  try {
    entitlementAfter = await consumeGeneration(env, gate.user.email, 1)
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

  const wait = body.wait !== false
  if (!wait) {
    return json(200, { taskId, imageUrl: null, submitted: true, entitlement: entitlementAfter })
  }

  const polled = await pollUntilDone(
    taskId,
    key,
    secret,
    WORKER_POLL_BUDGET_MS,
  )
  if (polled.error) {
    let errMsg = polled.error
    if (/google\s*gemini|gemini.*timeout|timeout.*gemini/i.test(String(errMsg))) {
      errMsg =
        '上游 Google Gemini 超时，请稍后重试，或改用 NanoBanana2 Lite / 更低分辨率。'
    }
    return json(502, { error: errMsg, taskId, raw: polled.raw, code: 'UPSTREAM_FAIL' })
  }
  if (polled.imageUrl) {
    return json(200, { imageUrl: polled.imageUrl, taskId })
  }
  return json(200, {
    taskId,
    imageUrl: null,
    pending: true,
    raw: polled.raw,
  })
}

async function handleDetail(request, env) {
  const key = (env.SUCHUANG_API_KEY || '').trim()
  const secret = (env.SUCHUANG_SIGN_KEY || '').trim()
  if (!key || !secret) {
    return json(503, {
      error: '生图服务暂不可用，请稍后重试。',
      code: 'NO_KEYS',
    })
  }
  const u = new URL(request.url)
  const id = u.searchParams.get('id') || ''
  if (!id) return json(400, { error: '缺少 id' })
  const detailUrl = `${DETAIL}?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`
  const { json: raw } = await scapiFetch('GET', detailUrl, key, secret)
  const data = raw.data ?? {}
  const imageUrl = extractImageUrl(data)
  const st = data.status
  const failed =
    st === 3 || st === '3' || st === 'fail' || st === 'failed' || st === 'error'
  let error = null
  if (failed) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      (typeof raw.msg === 'string' && raw.msg) ||
      '生图生成失败'
    if (/google\s*gemini|gemini.*timeout|timeout.*gemini/i.test(msg)) {
      error =
        '上游 Google Gemini 超时，请稍后重试，或改用 NanoBanana2 Lite / 更低分辨率。'
    } else {
      error = msg
    }
  }
  return json(200, {
    taskId: id,
    status: data.status ?? null,
    imageUrl: imageUrl ?? null,
    error,
    raw,
  })
}


const IMAGE_PROXY_HOSTS = new Set(['scapi.net', 'www.scapi.net', 'api.scapi.net', 'cdn.scapi.net'])

function isAllowedImageUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (IMAGE_PROXY_HOSTS.has(host)) return true
    // allow same-account worker demo assets when passed as absolute URL
    if (host.endsWith('.workers.dev') && (host.startsWith('thinking-canvas.') || host.startsWith('canno.'))) {
      return u.pathname.startsWith('/demo/') || u.pathname.startsWith('/assets/')
    }
    return false
  } catch {
    return false
  }
}

async function handleImageProxy(request) {
  const u = new URL(request.url)
  const target = u.searchParams.get('url') || ''
  const filenameRaw = u.searchParams.get('filename') || 'canno-download.png'
  const filename = filenameRaw.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120) || 'canno-download.png'
  if (!target || !isAllowedImageUrl(target)) {
    return json(400, { error: 'url not allowed', code: 'BAD_URL' })
  }
  const upstream = await fetch(target, {
    method: 'GET',
    headers: {
      Accept: 'image/*,*/*',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  })
  if (!upstream.ok) {
    return json(upstream.status === 404 ? 404 : 502, {
      error: `upstream ${upstream.status}`,
      code: 'UPSTREAM',
    })
  }
  const ctype = upstream.headers.get('Content-Type') || 'application/octet-stream'
  const buf = await upstream.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': ctype,
      'Content-Length': String(buf.byteLength),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=60',
      ...corsHeaders(),
    },
  })
}



const FAL_FILL_ENDPOINT = 'https://queue.fal.run/fal-ai/flux-pro/v1/fill'
const FAL_POLL_MS = 2500
const FAL_POLL_BUDGET_MS = 55000
const TEMP_TTL_SECONDS = 900

/** @type {Map<string, {bytes: Uint8Array, ctype: string, exp: number}>} */
const tempImageStore = new Map()

function purgeExpiredTemp() {
  const now = Date.now()
  for (const [id, v] of tempImageStore) {
    if (v.exp < now) tempImageStore.delete(id)
  }
}

function parseDataUrlOrBase64(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const s = raw.trim()
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(s)
  if (m) {
    const ctype = (m[1] || 'image/png').split(';')[0] || 'image/png'
    const b64 = m[2] ? m[3] : btoa(m[3])
    try {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return { bytes, ctype }
    } catch {
      return null
    }
  }
  // raw base64
  try {
    const bin = atob(s.replace(/\s+/g, ''))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { bytes, ctype: 'image/png' }
  } catch {
    return null
  }
}

function storeTempImage(bytes, ctype, requestUrl) {
  purgeExpiredTemp()
  const id = crypto.randomUUID().replace(/-/g, '')
  tempImageStore.set(id, {
    bytes,
    ctype: ctype || 'image/png',
    exp: Date.now() + TEMP_TTL_SECONDS * 1000,
  })
  const origin = new URL(requestUrl).origin
  // Prefer canno3d.com when request is via EdgeOne / workers.dev alias
  const host = new URL(requestUrl).hostname
  const publicOrigin =
    host === 'thinking-canvas.yeahsky.workers.dev' || host.endsWith('.workers.dev')
      ? 'https://canno3d.com'
      : origin
  return { id, url: `${publicOrigin}/api/temp/${id}` }
}

async function falUploadBytes(falKey, bytes, ctype) {
  // Two-step fal CDN upload
  const initRes = await fetch(
    'https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        content_type: ctype || 'image/png',
        file_name: `canno-mask-${Date.now()}.png`,
      }),
    },
  )
  const initText = await initRes.text()
  let initJson = {}
  try {
    initJson = initText ? JSON.parse(initText) : {}
  } catch {
    initJson = {}
  }
  if (!initRes.ok) {
    throw new Error(
      (initJson.detail && String(initJson.detail)) ||
        (initJson.message && String(initJson.message)) ||
        `upload failed (${initRes.status})`,
    )
  }
  const uploadUrl = initJson.upload_url || initJson.uploadUrl
  const fileUrl = initJson.file_url || initJson.fileUrl || initJson.url
  if (!uploadUrl) {
    throw new Error('upload failed')
  }
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': ctype || 'image/png',
    },
    body: bytes,
  })
  if (!putRes.ok) {
    throw new Error(`upload failed (${putRes.status})`)
  }
  if (fileUrl && /^https?:\/\//i.test(fileUrl)) return fileUrl
  // Some responses only return file_url after PUT via nested field
  const after = initJson.file_url || initJson.fileUrl
  if (after && /^https?:\/\//i.test(after)) return after
  throw new Error('upload failed')
}

async function resolveToHttpsUrl(opts) {
  const { falKey, requestUrl, url, base64, preferTemp } = opts
  if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
    return rewriteDemoUrl(url.trim())
  }
  if (typeof url === 'string' && url.startsWith('/demo/')) {
    return rewriteDemoUrl(url)
  }
  const parsed = parseDataUrlOrBase64(base64 || url)
  if (!parsed) return null

  // Prefer Fal CDN when key present (durable for Fal runners)
  if (falKey && !preferTemp) {
    try {
      return await falUploadBytes(falKey, parsed.bytes, parsed.ctype)
    } catch (e) {
      // fall through to Worker temp host
      console.log('fal upload fallback to temp', String(e && e.message ? e.message : e).slice(0, 120))
    }
  }
  const stored = storeTempImage(parsed.bytes, parsed.ctype, requestUrl)
  return stored.url
}

async function falQueueSubmit(falKey, payload) {
  const res = await fetch(FAL_FILL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let parsed = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text.slice(0, 400) }
  }
  return { ok: res.ok, status: res.status, json: parsed }
}

async function falQueueStatus(falKey, statusUrl) {
  const res = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      Authorization: `Key ${falKey}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  let parsed = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text.slice(0, 400) }
  }
  return { ok: res.ok, status: res.status, json: parsed }
}

async function falQueueResult(falKey, responseUrl) {
  const res = await fetch(responseUrl, {
    method: 'GET',
    headers: {
      Authorization: `Key ${falKey}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  let parsed = {}
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text.slice(0, 400) }
  }
  return { ok: res.ok, status: res.status, json: parsed }
}

function extractFalImageUrl(resultJson) {
  if (!resultJson || typeof resultJson !== 'object') return null
  const images = resultJson.images
  if (Array.isArray(images) && images[0]) {
    const first = images[0]
    if (typeof first === 'string' && first.startsWith('http')) return first
    if (first && typeof first.url === 'string' && first.url.startsWith('http')) return first.url
  }
  if (typeof resultJson.image === 'object' && resultJson.image?.url) return resultJson.image.url
  if (typeof resultJson.image_url === 'string') return resultJson.image_url
  return null
}

async function pollFalUntilDone(falKey, statusUrl, responseUrl, budgetMs) {
  const t0 = Date.now()
  let last = {}
  while (Date.now() - t0 < budgetMs) {
    const st = await falQueueStatus(falKey, statusUrl)
    last = st.json
    const status = String(st.json.status || '').toUpperCase()
    if (status === 'COMPLETED') {
      const result = await falQueueResult(falKey, responseUrl)
      const imageUrl = extractFalImageUrl(result.json)
      if (imageUrl) return { imageUrl, raw: result.json }
      return { error: '局部重绘未返回图片，请稍后重试。', raw: result.json }
    }
    if (status === 'FAILED' || status === 'CANCELLED' || status === 'ERROR') {
      const msg =
        (typeof st.json.error === 'string' && st.json.error) ||
        (typeof st.json.detail === 'string' && st.json.detail) ||
        '局部重绘失败'
      return { error: msg, raw: st.json }
    }
    await new Promise((r) => setTimeout(r, FAL_POLL_MS))
  }
  return { pending: true, raw: last }
}

async function handleTempGet(request, id) {
  purgeExpiredTemp()
  const item = tempImageStore.get(id)
  if (!item) {
    return json(404, { error: 'temp image expired or missing', code: 'TEMP_GONE' })
  }
  return new Response(item.bytes, {
    status: 200,
    headers: {
      'Content-Type': item.ctype || 'image/png',
      'Cache-Control': 'public, max-age=600',
      ...corsHeaders(),
    },
  })
}

async function handleInpaint(request, env) {
  const falKey = (env.FAL_KEY || '').trim()
  if (!falKey || falKey.length < 8 || falKey.startsWith('[R')) {
    return json(503, {
      error: '局部重绘暂不可用，请稍后重试。',
      code: 'NO_FAL_KEY',
      engine: null,
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return json(400, { error: '缺少 prompt', code: 'BAD_PROMPT' })

  const gate = await assertCanGenerate(request, env, { size: '1K', amount: 1 })
  if (!gate.ok) return gate.errorResponse

  let imageUrl
  let maskUrl
  try {
    imageUrl = await resolveToHttpsUrl({
      falKey,
      requestUrl: request.url,
      url: body.imageUrl,
      base64: body.imageBase64 || body.imageDataUrl,
    })
    maskUrl = await resolveToHttpsUrl({
      falKey,
      requestUrl: request.url,
      url: body.maskUrl,
      base64: body.maskBase64 || body.maskDataUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json(502, { error: message.slice(0, 300), code: 'UPLOAD_FAIL' })
  }

  if (!imageUrl) return json(400, { error: '缺少 imageUrl / imageBase64', code: 'BAD_IMAGE' })
  if (!maskUrl) return json(400, { error: '缺少 maskUrl / maskBase64', code: 'BAD_MASK' })

  const payload = {
    prompt,
    image_url: imageUrl,
    mask_url: maskUrl,
    output_format: 'png',
    num_images: 1,
    safety_tolerance: '2',
    enhance_prompt: false,
  }
  if (typeof body.seed === 'number' && Number.isFinite(body.seed)) {
    payload.seed = Math.floor(body.seed)
  }

  const submitted = await falQueueSubmit(falKey, payload)
  if (!submitted.ok) {
    const msg =
      (typeof submitted.json.detail === 'string' && submitted.json.detail) ||
      (typeof submitted.json.message === 'string' && submitted.json.message) ||
      (typeof submitted.json.error === 'string' && submitted.json.error) ||
      `inpaint submit failed (${submitted.status})`
    // Billing / auth hints without leaking key
    let code = 'FAL_SUBMIT_FAIL'
    if (submitted.status === 401 || submitted.status === 403) code = 'FAL_AUTH'
    if (submitted.status === 402 || /credit|balance|billing|payment/i.test(String(msg))) {
      code = 'FAL_BILLING'
    }
    return json(502, { error: String(msg).slice(0, 400), code, raw: submitted.json, engine: 'fal-flux-fill' })
  }

  const requestId =
    (typeof submitted.json.request_id === 'string' && submitted.json.request_id) ||
    (typeof submitted.json.requestId === 'string' && submitted.json.requestId) ||
    ''
  const statusUrl =
    (typeof submitted.json.status_url === 'string' && submitted.json.status_url) ||
    (requestId ? `https://queue.fal.run/fal-ai/flux-pro/v1/fill/requests/${requestId}/status` : '')
  const responseUrl =
    (typeof submitted.json.response_url === 'string' && submitted.json.response_url) ||
    (requestId ? `https://queue.fal.run/fal-ai/flux-pro/v1/fill/requests/${requestId}` : '')

  if (!requestId || !statusUrl || !responseUrl) {
    return json(502, {
      error: '局部重绘暂不可用，请稍后重试。',
      code: 'FAL_NO_ID',
      raw: submitted.json,
      engine: 'fal-flux-fill',
    })
  }

  let entitlementAfter = gate.entitlement
  try {
    entitlementAfter = await consumeGeneration(env, gate.user.email, 1)
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

  const wait = body.wait !== false
  if (!wait) {
    return json(200, {
      requestId,
      statusUrl,
      responseUrl,
      imageUrl: null,
      submitted: true,
      entitlement: entitlementAfter,
      engine: 'fal-flux-fill',
      nativeMask: true,
    })
  }

  const polled = await pollFalUntilDone(falKey, statusUrl, responseUrl, FAL_POLL_BUDGET_MS)
  if (polled.error) {
    return json(502, {
      error: polled.error,
      code: 'FAL_FAIL',
      requestId,
      raw: polled.raw,
      engine: 'fal-flux-fill',
    })
  }
  if (polled.imageUrl) {
    return json(200, {
      imageUrl: polled.imageUrl,
      requestId,
      engine: 'fal-flux-fill',
      nativeMask: true,
    })
  }
  return json(200, {
    requestId,
    statusUrl,
    responseUrl,
    imageUrl: null,
    pending: true,
    engine: 'fal-flux-fill',
    nativeMask: true,
    raw: polled.raw,
  })
}

async function handleInpaintStatus(request, env) {
  const falKey = (env.FAL_KEY || '').trim()
  if (!falKey) {
    return json(503, { error: '局部重绘暂不可用，请稍后重试。', code: 'NO_FAL_KEY' })
  }
  const u = new URL(request.url)
  const requestId = u.searchParams.get('id') || u.searchParams.get('requestId') || ''
  let statusUrl = u.searchParams.get('statusUrl') || ''
  let responseUrl = u.searchParams.get('responseUrl') || ''
  if (!requestId && !statusUrl) {
    return json(400, { error: '缺少 id', code: 'BAD_ID' })
  }
  if (!statusUrl && requestId) {
    statusUrl = `https://queue.fal.run/fal-ai/flux-pro/v1/fill/requests/${requestId}/status`
  }
  if (!responseUrl && requestId) {
    responseUrl = `https://queue.fal.run/fal-ai/flux-pro/v1/fill/requests/${requestId}`
  }

  const st = await falQueueStatus(falKey, statusUrl)
  const status = String(st.json.status || '').toUpperCase()
  if (status === 'COMPLETED') {
    const result = await falQueueResult(falKey, responseUrl)
    const imageUrl = extractFalImageUrl(result.json)
    if (!imageUrl) {
      return json(502, {
        error: '局部重绘未返回图片，请稍后重试。',
        code: 'FAL_NO_IMAGE',
        requestId,
        raw: result.json,
        engine: 'fal-flux-fill',
      })
    }
    return json(200, {
      requestId,
      status: 'COMPLETED',
      imageUrl,
      engine: 'fal-flux-fill',
      nativeMask: true,
    })
  }
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'ERROR') {
    const msg =
      (typeof st.json.error === 'string' && st.json.error) ||
      (typeof st.json.detail === 'string' && st.json.detail) ||
      '局部重绘失败'
    return json(502, {
      error: msg,
      code: 'FAL_FAIL',
      requestId,
      status,
      raw: st.json,
      engine: 'fal-flux-fill',
    })
  }
  return json(200, {
    requestId,
    status: status || 'IN_QUEUE',
    imageUrl: null,
    pending: true,
    engine: 'fal-flux-fill',
    nativeMask: true,
  })
}



function guessAssetMime(pathname) {
  const path = (pathname || '/').split('?')[0].toLowerCase()
  if (path === '/' || path.endsWith('.html') || !path.includes('.')) {
    return 'text/html; charset=utf-8'
  }
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return 'application/javascript; charset=utf-8'
  }
  if (path.endsWith('.css')) return 'text/css; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.json') || path.endsWith('.map')) return 'application/json; charset=utf-8'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.gif')) return 'image/gif'
  if (path.endsWith('.woff2')) return 'font/woff2'
  if (path.endsWith('.woff')) return 'font/woff'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return null
}

async function serveStaticAsset(request, env) {
  const res = await env.ASSETS.fetch(request)
  const mime = guessAssetMime(new URL(request.url).pathname)
  if (!mime) return res
  const ct = (res.headers.get('Content-Type') || '').toLowerCase()
  // Fix wrong/missing types that break ES modules / HTML parsing (white screen).
  if (!ct || ct.includes('octet-stream') || ct === 'text/plain' || (mime.startsWith('text/html') && !ct.includes('text/html')) || (mime.includes('javascript') && !ct.includes('javascript'))) {
    const headers = new Headers(res.headers)
    headers.set('Content-Type', mime)
    headers.set('X-Content-Type-Options', 'nosniff')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  }
  return res
}


export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS preflight for every API surface (canno → thinking-canvas cross-origin)
    if (request.method === 'OPTIONS') {
      if (
        path.startsWith('/api/') ||
        path.startsWith('/__canno_')
      ) {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
    }
    if ((path === '/__canno_run' || path === '/__canno_api') && request.method === 'POST') {
      try {
        return await handleGenerate(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }
    if ((path === '/__canno_poll' || path === '/__canno_detail') && request.method === 'GET') {
      try {
        return await handleDetail(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if (path.startsWith('/api/scapi/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
      try {
        if (path.startsWith('/api/scapi/detail') && request.method === 'GET') {
          return await handleDetail(request, env)
        }
        if (request.method === 'POST') {
          return await handleGenerate(request, env)
        }
        return json(404, { error: 'unknown scapi route' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if (path === '/__canno_ping') {
      if (request.method === 'POST') {
        try {
          const clone = request.clone()
          const body = await clone.json().catch(() => null)
          if (body && typeof body === 'object' && typeof body.prompt === 'string' && body.prompt.trim()) {
            return await handleGenerate(request, env)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return json(500, { error: message.slice(0, 400) })
        }
      }
      return json(200, { ok: true, method: request.method, hasKeys: !!(env.SUCHUANG_API_KEY && env.SUCHUANG_SIGN_KEY) })
    }
    if ((path === '/__canno_poll' || path === '/__canno_detail') && request.method === 'GET') {
      try {
        return await handleDetail(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }
    if ((path === '/__canno_run' || path === '/__canno_api') && request.method === 'POST') {
      try {
        return await handleGenerate(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    // Pay (虎皮椒 / packs)
    if (path.startsWith('/api/pay/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
      try {
        const payRes = await handlePayRoutes(request, env, path)
        if (payRes) return payRes
        return json(404, { error: 'unknown pay route', code: 'NOT_FOUND' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    // Auth (D1; captcha disabled)
    if (path.startsWith('/api/auth/') || path.startsWith('/api/captcha/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
      try {
        const authRes = await handleAuthRoutes(request, env, path)
        if (authRes) return authRes
        return json(404, { error: 'unknown auth route', code: 'NOT_FOUND' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if ((path === '/api/image-proxy' || path.startsWith('/api/image-proxy/')) && (request.method === 'GET' || request.method === 'HEAD')) {
      try {
        return await handleImageProxy(request)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }


    if (path.startsWith('/api/temp/') && (request.method === 'GET' || request.method === 'HEAD')) {
      try {
        const id = path.slice('/api/temp/'.length).split('/')[0]
        if (!id) return json(400, { error: 'missing temp id' })
        return await handleTempGet(request, id)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if (path === '/api/inpaint' && request.method === 'POST') {
      try {
        return await handleInpaint(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400), code: 'INPAINT_CRASH' })
      }
    }

    if ((path === '/api/inpaint/status' || path === '/api/inpaint/detail') && request.method === 'GET') {
      try {
        return await handleInpaintStatus(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if (!env.ASSETS) {
      return new Response('ASSETS binding missing', { status: 500 })
    }
    return serveStaticAsset(request, env)
  },
}
