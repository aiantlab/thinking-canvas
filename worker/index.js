/**
 * thinking-canvas Worker: SPA assets + SCAPI SCAPI image HMAC proxy.
 * Secrets: SUCHUANG_API_KEY, SUCHUANG_SIGN_KEY
 */
const SUBMIT = 'https://api.scapi.net/api/async/image_nanoBanana2'
const DETAIL = 'https://api.scapi.net/api/async/detail'
const DEFAULT_SIZE = '4K'
const DEFAULT_ASPECT = '16:9'
const POLL_MS = 3000
const WORKER_POLL_BUDGET_MS = 22000

const DEMO_PUBLIC_MAP = {
  '/demo/line_sketch.png':
    'https://scapi.net/b2462737c7c140819e801978b50882b3.png',
  'line_sketch.png':
    'https://scapi.net/b2462737c7c140819e801978b50882b3.png',
  '/demo/line_to_render.png':
    'https://scapi.net/febcfbdb46f2410ba953d00ee88e00f0.png',
  'line_to_render.png':
    'https://scapi.net/febcfbdb46f2410ba953d00ee88e00f0.png',
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      DEMO_PUBLIC_MAP[body.refPath] ||
      DEMO_PUBLIC_MAP[body.refPath.replace(/^\//, '')]
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
      error: '缺少 SUCHUANG_API_KEY / SUCHUANG_SIGN_KEY，无法调用生图服务',
      code: 'NO_KEYS',
    })
  }
  // Guard against connector redaction placeholders
  if (key.length < 16 || secret.length < 16 || key.startsWith('[R')) {
    return json(503, {
      error: 'Worker secrets invalid (redacted/short). Re-set SUCHUANG_* secrets.',
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
  const aspectRatio = body.aspectRatio || DEFAULT_ASPECT
  const urls = resolveUrls(body)
  const payload = { prompt, size, aspectRatio }
  if (urls) payload.urls = urls

  const submitUrl = `${SUBMIT}?key=${encodeURIComponent(key)}`
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

  const wait = body.wait !== false
  if (!wait) {
    return json(200, { taskId, imageUrl: null, submitted: true })
  }

  const polled = await pollUntilDone(
    taskId,
    key,
    secret,
    WORKER_POLL_BUDGET_MS,
  )
  if (polled.error) {
    return json(502, { error: polled.error, taskId, raw: polled.raw })
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
      error: '缺少 SUCHUANG_API_KEY / SUCHUANG_SIGN_KEY',
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
  return json(200, {
    taskId: id,
    status: data.status ?? null,
    imageUrl: imageUrl ?? null,
    raw,
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.startsWith('/api/scapi/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
      try {
        if (path.startsWith('/api/scapi/detail') && request.method === 'GET') {
          return await handleDetail(request, env)
        }
        if (
          path.startsWith('/api/scapi/generate') &&
          request.method === 'POST'
        ) {
          return await handleGenerate(request, env)
        }
        return json(404, { error: 'unknown scapi route' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return json(500, { error: message.slice(0, 400) })
      }
    }

    if (!env.ASSETS) {
      return new Response('ASSETS binding missing', { status: 500 })
    }
    return env.ASSETS.fetch(request)
  },
}
