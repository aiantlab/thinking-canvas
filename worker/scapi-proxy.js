/**
 * Cloudflare Worker: static ASSETS + SCAPI image proxy.
 * Secrets: SUCHUANG_API_KEY, SUCHUANG_SIGN_KEY (Worker secret_text bindings).
 * Mirrors local Vite middleware in scapiVitePlugin.ts.
 */


const MODEL_ENDPOINTS = {
  image_nanoBanana2Lite: 'https://api.scapi.net/api/async/image_nanoBanana2Lite',
  image_nanoBanana2: 'https://api.scapi.net/api/async/image_nanoBanana2',
  'NanoBanana2.1': 'https://api.scapi.net/api/async/NanoBanana2.1',
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
const POLL_MS = 4000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

/** Same mapping as Vite plugin via output/line_to_render_meta.json */
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

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function getKeys(env) {
  const key = (env.SUCHUANG_API_KEY || '').trim()
  const secret = (env.SUCHUANG_SIGN_KEY || '').trim()
  if (!key || !secret) return null
  return { key, secret }
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function signHeaders(key, secret) {
  const ts = String(Math.floor(Date.now() / 1000))
  const sign = await hmacSha256Hex(secret, `key=${key}&timestamp=${ts}`)
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

function resolveUrls(body) {
  const out = []
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u)
    }
  }
  if (typeof body.refUrl === 'string' && /^https?:\/\//i.test(body.refUrl)) {
    out.push(body.refUrl)
  }
  if (typeof body.refPath === 'string' && body.refPath.trim()) {
    const hit =
      DEMO_PUBLIC_MAP[body.refPath] || DEMO_PUBLIC_MAP[body.refPath.replace(/^\//, '')]
    if (hit) out.push(hit)
  }
  const uniq = [...new Set(out)]
  return uniq.length ? uniq : undefined
}

function extractImageUrl(data) {
  if (!data || typeof data !== 'object') return undefined
  const d = data
  const result = d.result
  if (typeof result === 'string' && result.startsWith('http')) return result
  if (Array.isArray(result) && result.length) {
    const first = result[0]
    if (typeof first === 'string' && first.startsWith('http')) return first
    if (first && typeof first === 'object') {
      for (const k of ['url', 'image_url', 'image']) {
        if (typeof first[k] === 'string' && first[k].startsWith('http')) return first[k]
      }
    }
  }
  if (result && typeof result === 'object') {
    for (const k of ['image_url', 'url', 'image', 'output']) {
      if (typeof result[k] === 'string' && result[k].startsWith('http')) return result[k]
    }
  }
  return undefined
}

async function scapiFetch(method, url, key, secret, body) {
  const res = await fetch(url, {
    method,
    headers: await signHeaders(key, secret),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { code: res.status, msg: text.slice(0, 300) || '非 JSON 响应' }
  }
  return { ok: res.ok, status: res.status, json }
}

async function sleep(ms) {
  if (typeof scheduler !== 'undefined' && scheduler.wait) {
    await scheduler.wait(ms)
  } else {
    await new Promise((r) => setTimeout(r, ms))
  }
}

async function pollUntilDone(taskId, key, secret) {
  const t0 = Date.now()
  let last = {}
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    const url = `${DETAIL}?key=${encodeURIComponent(key)}&id=${encodeURIComponent(taskId)}`
    const { json } = await scapiFetch('GET', url, key, secret)
    last = json
    const data = json.data ?? {}
    const imageUrl = extractImageUrl(data)
    if (imageUrl) return { imageUrl, taskId, raw: json }
    const st = data.status
    if (st === 3 || st === '3' || st === 'fail' || st === 'failed' || st === 'error') {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        (typeof json.msg === 'string' && json.msg) ||
        '生图生成失败'
      return { taskId, raw: json, error: msg }
    }
    await sleep(POLL_MS)
  }
  return { taskId, raw: last, error: '生成超时，请稍后重试' }
}

async function handleScapi(request, env) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const keys = getKeys(env)
  if (!keys) {
    return jsonResponse(503, {
      error: '生图服务暂不可用，请稍后重试。',
      code: 'NO_KEYS',
    })
  }

  if (url.pathname.startsWith('/api/scapi/detail') && request.method === 'GET') {
    const id = url.searchParams.get('id') || ''
    if (!id) return jsonResponse(400, { error: '缺少 id' })
    const detailUrl = `${DETAIL}?key=${encodeURIComponent(keys.key)}&id=${encodeURIComponent(id)}`
    const { json } = await scapiFetch('GET', detailUrl, keys.key, keys.secret)
    const data = json.data ?? {}
    const imageUrl = extractImageUrl(data)
    return jsonResponse(200, {
      taskId: id,
      status: data.status ?? null,
      imageUrl: imageUrl ?? null,
      raw: json,
    })
  }

  if (url.pathname.startsWith('/api/scapi/generate') && request.method === 'POST') {
    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return jsonResponse(400, { error: '缺少 prompt' })

        const size = String(body.size || DEFAULT_SIZE).toUpperCase()
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
    const payload = omitSize ? { prompt } : { prompt, size }
    if (useAspect) payload.aspectRatio = String(rawAspect).trim()
    // forward image count when present (SCAPI `n`, clamp 1–3)
    const nRaw = body.n ?? body.count
    const nNum = typeof nRaw === 'number' ? nRaw : Number(nRaw)
    if (Number.isFinite(nNum) && nNum >= 1 && nNum <= 3) {
      payload.n = Math.floor(nNum)
    }
    if (urls) payload.urls = urls
    const submitUrl = `${submitBase}?key=${encodeURIComponent(keys.key)}`
    const { json } = await scapiFetch('POST', submitUrl, keys.key, keys.secret, payload)
    const code = json.code
    if (code !== 200 && code !== '200') {
      const msg = (typeof json.msg === 'string' && json.msg) || '生图提交失败'
      return jsonResponse(502, { error: msg, raw: json })
    }
    const data = json.data ?? {}
    const taskId =
      (typeof data.id === 'string' && data.id) ||
      (typeof data.task_id === 'string' && data.task_id) ||
      ''
    if (!taskId) return jsonResponse(502, { error: '未返回 task id', raw: json })

    const wait = body.wait !== false
    if (!wait) {
      return jsonResponse(200, { taskId, imageUrl: null, submitted: true })
    }

    const polled = await pollUntilDone(taskId, keys.key, keys.secret)
    if (polled.error || !polled.imageUrl) {
      return jsonResponse(502, {
        error: polled.error || '未拿到图片地址',
        taskId,
        raw: polled.raw,
      })
    }
    return jsonResponse(200, { imageUrl: polled.imageUrl, taskId })
  }

  return jsonResponse(404, { error: 'unknown api route' })
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/scapi/')) {
        return await handleScapi(request, env)
      }
      return env.ASSETS.fetch(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return jsonResponse(500, { error: message.slice(0, 400) })
    }
  },
}
