/**
 * Browser client for SCAPI proxy (Vite middleware locally, Worker in prod).
 * Never import API keys here — signing stays server-side.
 *
 * IMPORTANT: Workers assets config uses run_worker_first: ["/api/*"].
 * Only /api/* reaches the Worker; /__canno_* hits ASSETS (405 / SPA HTML)
 * and cross-origin callers see TypeError: Failed to fetch.
 */

import type { ImageSize, ModelId } from './models'
import { DEFAULT_MODEL, DEFAULT_SIZE } from './models'
import { authHeaders, loadSession } from './auth/authClient'

export type ScapiGenerateRequest = {
  prompt: string
  size?: ImageSize | string
  /** Omit or leave undefined for auto (worker will not send aspectRatio) */
  aspectRatio?: string
  /** Image count 1–3 when SCAPI accepts `n` — currently unused (client loops) */
  n?: number
  model?: ModelId | string
  endpoint?: string
  /** Public https reference */
  refUrl?: string
  /** Same-origin path like /demo/line_sketch.png */
  refPath?: string
  urls?: string[]
  wait?: boolean
}

export type ScapiGenerateResult = {
  imageUrl: string
  taskId: string
}

const DETAIL_POLL_MS = 3500
const DETAIL_TIMEOUT_MS = 12 * 60 * 1000
const DETAIL_NET_RETRIES = 3

/** Demo assets → public https SCAPI can fetch (same map as Worker). */
const DEMO_PUBLIC_MAP: Record<string, string> = {
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
  '/templates/line_basic_sketch.webp': 'https://canno3d.com/templates/line_basic_sketch.webp',
  '/templates/line_basic_thumb.webp': 'https://canno3d.com/templates/line_basic_thumb.webp',
  '/templates/plan_master_render.webp': 'https://canno3d.com/templates/plan_master_render.webp',
  '/templates/plan_master_sketch.webp': 'https://canno3d.com/templates/plan_master_sketch.webp',
  '/templates/plan_master_thumb.webp': 'https://canno3d.com/templates/plan_master_thumb.webp',
  '/templates/facade_day_render.webp': 'https://canno3d.com/templates/facade_day_render.webp',
  '/templates/facade_day_sketch.webp': 'https://canno3d.com/templates/facade_day_sketch.webp',
  '/templates/facade_day_thumb.webp': 'https://canno3d.com/templates/facade_day_thumb.webp',
  '/templates/aerial_block_render.webp': 'https://canno3d.com/templates/aerial_block_render.webp',
  '/templates/aerial_block_sketch.webp': 'https://canno3d.com/templates/aerial_block_sketch.webp',
  '/templates/aerial_block_thumb.webp': 'https://canno3d.com/templates/aerial_block_thumb.webp',
  '/templates/int_office_render.webp': 'https://canno3d.com/templates/int_office_render.webp',
  '/templates/int_office_sketch.webp': 'https://canno3d.com/templates/int_office_sketch.webp',
  '/templates/int_office_thumb.webp': 'https://canno3d.com/templates/int_office_thumb.webp',
  '/templates/int_dining_render.webp': 'https://canno3d.com/templates/int_dining_render.webp',
  '/templates/int_dining_sketch.webp': 'https://canno3d.com/templates/int_dining_sketch.webp',
  '/templates/int_dining_thumb.webp': 'https://canno3d.com/templates/int_dining_thumb.webp',
  '/templates/land_water_render.webp': 'https://canno3d.com/templates/land_water_render.webp',
  '/templates/land_water_sketch.webp': 'https://canno3d.com/templates/land_water_sketch.webp',
  '/templates/land_water_thumb.webp': 'https://canno3d.com/templates/land_water_thumb.webp',
  '/templates/land_court_render.webp': 'https://canno3d.com/templates/land_court_render.webp',
  '/templates/land_court_sketch.webp': 'https://canno3d.com/templates/land_court_sketch.webp',
  '/templates/land_court_thumb.webp': 'https://canno3d.com/templates/land_court_thumb.webp',
  '/templates/demo_inpaint_render.webp': 'https://canno3d.com/templates/demo_inpaint_render.webp',
  '/templates/demo_inpaint_sketch.webp': 'https://canno3d.com/templates/demo_inpaint_sketch.webp',
  '/templates/demo_inpaint_thumb.webp': 'https://canno3d.com/templates/demo_inpaint_thumb.webp',
  '/templates/demo_material_render.webp': 'https://canno3d.com/templates/demo_material_render.webp',
  '/templates/demo_material_sketch.webp': 'https://canno3d.com/templates/demo_material_sketch.webp',
  '/templates/demo_material_thumb.webp': 'https://canno3d.com/templates/demo_material_thumb.webp',
  '/templates/demo_multiview_render.webp': 'https://canno3d.com/templates/demo_multiview_render.webp',
  '/templates/demo_multiview_sketch.webp': 'https://canno3d.com/templates/demo_multiview_sketch.webp',
  '/templates/demo_multiview_thumb.webp': 'https://canno3d.com/templates/demo_multiview_thumb.webp',
  '/templates/plan_floor_render.webp': 'https://canno3d.com/templates/plan_floor_render.webp',
  '/templates/plan_floor_sketch.webp': 'https://canno3d.com/templates/plan_floor_sketch.webp',
  '/templates/plan_floor_thumb.webp': 'https://canno3d.com/templates/plan_floor_thumb.webp',
  'line_basic_render.webp': 'https://canno3d.com/templates/line_basic_render.webp',
  'line_basic_sketch.webp': 'https://canno3d.com/templates/line_basic_sketch.webp',
  'line_basic_thumb.webp': 'https://canno3d.com/templates/line_basic_thumb.webp',
  'plan_master_render.webp': 'https://canno3d.com/templates/plan_master_render.webp',
  'plan_master_sketch.webp': 'https://canno3d.com/templates/plan_master_sketch.webp',
  'plan_master_thumb.webp': 'https://canno3d.com/templates/plan_master_thumb.webp',
  'facade_day_render.webp': 'https://canno3d.com/templates/facade_day_render.webp',
  'facade_day_sketch.webp': 'https://canno3d.com/templates/facade_day_sketch.webp',
  'facade_day_thumb.webp': 'https://canno3d.com/templates/facade_day_thumb.webp',
  'aerial_block_render.webp': 'https://canno3d.com/templates/aerial_block_render.webp',
  'aerial_block_sketch.webp': 'https://canno3d.com/templates/aerial_block_sketch.webp',
  'aerial_block_thumb.webp': 'https://canno3d.com/templates/aerial_block_thumb.webp',
  'int_office_render.webp': 'https://canno3d.com/templates/int_office_render.webp',
  'int_office_sketch.webp': 'https://canno3d.com/templates/int_office_sketch.webp',
  'int_office_thumb.webp': 'https://canno3d.com/templates/int_office_thumb.webp',
  'int_dining_render.webp': 'https://canno3d.com/templates/int_dining_render.webp',
  'int_dining_sketch.webp': 'https://canno3d.com/templates/int_dining_sketch.webp',
  'int_dining_thumb.webp': 'https://canno3d.com/templates/int_dining_thumb.webp',
  'land_water_render.webp': 'https://canno3d.com/templates/land_water_render.webp',
  'land_water_sketch.webp': 'https://canno3d.com/templates/land_water_sketch.webp',
  'land_water_thumb.webp': 'https://canno3d.com/templates/land_water_thumb.webp',
  'land_court_render.webp': 'https://canno3d.com/templates/land_court_render.webp',
  'land_court_sketch.webp': 'https://canno3d.com/templates/land_court_sketch.webp',
  'land_court_thumb.webp': 'https://canno3d.com/templates/land_court_thumb.webp',
  'demo_inpaint_render.webp': 'https://canno3d.com/templates/demo_inpaint_render.webp',
  'demo_inpaint_sketch.webp': 'https://canno3d.com/templates/demo_inpaint_sketch.webp',
  'demo_inpaint_thumb.webp': 'https://canno3d.com/templates/demo_inpaint_thumb.webp',
  'demo_material_render.webp': 'https://canno3d.com/templates/demo_material_render.webp',
  'demo_material_sketch.webp': 'https://canno3d.com/templates/demo_material_sketch.webp',
  'demo_material_thumb.webp': 'https://canno3d.com/templates/demo_material_thumb.webp',
  'demo_multiview_render.webp': 'https://canno3d.com/templates/demo_multiview_render.webp',
  'demo_multiview_sketch.webp': 'https://canno3d.com/templates/demo_multiview_sketch.webp',
  'demo_multiview_thumb.webp': 'https://canno3d.com/templates/demo_multiview_thumb.webp',
  'plan_floor_render.webp': 'https://canno3d.com/templates/plan_floor_render.webp',
  'plan_floor_sketch.webp': 'https://canno3d.com/templates/plan_floor_sketch.webp',
  'plan_floor_thumb.webp': 'https://canno3d.com/templates/plan_floor_thumb.webp',
}

/** GitHub Pages has no SCAPI secrets → thinking-canvas Worker. canno3d.com is same-origin. */
function apiBase(): string {
  if (typeof location !== 'undefined') {
    const host = location.hostname
    if (host === 'aiantlab.github.io' || host.endsWith('.github.io')) {
      return 'https://thinking-canvas.yeahsky.workers.dev'
    }
  }
  return ''
}

function useMock(): boolean {
  return import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true'
}

export function shouldUseMockGenerate(): boolean {
  return useMock()
}

function fetchErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof TypeError) {
    const m = err.message || ''
    if (/failed to fetch|networkerror|load failed/i.test(m)) {
      return '网络异常，请稍后重试。'
    }
    return m || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return String(err || fallback)
}

/** Map SCAPI / Gemini upstream failures to actionable copy. */
export function normalizeGenError(msg: string): string {
  const m = (msg || '').trim()
  if (!m) return '生图生成失败'
  if (/google\s*gemini|gemini.*timeout|timeout.*gemini/i.test(m)) {
    return '生成超时，请稍后重试，或改用 Lite 模型 / 更低分辨率。'
  }
  if (/^生成超时/.test(m)) {
    return '等待结果超时。上游任务可能仍在跑，请稍后重试；Pro/2K/4K 常需 1–3 分钟。'
  }
  if (/SCAPI|scapi\.net|速创|SUCHUANG|FAL_KEY|\bFal\b|Worker secrets/i.test(m)) {
    return '生成失败，请稍后重试。'
  }
  return m
}

async function pollDetail(
  taskId: string,
  signal?: AbortSignal,
): Promise<ScapiGenerateResult> {
  const t0 = Date.now()
  let netFails = 0
  while (Date.now() - t0 < DETAIL_TIMEOUT_MS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    let res: Response
    try {
      res = await fetch(
        `${apiBase()}/api/scapi/detail?id=${encodeURIComponent(taskId)}`,
        { signal },
      )
      netFails = 0
    } catch (err) {
      netFails += 1
      if (netFails > DETAIL_NET_RETRIES) {
        throw new Error(fetchErrorMessage(err, '生图查询失败'))
      }
      await new Promise((r) => setTimeout(r, DETAIL_POLL_MS))
      continue
    }
    const data = (await res.json().catch(() => ({}))) as {
      imageUrl?: string | null
      status?: unknown
      error?: string
      raw?: { data?: { message?: string }; msg?: string }
    }
    if (!res.ok) {
      throw new Error(normalizeGenError(data.error || `生图查询失败 (${res.status})`))
    }
    if (data.imageUrl) {
      return { imageUrl: data.imageUrl, taskId }
    }
    const st = data.status
    if (
      st === 3 ||
      st === '3' ||
      st === 'fail' ||
      st === 'failed' ||
      st === 'error'
    ) {
      const msg =
        data.error ||
        data.raw?.data?.message ||
        data.raw?.msg ||
        '生图生成失败'
      throw new Error(normalizeGenError(String(msg)))
    }
    await new Promise((r) => setTimeout(r, DETAIL_POLL_MS))
  }
  throw new Error(normalizeGenError('生成超时，请稍后重试'))
}

export async function scapiGenerate(
  req: ScapiGenerateRequest,
  opts?: { signal?: AbortSignal },
): Promise<ScapiGenerateResult> {
  let res: Response
  try {
    res = await fetch(`${apiBase()}/api/scapi/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(loadSession()?.token) },
      body: JSON.stringify({
        size: DEFAULT_SIZE,
        model: DEFAULT_MODEL,
        ...req,
        wait: false,
      }),
      signal: opts?.signal,
    })
  } catch (err) {
    throw new Error(fetchErrorMessage(err, '生图请求失败'))
  }
  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string | null
    taskId?: string
    error?: string
    pending?: boolean
  }
  if (!res.ok) {
    throw new Error(normalizeGenError(data.error || `生图请求失败 (${res.status})`))
  }
  if (!data.taskId) {
    throw new Error(normalizeGenError(data.error || '未返回任务 id'))
  }
  if (data.imageUrl) {
    return { imageUrl: data.imageUrl, taskId: data.taskId }
  }
  return pollDetail(data.taskId, opts?.signal)
}

/** Prefer https; map same-origin /demo for proxy; drop blob/data. */
export function pickRefForScapi(imageUrl?: string): {
  refUrl?: string
  refPath?: string
} {
  if (!imageUrl) return {}
  if (/^https?:\/\//i.test(imageUrl)) return { refUrl: imageUrl }
  if (imageUrl.startsWith('/demo/')) return { refPath: imageUrl }
  return {}
}

/**
 * Collect N reference image nodes into SCAPI `urls` (and optional single refPath).
 * Resolves /demo/* to public https so multiple demo refs all reach SCAPI.
 * blob:/data: URLs are skipped (cannot be fetched by SCAPI).
 */
export function collectRefsForScapi(imageUrls: (string | undefined)[]): {
  urls?: string[]
  refUrl?: string
  refPath?: string
} {
  const urls: string[] = []
  let refPath: string | undefined
  for (const imageUrl of imageUrls) {
    if (!imageUrl) continue
    if (/^https?:\/\//i.test(imageUrl)) {
      urls.push(imageUrl)
      continue
    }
    if (imageUrl.startsWith('/demo/') || !imageUrl.includes('/')) {
      const mapped =
        DEMO_PUBLIC_MAP[imageUrl] ||
        DEMO_PUBLIC_MAP[imageUrl.replace(/^\//, '')]
      if (mapped) {
        urls.push(mapped)
      } else if (imageUrl.startsWith('/demo/')) {
        const origin =
          typeof location !== 'undefined' && location.origin
            ? location.origin
            : 'https://canno3d.com'
        urls.push(`${origin}${imageUrl}`)
      }
    }
  }
  const uniq = [...new Set(urls)]
  if (uniq.length) {
    return {
      urls: uniq,
      refUrl: uniq[0],
      ...(refPath ? { refPath } : {}),
    }
  }
  if (refPath) return { refPath }
  return {}
}

export function taskIdToSeed(taskId: string): number {
  let h = 0
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) >>> 0
  return (h % 900000) + 100000
}
