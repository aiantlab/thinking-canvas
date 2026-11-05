import type { Edge, Node } from '@xyflow/react'
import type { ImageSize, ModelId } from './models'

export type ScenePreset = 'facade' | 'interior' | 'landscape'
/** 建筑学长-aligned design domain */
export type DesignDomain = 'architecture' | 'interior' | 'landscape' | 'urban'
/** Reference / base drawing type */
export type BaseType = 'line' | 'massing' | 'detailed' | 'colorplan'
/** Legacy enum kept for localStorage migration */
export type AdherenceLevel = 'creative' | 'balanced' | 'precise'
/** 0–100 structure adherence (建筑学长 符合度). Default 70. */
export type AdherenceStrength = number
export const DEFAULT_ADHERENCE = 70

/** Map old enum or number → 0–100 slider value. */
export function normalizeAdherence(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(100, Math.max(0, Math.round(raw)))
  }
  if (raw === 'creative') return 25
  if (raw === 'precise') return 95
  if (raw === 'balanced') return 70
  return DEFAULT_ADHERENCE
}

/** Short label band for UI under the slider. */
export function adherenceBand(n: number): AdherenceLevel {
  if (n < 35) return 'creative'
  if (n < 70) return 'balanced'
  return 'precise'
}
export type ViewAngle = 'eye' | 'bird' | 'elevation' | 'front' | 'corner'
/** Params node aspect list */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16'
/** Generate node aspect chips — includes auto + expanded ratios */
export type GenerateAspect =
  | 'auto'
  | '3:2'
  | '2:3'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '1:1'
export type GenerateCount = 1 | 2 | 3
export type StylePreset =
  | 'modern'
  | 'neo-chinese'
  | 'minimal'
  | 'luxury'
  | 'brutalist'
  | 'scandi'
  | 'watercolor'
  | 'ink'
  | 'illustration'
  | 'collage'
export type LightingPreset = 'day' | 'golden' | 'overcast' | 'night'
export type WeatherPreset = 'clear' | 'rain' | 'fog' | 'snow' | 'autumn'

export type GenStatus = 'idle' | 'queued' | 'generating' | 'done' | 'error'

export type UploadNodeData = {
  label: string
  imageUrl?: string
  fileName?: string
}

export type PromptNodeData = {
  label: string
  positive: string
  negative: string
  preset: ScenePreset
}

export type ParamsNodeData = {
  label: string
  domain: DesignDomain
  baseType: BaseType
  /** 0–100; may still be legacy enum string until migrated on read */
  adherence: AdherenceStrength | AdherenceLevel
  view: ViewAngle
  style: StylePreset
  lighting: LightingPreset
  weather: WeatherPreset
  materialLock: boolean
  aspect: AspectRatio
}

export type GenerateNodeData = {
  label: string
  status: GenStatus
  progress?: number
  lastError?: string
  model?: ModelId
  size?: ImageSize
  /** Aspect chip; default 'auto' (omit aspectRatio on SCAPI) */
  aspect?: GenerateAspect
  /** Number of images to request; default 1 */
  count?: GenerateCount
}

export type ResultNodeData = {
  label: string
  imageUrl?: string
  seed?: number
  promptSnapshot?: string
  status: 'ready' | 'placeholder'
}

export type InpaintNodeData = {
  label: string
  /** Local edit prompt for the masked region */
  prompt: string
  /** Brush mask as data URL (white = edit region on black); client-only */
  maskDataUrl?: string
  status: GenStatus
  progress?: number
  lastError?: string
  model?: ModelId
  size?: ImageSize
}

export type ToolMode =
  | 'night'
  | 'weather'
  | 'detail'
  | 'materialMigrate'
  | 'replace'
  | 'multiview'

export type ColorZonesNodeData = {
  label: string
  /** Selected zone category for painting */
  activeCategory: string
  /** Categories that appear in the legend / overlay */
  usedCategories: string[]
  /** Colored overlay data URL (semi-transparent paints); client-only */
  overlayDataUrl?: string
}

export type StyleRefNodeData = {
  label: string
  imageUrl?: string
  fileName?: string
  /** Optional short style brief */
  note?: string
}

export type ToolNodeData = {
  label: string
  mode: ToolMode
  /** Weather target when mode=weather */
  weather?: WeatherPreset
  /** Extra note / object replace prompt */
  prompt?: string
  maskDataUrl?: string
  status: GenStatus
  progress?: number
  lastError?: string
  model?: ModelId
  size?: ImageSize
}


export type CanvasNodeData =
  | UploadNodeData
  | PromptNodeData
  | ParamsNodeData
  | GenerateNodeData
  | ResultNodeData
  | InpaintNodeData
  | ColorZonesNodeData
  | StyleRefNodeData
  | ToolNodeData

export type UploadNode = Node<UploadNodeData, 'upload'>
export type PromptNode = Node<PromptNodeData, 'prompt'>
export type ParamsNode = Node<ParamsNodeData, 'params'>
export type GenerateNode = Node<GenerateNodeData, 'generate'>
export type ResultNode = Node<ResultNodeData, 'result'>
export type InpaintNode = Node<InpaintNodeData, 'inpaint'>
export type ColorZonesNode = Node<ColorZonesNodeData, 'colorzones'>
export type StyleRefNode = Node<StyleRefNodeData, 'styleref'>
export type ToolNode = Node<ToolNodeData, 'tool'>

export type CanvasNode =
  | UploadNode
  | PromptNode
  | ParamsNode
  | GenerateNode
  | ResultNode
  | InpaintNode
  | ColorZonesNode
  | StyleRefNode
  | ToolNode

export type CanvasEdge = Edge

export type NodeKind =
  | 'upload'
  | 'prompt'
  | 'params'
  | 'generate'
  | 'result'
  | 'inpaint'
  | 'colorzones'
  | 'styleref'
  | 'tool'

export const TOOL_MODE_OPTIONS: {
  id: ToolMode
  labelKey:
    | 'toolNight'
    | 'toolWeather'
    | 'toolDetail'
    | 'toolMaterialMigrate'
    | 'toolReplace'
    | 'toolMultiview'
}[] = [
  { id: 'night', labelKey: 'toolNight' },
  { id: 'weather', labelKey: 'toolWeather' },
  { id: 'detail', labelKey: 'toolDetail' },
  { id: 'materialMigrate', labelKey: 'toolMaterialMigrate' },
  { id: 'replace', labelKey: 'toolReplace' },
  { id: 'multiview', labelKey: 'toolMultiview' },
]

export const SCENE_PRESETS: { id: ScenePreset; labelKey: 'sceneFacade' | 'sceneInterior' | 'sceneLandscape' }[] = [
  { id: 'facade', labelKey: 'sceneFacade' },
  { id: 'interior', labelKey: 'sceneInterior' },
  { id: 'landscape', labelKey: 'sceneLandscape' },
]

export const DOMAIN_OPTIONS: {
  id: DesignDomain
  labelKey: 'domainArchitecture' | 'domainInterior' | 'domainLandscape' | 'domainUrban'
}[] = [
  { id: 'architecture', labelKey: 'domainArchitecture' },
  { id: 'interior', labelKey: 'domainInterior' },
  { id: 'landscape', labelKey: 'domainLandscape' },
  { id: 'urban', labelKey: 'domainUrban' },
]

export const BASE_TYPE_OPTIONS: {
  id: BaseType
  labelKey: 'baseLine' | 'baseMassing' | 'baseDetailed' | 'baseColorplan'
}[] = [
  { id: 'line', labelKey: 'baseLine' },
  { id: 'massing', labelKey: 'baseMassing' },
  { id: 'detailed', labelKey: 'baseDetailed' },
  { id: 'colorplan', labelKey: 'baseColorplan' },
]

export const ADHERENCE_OPTIONS: {
  id: AdherenceLevel
  labelKey: 'adhereCreative' | 'adhereBalanced' | 'adherePrecise'
}[] = [
  { id: 'creative', labelKey: 'adhereCreative' },
  { id: 'balanced', labelKey: 'adhereBalanced' },
  { id: 'precise', labelKey: 'adherePrecise' },
]

export const VIEW_OPTIONS: {
  id: ViewAngle
  labelKey: 'viewEye' | 'viewBird' | 'viewElevation' | 'viewFront' | 'viewCorner'
}[] = [
  { id: 'eye', labelKey: 'viewEye' },
  { id: 'bird', labelKey: 'viewBird' },
  { id: 'elevation', labelKey: 'viewElevation' },
  { id: 'front', labelKey: 'viewFront' },
  { id: 'corner', labelKey: 'viewCorner' },
]

export const STYLE_OPTIONS: {
  id: StylePreset
  labelKey:
    | 'styleModern'
    | 'styleNeoChinese'
    | 'styleMinimal'
    | 'styleLuxury'
    | 'styleBrutalist'
    | 'styleScandi'
    | 'styleWatercolor'
    | 'styleInk'
    | 'styleIllustration'
    | 'styleCollage'
}[] = [
  { id: 'modern', labelKey: 'styleModern' },
  { id: 'neo-chinese', labelKey: 'styleNeoChinese' },
  { id: 'minimal', labelKey: 'styleMinimal' },
  { id: 'luxury', labelKey: 'styleLuxury' },
  { id: 'brutalist', labelKey: 'styleBrutalist' },
  { id: 'scandi', labelKey: 'styleScandi' },
  { id: 'watercolor', labelKey: 'styleWatercolor' },
  { id: 'ink', labelKey: 'styleInk' },
  { id: 'illustration', labelKey: 'styleIllustration' },
  { id: 'collage', labelKey: 'styleCollage' },
]

export const LIGHTING_OPTIONS: {
  id: LightingPreset
  labelKey: 'lightDay' | 'lightGolden' | 'lightOvercast' | 'lightNight'
}[] = [
  { id: 'day', labelKey: 'lightDay' },
  { id: 'golden', labelKey: 'lightGolden' },
  { id: 'overcast', labelKey: 'lightOvercast' },
  { id: 'night', labelKey: 'lightNight' },
]

export const WEATHER_OPTIONS: {
  id: WeatherPreset
  labelKey: 'weatherClear' | 'weatherRain' | 'weatherFog' | 'weatherSnow' | 'weatherAutumn'
}[] = [
  { id: 'clear', labelKey: 'weatherClear' },
  { id: 'rain', labelKey: 'weatherRain' },
  { id: 'fog', labelKey: 'weatherFog' },
  { id: 'snow', labelKey: 'weatherSnow' },
  { id: 'autumn', labelKey: 'weatherAutumn' },
]

export const ASPECT_OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9' },
  { id: '4:3', label: '4:3' },
  { id: '1:1', label: '1:1' },
  { id: '9:16', label: '9:16' },
]

/** Wireframe icon size (w×h) for generate aspect chips */
export const GENERATE_ASPECT_OPTIONS: {
  id: GenerateAspect
  labelKey?: 'aspectAuto'
  label?: string
  /** relative box for icon preview */
  box: { w: number; h: number }
  autoIcon?: boolean
}[] = [
  { id: 'auto', labelKey: 'aspectAuto', box: { w: 14, h: 14 }, autoIcon: true },
  { id: '3:2', label: '3:2', box: { w: 15, h: 10 } },
  { id: '2:3', label: '2:3', box: { w: 10, h: 15 } },
  { id: '16:9', label: '16:9', box: { w: 16, h: 9 } },
  { id: '9:16', label: '9:16', box: { w: 9, h: 16 } },
  { id: '4:3', label: '4:3', box: { w: 14, h: 10.5 } },
  { id: '3:4', label: '3:4', box: { w: 10.5, h: 14 } },
  { id: '1:1', label: '1:1', box: { w: 12, h: 12 } },
]

export const GENERATE_COUNT_OPTIONS: { id: GenerateCount; labelKey: 'count1' | 'count2' | 'count3' }[] = [
  { id: 1, labelKey: 'count1' },
  { id: 2, labelKey: 'count2' },
  { id: 3, labelKey: 'count3' },
]

export const DEFAULT_GENERATE_ASPECT: GenerateAspect = 'auto'
export const DEFAULT_GENERATE_COUNT: GenerateCount = 1

export const PROMPT_PRESETS: Record<ScenePreset, { positive: string; negative: string }> = {
  facade: {
    positive:
      '现代高层建筑外立面，玻璃幕墙与石材结合，黄昏暖光，城市天际线，写实建筑摄影，8k',
    negative: '模糊，低分辨率，畸变，文字水印，人物过多',
  },
  interior: {
    positive:
      '高级感客厅室内，木地板与落地窗，柔和自然光，家具精致，建筑室内效果图，写实渲染',
    negative: '杂乱，低清，透视错误，夸张滤镜',
  },
  landscape: {
    positive:
      '城市滨水景观公园，乔木与草坪层次，步行道与座椅，黄昏天空，景观建筑效果图，写实',
    negative: '荒芜，垃圾，低清，夸张透视',
  },
}
