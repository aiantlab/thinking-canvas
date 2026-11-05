import type {
  BaseType,
  DesignDomain,
  LightingPreset,
  ParamsNodeData,
  StylePreset,
  ViewAngle,
  WeatherPreset,
} from './types'
import { normalizeAdherence } from './types'

const DOMAIN_HINT: Record<DesignDomain, string> = {
  architecture: 'architectural exterior visualization',
  interior: 'interior design render',
  landscape: 'landscape architecture visualization',
  urban: 'urban aerial masterplan visualization',
}

const BASE_HINT: Record<BaseType, string> = {
  line: 'based on architectural line drawing',
  massing: 'based on white massing model',
  detailed: 'based on detailed BIM model screenshot',
  colorplan: 'based on colored site plan',
}

const VIEW_HINT: Record<ViewAngle, string> = {
  eye: 'eye-level perspective',
  bird: 'aerial bird-eye view',
  elevation: 'side elevation view',
  front: 'front elevation view',
  corner: 'corner perspective view',
}

const STYLE_HINT: Record<StylePreset, string> = {
  modern: 'modern minimal architecture',
  'neo-chinese': 'neo-Chinese architecture',
  minimal: 'minimal white architecture',
  luxury: 'light luxury architecture',
  brutalist: 'brutalist architecture',
  scandi: 'Scandinavian architecture',
  watercolor: 'architectural watercolor rendering',
  ink: 'ink line architectural sketch style',
  illustration: 'architectural illustration style',
  collage: 'architectural collage presentation style',
}

const LIGHTING_HINT: Record<LightingPreset, string> = {
  day: 'clear daylight lighting',
  golden: 'golden hour warm lighting',
  overcast: 'soft overcast daylight',
  night: 'night architectural lighting with interior glow',
}

const WEATHER_HINT: Record<WeatherPreset, string> = {
  clear: 'clear sky weather',
  rain: 'light rain atmosphere',
  fog: 'misty fog atmosphere',
  snow: 'light snowfall atmosphere',
  autumn: 'autumn foliage season',
}

/** Map 0–100 adherence slider into prompt phrases (建筑学长-style 符合度). */
export function adherenceHint(raw: unknown): string {
  const n = normalizeAdherence(raw)
  if (n < 35) {
    return `creative interpretation of reference (~${n}% structure adherence), looser massing match allowed`
  }
  if (n < 70) {
    return `balanced structure adherence to reference (~${n}%), keep main volumes`
  }
  return `strictly follow reference contours and massing (~${n}% fidelity), high structure fidelity, preserve silhouette`
}

/** Merge positive prompt with 建筑学长-aligned params into one SCAPI prompt. */
export function composeParamsPrompt(
  positive: string,
  params?: Partial<ParamsNodeData> | null,
): string {
  const domain = params?.domain ?? 'architecture'
  const baseType = params?.baseType ?? 'line'
  const adherence = normalizeAdherence(params?.adherence)
  const view = params?.view ?? 'eye'
  const style = params?.style ?? 'modern'
  const lighting = params?.lighting ?? 'day'
  const weather = params?.weather ?? 'clear'
  const materialLock = params?.materialLock ?? false

  const parts = [
    positive.trim(),
    DOMAIN_HINT[domain],
    BASE_HINT[baseType],
    adherenceHint(adherence),
    STYLE_HINT[style],
    VIEW_HINT[view],
    LIGHTING_HINT[lighting],
    WEATHER_HINT[weather],
  ]
  if (materialLock) {
    parts.push(
      'STRICT material lock: preserve exact materials, textures, and finishes from reference images; do not invent new cladding',
    )
  }
  return parts.filter(Boolean).join(', ')
}

/** Append color-zone legend and style-match hints to a composed prompt. */
export function appendExtraPromptBits(
  base: string,
  extras: { colorLegend?: string; styleNote?: string; materialLockExtra?: string },
): string {
  return [base, extras.colorLegend, extras.styleNote, extras.materialLockExtra]
    .filter(Boolean)
    .join('. ')
}

/**
 * Local inpaint / 局部重绘 prompt. SCAPI has no mask endpoint — instruct
 * the model to only edit the painted region; mask is stored client-side for UX.
 */
export function composeInpaintPrompt(editPrompt: string, hasMask: boolean): string {
  const edit = editPrompt.trim() || 'subtly refine the selected architectural region'
  const maskBit = hasMask
    ? 'A brush mask marks the region to edit (painted strokes). Only change that region; keep all unmasked pixels identical to the reference.'
    : 'Only modify the region described in the edit request; keep the rest of the reference image unchanged.'
  return [
    'Architectural local inpaint / region edit on the reference image.',
    maskBit,
    `Edit request: ${edit}`,
    'Preserve camera angle, lighting, materials, and composition outside the edit region. Photoreal architecture presentation, no text, no watermark.',
  ].join(' ')
}
