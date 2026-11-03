export type ModelId =
  | 'image_nanoBanana2Lite'
  | 'image_nanoBanana2'
  | 'image_gpt_2.5'
  | 'NanoBanana2.1'

export type ImageSize = '1K' | '2K' | '4K'

export type ModelOption = {
  id: ModelId
  /** Display name — no 速创 branding as default copy */
  labelKey: 'modelNano2Lite' | 'modelNano2' | 'modelGpt25' | 'modelNano21'
  endpoint: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'image_nanoBanana2Lite',
    labelKey: 'modelNano2Lite',
    endpoint: 'https://api.scapi.net/api/async/image_nanoBanana2Lite',
  },
  {
    id: 'image_nanoBanana2',
    labelKey: 'modelNano2',
    endpoint: 'https://api.scapi.net/api/async/image_nanoBanana2',
  },
  {
    id: 'image_gpt_2.5',
    labelKey: 'modelGpt25',
    endpoint: 'https://api.scapi.net/api/async/image_gpt_2.5',
  },
  {
    id: 'NanoBanana2.1',
    labelKey: 'modelNano21',
    endpoint: 'https://api.scapi.net/api/async/NanoBanana2.1',
  },
]

export const DEFAULT_MODEL: ModelId = 'image_nanoBanana2Lite'
export const DEFAULT_SIZE: ImageSize = '4K'

export const SIZE_OPTIONS: { id: ImageSize; labelKey: 'size1k' | 'size2k' | 'size4k' }[] = [
  { id: '1K', labelKey: 'size1k' },
  { id: '2K', labelKey: 'size2k' },
  { id: '4K', labelKey: 'size4k' },
]

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
