import { authHeaders, loadSession } from './auth/authClient'
/**
 * Native-mask inpaint via Worker → Fal FLUX Fill.
 * Falls back to callers (SCAPI) when Worker returns NO_FAL_KEY / billing errors.
 */

function sanitizeInpaintError(msg?: string | null): string {
  const m = (msg || '').trim()
  if (!m) return ''
  if (/FAL_KEY|NO_FAL|FAL_|Fal\b|FLUX|SCAPI|scapi|速创|SUCHUANG|Worker secrets/i.test(m)) {
    return '局部重绘暂不可用，请稍后重试'
  }
  return m
}

export type FalInpaintRequest = {
  prompt: string
  imageUrl?: string
  imageBase64?: string
  imageDataUrl?: string
  maskUrl?: string
  maskBase64?: string
  maskDataUrl?: string
  seed?: number
  wait?: boolean
}

export type FalInpaintResult = {
  imageUrl: string
  requestId: string
  engine: 'fal-flux-fill'
  nativeMask: true
}

export class FalInpaintUnavailableError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'FalInpaintUnavailableError'
    this.code = code
  }
}

function apiBase(): string {
  if (typeof location !== 'undefined') {
    const host = location.hostname
    if (host === 'aiantlab.github.io' || host.endsWith('.github.io')) {
      return 'https://thinking-canvas.yeahsky.workers.dev'
    }
  }
  return ''
}

const POLL_MS = 2800
const POLL_TIMEOUT_MS = 8 * 60 * 1000

async function pollFal(
  requestId: string,
  statusUrl?: string | null,
  responseUrl?: string | null,
  signal?: AbortSignal,
): Promise<FalInpaintResult> {
  const t0 = Date.now()
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const qs = new URLSearchParams({ id: requestId })
    if (statusUrl) qs.set('statusUrl', statusUrl)
    if (responseUrl) qs.set('responseUrl', responseUrl)
    const res = await fetch(`${apiBase()}/api/inpaint/status?${qs}`, { signal })
    const data = (await res.json().catch(() => ({}))) as {
      imageUrl?: string | null
      error?: string
      code?: string
      pending?: boolean
      requestId?: string
      status?: string
    }
    if (!res.ok) {
      const code = data.code || 'FAL_FAIL'
      if (code === 'NO_FAL_KEY' || code === 'FAL_BILLING' || code === 'FAL_AUTH') {
        throw new FalInpaintUnavailableError(sanitizeInpaintError(data.error) || '局部重绘暂不可用', code)
      }
      throw new Error(sanitizeInpaintError(data.error) || `局部重绘失败 (${res.status})`)
    }
    if (data.imageUrl) {
      return {
        imageUrl: data.imageUrl,
        requestId: data.requestId || requestId,
        engine: 'fal-flux-fill',
        nativeMask: true,
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  throw new Error('局部重绘超时，请稍后重试')
}

/** Returns true when error means "use SCAPI fallback". */
export function shouldFallbackFromFal(err: unknown): boolean {
  if (err instanceof FalInpaintUnavailableError) return true
  if (err instanceof Error) {
    const m = err.message || ''
    if (/NO_FAL_KEY|FAL_BILLING|FAL_AUTH|缺少 FAL_KEY|credit|balance/i.test(m)) return true
  }
  return false
}

export async function falInpaint(
  req: FalInpaintRequest,
  opts?: { signal?: AbortSignal },
): Promise<FalInpaintResult> {
  let res: Response
  try {
    res = await fetch(`${apiBase()}/api/inpaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(loadSession()?.token) },
      body: JSON.stringify({ ...req, wait: false }),
      signal: opts?.signal,
    })
  } catch (err) {
    throw new Error(
      err instanceof TypeError
        ? '网络异常，请稍后重试。'
        : err instanceof Error
          ? err.message
          : String(err),
    )
  }

  const data = (await res.json().catch(() => ({}))) as {
    imageUrl?: string | null
    requestId?: string
    statusUrl?: string
    responseUrl?: string
    error?: string
    code?: string
    pending?: boolean
    engine?: string
    nativeMask?: boolean
  }

  if (!res.ok) {
    const code = data.code || 'FAL_FAIL'
    if (
      code === 'NO_FAL_KEY' ||
      code === 'FAL_BILLING' ||
      code === 'FAL_AUTH' ||
      res.status === 503
    ) {
      throw new FalInpaintUnavailableError(sanitizeInpaintError(data.error) || '局部重绘暂不可用', code)
    }
    throw new Error(sanitizeInpaintError(data.error) || `局部重绘失败 (${res.status})`)
  }

  if (data.imageUrl && data.requestId) {
    return {
      imageUrl: data.imageUrl,
      requestId: data.requestId,
      engine: 'fal-flux-fill',
      nativeMask: true,
    }
  }

  if (!data.requestId) {
    throw new FalInpaintUnavailableError(sanitizeInpaintError(data.error) || '局部重绘暂不可用', data.code || 'FAL_NO_ID')
  }

  return pollFal(data.requestId, data.statusUrl, data.responseUrl, opts?.signal)
}

/**
 * Composite SCAPI img2img result with original using mask:
 * white mask → keep generated; black → keep original.
 * Improves fake-mask fallback when Fal unavailable.
 */
export async function compositeMaskedResult(
  originalUrl: string,
  generatedUrl: string,
  maskDataUrl: string,
): Promise<string> {
  const load = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image load failed'))
      img.src = src
    })

  const [orig, gen, mask] = await Promise.all([
    load(originalUrl),
    load(generatedUrl),
    load(maskDataUrl),
  ])

  const w = orig.naturalWidth || orig.width
  const h = orig.naturalHeight || orig.height
  if (!w || !h) throw new Error('bad original dimensions')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')

  // Draw generated full-frame (scaled)
  ctx.drawImage(gen, 0, 0, w, h)
  const genData = ctx.getImageData(0, 0, w, h)

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(orig, 0, 0, w, h)
  const origData = ctx.getImageData(0, 0, w, h)

  const mCanvas = document.createElement('canvas')
  mCanvas.width = w
  mCanvas.height = h
  const mctx = mCanvas.getContext('2d')
  if (!mctx) throw new Error('no mask context')
  mctx.imageSmoothingEnabled = false
  mctx.drawImage(mask, 0, 0, w, h)
  const maskData = mctx.getImageData(0, 0, w, h)

  const out = ctx.createImageData(w, h)
  for (let i = 0; i < out.data.length; i += 4) {
    const a = maskData.data[i + 3] / 255
    // luminance of mask RGB
    const lum =
      (maskData.data[i] * 0.299 + maskData.data[i + 1] * 0.587 + maskData.data[i + 2] * 0.114) / 255
    const t = Math.min(1, Math.max(0, lum * (a || 1)))
    out.data[i] = genData.data[i] * t + origData.data[i] * (1 - t)
    out.data[i + 1] = genData.data[i + 1] * t + origData.data[i + 1] * (1 - t)
    out.data[i + 2] = genData.data[i + 2] * t + origData.data[i + 2] * (1 - t)
    out.data[i + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return canvas.toDataURL('image/png')
}
