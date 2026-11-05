import type { WeatherPreset } from './types'

/** 色块分区类别（中英对照，写入提示词图例） */
export const COLOR_ZONE_CATEGORIES = [
  { id: 'wall', zh: '墙面', en: 'wall', color: '#94a3b8' },
  { id: 'floor', zh: '地面', en: 'floor', color: '#a16207' },
  { id: 'ceiling', zh: '天花', en: 'ceiling', color: '#e2e8f0' },
  { id: 'window', zh: '窗户', en: 'window', color: '#38bdf8' },
  { id: 'door', zh: '门', en: 'door', color: '#c2410c' },
  { id: 'sofa', zh: '沙发', en: 'sofa', color: '#a855f7' },
  { id: 'curtain', zh: '窗帘', en: 'curtain', color: '#ec4899' },
  { id: 'furniture', zh: '家具', en: 'furniture', color: '#d97706' },
  { id: 'vegetation', zh: '绿化', en: 'vegetation', color: '#22c55e' },
  { id: 'water', zh: '水面', en: 'water', color: '#0ea5e9' },
  { id: 'road', zh: '道路', en: 'road', color: '#64748b' },
  { id: 'glass', zh: '玻璃幕墙', en: 'curtain wall / glass', color: '#67e8f9' },
] as const

export type ColorZoneId = (typeof COLOR_ZONE_CATEGORIES)[number]['id']

export type ColorZoneStroke = {
  category: ColorZoneId
  /** Rough paint presence flag; strokes live in overlayDataUrl */
}

export function composeColorZonesLegend(
  categories: ColorZoneId[],
  locale: 'zh' | 'en' = 'zh',
): string {
  if (!categories.length) return ''
  const lines = categories.map((id) => {
    const c = COLOR_ZONE_CATEGORIES.find((x) => x.id === id)
    if (!c) return id
    return locale === 'zh'
      ? `${c.color} = ${c.zh} (${c.en})`
      : `${c.color} = ${c.en} (${c.zh})`
  })
  return [
    'Color-coded functional zoning overlay on the reference:',
    ...lines,
    'Respect each colored region as that program/material zone when rendering. Keep structure of the base drawing.',
  ].join(' ')
}

export function composeNightPrompt(): string {
  return [
    'Convert this architectural image to a photoreal night scene.',
    'Keep exact building massing, camera angle, composition, and materials.',
    'Add warm interior glow, facade lighting, street lights, deep blue night sky.',
    'Do not redesign architecture. No text, no watermark.',
  ].join(' ')
}

export function composeWeatherConvertPrompt(weather: WeatherPreset): string {
  const map: Record<WeatherPreset, string> = {
    clear: 'clear blue sky, bright daylight atmosphere',
    rain: 'light rain, wet reflective pavements, grey sky, rain streaks',
    fog: 'soft misty fog, reduced distant contrast, atmospheric haze',
    snow: 'light snowfall, soft winter light, snow on ledges and ground',
    autumn: 'autumn foliage, warm golden leaves, clear autumn sky',
  }
  return [
    'Weather / season conversion of the architectural reference.',
    `Target atmosphere: ${map[weather] || map.clear}.`,
    'Preserve geometry, camera, materials, and layout exactly.',
    'Only change sky, weather effects, ground wetness/snow/leaves as needed. Photoreal. No text.',
  ].join(' ')
}

export function composeDetailEnhancePrompt(): string {
  return [
    'Architectural detail and material enhancement of the reference image.',
    'Increase micro-detail, material tactility, edge clarity, and realistic shading.',
    'Keep identical composition, massing, camera, and overall lighting.',
    'Do not invent new buildings or change layout. Photoreal presentation, no text.',
  ].join(' ')
}

export function composeStyleMatchPrompt(userPrompt?: string): string {
  const extra = userPrompt?.trim()
  return [
    'Match the artistic style, color grading, and rendering look of the style reference image(s).',
    'Apply that style to the architectural content from the structure/base reference.',
    extra ? `User brief: ${extra}` : '',
    'Preserve main massing from structure refs. Photoreal or stylized as the style ref dictates. No text.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function composeMaterialMigratePrompt(note?: string): string {
  return [
    'Material transfer / 材质迁移: apply materials and finishes from the material reference image onto the architecture in the base image.',
    'Keep geometry, camera angle, and composition of the base image.',
    note?.trim() ? `Material focus: ${note.trim()}` : 'Transfer facade / surface materials faithfully.',
    'Photoreal architecture. No text, no watermark.',
  ].join(' ')
}

export function composeReplacePrompt(objectPrompt: string, hasMask: boolean): string {
  const edit = objectPrompt.trim() || 'replace the indicated object with the object reference'
  const maskBit = hasMask
    ? 'A brush mask marks the region to replace. Only change that region.'
    : 'Replace only the object described; keep the rest of the scene unchanged.'
  return [
    'Architectural soft-furnishing / object replace (软装/物体替换).',
    maskBit,
    `Replace request: ${edit}`,
    'Use the object/material reference image for the replacement look.',
    'Preserve camera, lighting, and unedited areas. Photoreal. No text.',
  ].join(' ')
}

export type MultiViewKind = 'front' | 'side' | 'bird'

export function composeMultiViewPrompt(kind: MultiViewKind): string {
  const view =
    kind === 'front'
      ? 'front elevation orthographic-looking view'
      : kind === 'side'
        ? 'side elevation view'
        : 'aerial bird-eye view'
  return [
    `Generate a ${view} of the same architecture shown in the reference.`,
    'Keep the same building identity, materials, and style.',
    'Clear architectural presentation drawing / photoreal hybrid. No text, no watermark.',
  ].join(' ')
}

/** Stronger material lock phrasing when checkbox on */
export function materialLockPrompt(hasMaterialRef: boolean): string {
  if (hasMaterialRef) {
    return 'STRICT material lock: reuse exact materials, textures, and finishes from the material/reference images; do not invent new cladding.'
  }
  return 'STRICT material lock: preserve materials from the structure reference; do not change cladding or finishes.'
}
