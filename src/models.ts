export type ModelId =
  | 'image_nanoBanana2Lite'
  | 'image_nanoBanana2'
  | 'NanoBanana2.1'
  | 'image_nanoBanana_pro'
  | 'image_gpt_2.5'

export type ImageSize = '1K' | '2K' | '4K'

export type ModelOption = {
  id: ModelId
  /** Display name — no 速创 branding as default copy */
  labelKey: 'modelNano2Lite' | 'modelNano2' | 'modelNano21' | 'modelNanoPro' | 'modelGpt25'
  endpoint: string
  /** Allowed quality chips for this model */
  sizes: ImageSize[]
}

/** UI order: Lite → 2 → 2.1 → Pro → GPT-Image-2.5 last */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'image_nanoBanana2Lite',
    labelKey: 'modelNano2Lite',
    endpoint: 'https://api.scapi.net/api/async/image_nanoBanana2Lite',
    sizes: ['1K'],
  },
  {
    id: 'image_nanoBanana2',
    labelKey: 'modelNano2',
    endpoint: 'https://api.scapi.net/api/async/image_nanoBanana2',
    sizes: ['1K', '2K', '4K'],
  },
  {
    id: 'NanoBanana2.1',
    labelKey: 'modelNano21',
    endpoint: 'https://api.scapi.net/api/async/NanoBanana2.1',
    sizes: ['1K', '2K', '4K'],
  },
  {
    id: 'image_nanoBanana_pro',
    labelKey: 'modelNanoPro',
    endpoint: 'https://api.scapi.net/api/async/image_nanoBanana_pro',
    sizes: ['1K', '2K', '4K'],
  },
  {
    id: 'image_gpt_2.5',
    labelKey: 'modelGpt25',
    endpoint: 'https://api.scapi.net/api/async/image_gpt_2.5',
    sizes: ['1K', '2K', '4K'],
  },
]

export const DEFAULT_MODEL: ModelId = 'image_nanoBanana2Lite'
/** Default size for default model (Lite → 1K only) */
export const DEFAULT_SIZE: ImageSize = '1K'

export const SIZE_OPTIONS: { id: ImageSize; labelKey: 'size1k' | 'size2k' | 'size4k' }[] = [
  { id: '1K', labelKey: 'size1k' },
  { id: '2K', labelKey: 'size2k' },
  { id: '4K', labelKey: 'size4k' },
]

export function sizesForModel(model?: ModelId | string): ImageSize[] {
  const hit = MODEL_OPTIONS.find((m) => m.id === model)
  return hit?.sizes ?? ['1K', '2K', '4K']
}

export function clampSizeForModel(model: ModelId | string | undefined, size?: ImageSize): ImageSize {
  const allowed = sizesForModel(model)
  if (size && allowed.includes(size)) return size
  // Prefer 4K when allowed, else the last (largest) option
  if (allowed.includes('4K')) return '4K'
  return allowed[allowed.length - 1] ?? '1K'
}

/** Resolve SCAPI submit URL from client model id or raw endpoint path. */
export function resolveSubmitEndpoint(model?: string, endpoint?: string): string {
  if (typeof endpoint === 'string' && endpoint.startsWith('https://api.scapi.net/api/async/')) {
    return endpoint
  }
  const hit = MODEL_OPTIONS.find((m) => m.id === model)
  if (hit) return hit.endpoint
  if (typeof model === 'string' && model.includes('/')) {
    const name = model.split('/').pop()!
    return `https://api.scapi.net/api/async/${name}`
  }
  return MODEL_OPTIONS[0].endpoint
}
