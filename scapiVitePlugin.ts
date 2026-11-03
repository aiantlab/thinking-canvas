/**
 * Local Vite middleware that proxies SCAPI image generate.
 * Keys stay in process env (SUCHUANG_API_KEY / SUCHUANG_SIGN_KEY) — never in src/ or VITE_*.
 *
 * Local /demo/* refs are not reachable by SCAPI. We map known demo files to previously
 * published https://scapi.net/... URLs from output/line_to_render_meta.json when present.
 * Arbitrary blob/data URLs cannot be made public from localhost; those omit `urls`.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SUBMIT = 'https://api.scapi.net/api/async/image_nanoBanana2'
const DETAIL = 'https://api.scapi.net/api/async/detail'
const DEFAULT_SIZE = '4K'
const DEFAULT_ASPECT = '16:9'
const POLL_MS = 4000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

type GenerateBody = {
  prompt?: string
  size?: string
  aspectRatio?: string
  /** Public https reference image(s) */
  urls?: string[]
  /** Same-origin demo path e.g. /demo/line_sketch.png */
  refPath?: string
  /** Public https ref (alias of urls[0]) */
  refUrl?: string
  /** If true, middleware polls until image URL (default true) */
  wait?: boolean
}

function getKeys(): { key: string; secret: string } | null {
  const key = process.env.SUCHUANG_API_KEY?.trim()
  const secret = process.env.SUCHUANG_SIGN_KEY?.trim()
  if (!key || !secret) return null
  return { key, secret }
}

function signHeaders(key: string, secret: string): Record<string, string> {
  const ts = String(Math.floor(Date.now() / 1000))
  const sign = crypto
    .createHmac('sha256', secret)
    .update(`key=${key}&timestamp=${ts}`)
    .digest('hex')
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

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw) as unknown
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>,
) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(payload)
}

function loadDemoPublicMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const metaPath = path.join(ROOT, 'output', 'line_to_render_meta.json')
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
      line_url?: string
      render_url?: string
      line_path?: string
      render_path?: string
    }
    if (meta.line_path && meta.line_url) map[meta.line_path] = meta.line_url
    if (meta.render_path && meta.render_url) map[meta.render_path] = meta.render_url
    // hard aliases
    if (meta.line_url) {
      map['/demo/line_sketch.png'] = meta.line_url
      map['line_sketch.png'] = meta.line_url
    }
    if (meta.render_url) {
      map['/demo/line_to_render.png'] = meta.render_url
      map['line_to_render.png'] = meta.render_url
    }
  } catch {
    // meta optional
  }
  return map
}

function resolveUrls(body: GenerateBody): string[] | undefined {
  const out: string[] = []
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u)
    }
  }
  if (typeof body.refUrl === 'string' && /^https?:\/\//i.test(body.refUrl)) {
    out.push(body.refUrl)
  }
  if (typeof body.refPath === 'string' && body.refPath.trim()) {
    const map = loadDemoPublicMap()
    const hit = map[body.refPath] || map[body.refPath.replace(/^\//, '')]
    if (hit) out.push(hit)
  }
  const uniq = [...new Set(out)]
  return uniq.length ? uniq : undefined
}

function extractImageUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  const result = d.result
  if (typeof result === 'string' && result.startsWith('http')) return result
  if (Array.isArray(result) && result.length) {
    const first = result[0]
    if (typeof first === 'string' && first.startsWith('http')) return first
    if (first && typeof first === 'object') {
      const o = first as Record<string, unknown>
      for (const k of ['url', 'image_url', 'image']) {
        if (typeof o[k] === 'string' && (o[k] as string).startsWith('http')) {
          return o[k] as string
        }
      }
    }
  }
  if (result && typeof result === 'object') {
    const o = result as Record<string, unknown>
    for (const k of ['image_url', 'url', 'image', 'output']) {
      if (typeof o[k] === 'string' && (o[k] as string).startsWith('http')) {
        return o[k] as string
      }
    }
  }
  return undefined
}

async function scapiFetch(
  method: 'GET' | 'POST',
  url: string,
  key: string,
  secret: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(url, {
    method,
    headers: signHeaders(key, secret),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { code: res.status, msg: text.slice(0, 300) || '非 JSON 响应' }
  }
  return { ok: res.ok, status: res.status, json }
}

async function pollUntilDone(
  taskId: string,
  key: string,
  secret: string,
): Promise<{ imageUrl?: string; taskId: string; raw: Record<string, unknown>; error?: string }> {
  const t0 = Date.now()
  let last: Record<string, unknown> = {}
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    const url = `${DETAIL}?key=${encodeURIComponent(key)}&id=${encodeURIComponent(taskId)}`
    const { json } = await scapiFetch('GET', url, key, secret)
    last = json
    const data = (json.data ?? {}) as Record<string, unknown>
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
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  return { taskId, raw: last, error: '生成超时，请稍后重试' }
}

export function scapiVitePlugin(): Plugin {
  return {
    name: 'scapi-nanobanana2-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = req.url || ''
          if (!url.startsWith('/api/scapi/')) return next()

          // CORS for local canvas
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          const keys = getKeys()
          if (!keys) {
            sendJson(res, 503, {
              error: '缺少 SUCHUANG_API_KEY / SUCHUANG_SIGN_KEY，无法调用生图服务',
              code: 'NO_KEYS',
            })
            return
          }

          if (url.startsWith('/api/scapi/detail') && req.method === 'GET') {
            const u = new URL(url, 'http://127.0.0.1')
            const id = u.searchParams.get('id') || ''
            if (!id) {
              sendJson(res, 400, { error: '缺少 id' })
              return
            }
            const detailUrl = `${DETAIL}?key=${encodeURIComponent(keys.key)}&id=${encodeURIComponent(id)}`
            const { json } = await scapiFetch('GET', detailUrl, keys.key, keys.secret)
            const data = (json.data ?? {}) as Record<string, unknown>
            const imageUrl = extractImageUrl(data)
            sendJson(res, 200, {
              taskId: id,
              status: data.status ?? null,
              imageUrl: imageUrl ?? null,
              raw: json,
            })
            return
          }

          if (url.startsWith('/api/scapi/generate') && req.method === 'POST') {
            const body = (await readJson(req)) as GenerateBody
            const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
            if (!prompt) {
              sendJson(res, 400, { error: '缺少 prompt' })
              return
            }
            const size = (body.size || DEFAULT_SIZE).toUpperCase()
            const aspectRatio = body.aspectRatio || DEFAULT_ASPECT
            const urls = resolveUrls(body)
            const payload: Record<string, unknown> = {
              prompt,
              size,
              aspectRatio,
            }
            if (urls) payload.urls = urls

            const submitUrl = `${SUBMIT}?key=${encodeURIComponent(keys.key)}`
            const { json } = await scapiFetch(
              'POST',
              submitUrl,
              keys.key,
              keys.secret,
              payload,
            )
            const code = json.code
            if (code !== 200 && code !== '200') {
              const msg =
                (typeof json.msg === 'string' && json.msg) ||
                '生图提交失败'
              sendJson(res, 502, { error: msg, raw: json })
              return
            }
            const data = (json.data ?? {}) as Record<string, unknown>
            const taskId =
              (typeof data.id === 'string' && data.id) ||
              (typeof data.task_id === 'string' && data.task_id) ||
              ''
            if (!taskId) {
              sendJson(res, 502, { error: '未返回 task id', raw: json })
              return
            }

            const wait = body.wait !== false
            if (!wait) {
              sendJson(res, 200, { taskId, imageUrl: null, submitted: true })
              return
            }

            const polled = await pollUntilDone(taskId, keys.key, keys.secret)
            if (polled.error || !polled.imageUrl) {
              sendJson(res, 502, {
                error: polled.error || '未拿到图片地址',
                taskId,
                raw: polled.raw,
              })
              return
            }
            sendJson(res, 200, {
              imageUrl: polled.imageUrl,
              taskId,
            })
            return
          }

          sendJson(res, 404, { error: 'unknown scapi route' })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          sendJson(res, 500, { error: message.slice(0, 400) })
        }
      })
    },
  }
}
