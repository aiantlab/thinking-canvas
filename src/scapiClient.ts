/**
 * Browser client for SCAPI proxy (Vite middleware locally, Worker in prod).
 * Never import API keys here — signing stays server-side.
 *
 * Deployed Workers may return taskId with imageUrl:null (timeout budget);
 * this client polls /api/scapi/detail until an image URL or failure.
 */

export type ScapiGenerateRequest = {
  prompt: string
  size?: '1K' | '2K' | '4K' | string
  aspectRatio?: string
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
const DETAIL_TIMEOUT_MS = 10 * 60 * 1000

function useMock(): boolean {
  return import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true'
}

export function shouldUseMockGenerate(): boolean {
  return useMock()
}

async function pollDetail(
  taskId: string,
  signal?: AbortSignal,
): Promise<ScapiGenerateResult> {
  const t0 = Date.now()
  while (Date.now() - t0 < DETAIL_TIMEOUT_MS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const res = await fetch(
      `/api/scapi/detail?id=${encodeURIComponent(taskId)}`,
      { signal },
    )
    const data = (await res.json().catch(() => ({}))) as {
      imageUrl?: string | null
      status?: unknown
      error?: string
      raw?: { data?: { message?: string }; msg?: string }
    }
    if (!res.ok) {
      throw new Error(data.error || `生图查询失败 (${res.status})`)
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
      throw new Error(msg)
    }
    await new Promise((r) => setTimeout(r, DETAIL_POLL_MS))
  }
  throw new Error('生成超时，请稍后重试')
}

export async function scapiGenerate(
  req: ScapiGenerateRequest,
  opts?: { signal?: AbortSignal },
): Promise<ScapiGenerateResult> {
  // Prefer wait:false so Worker returns quickly; fall back to polling detail.
  // If server still waits briefly and returns imageUrl, use it immediately.
  const res = await fetch('/api/scapi/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size: '4K', ...req, wait: false }),
    signal: opts?.signal,
  })
  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string | null
    taskId?: string
    error?: string
    pending?: boolean
  }
  if (!res.ok) {
    throw new Error(data.error || `生图请求失败 (${res.status})`)
  }
  if (!data.taskId) {
    throw new Error(data.error || '未返回任务 id')
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
  // blob: / data: — SCAPI needs a public URL; skip urls
  return {}
}

export function taskIdToSeed(taskId: string): number {
  let h = 0
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) >>> 0
  return (h % 900000) + 100000
}
