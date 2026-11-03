import type { Edge, Node } from '@xyflow/react'
import type { ImageSize, ModelId } from './models'

export type ScenePreset = 'facade' | 'interior' | 'landscape'
export type ViewAngle = 'eye' | 'bird' | 'elevation'
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16'
export type StylePreset =
  | 'modern'
  | 'neo-chinese'
  | 'minimal'
  | 'luxury'
  | 'brutalist'
  | 'scandi'

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
  view: ViewAngle
  style: StylePreset
  aspect: AspectRatio
}

export type GenerateNodeData = {
  label: string
  status: GenStatus
  progress?: number
  lastError?: string
  model?: ModelId
  size?: ImageSize
}

export type ResultNodeData = {
  label: string
  imageUrl?: string
  seed?: number
  promptSnapshot?: string
  status: 'ready' | 'placeholder'
}

export type Preview3DNodeData = {
  label: string
  imageUrl?: string
}

export type CanvasNodeData =
  | UploadNodeData
  | PromptNodeData
  | ParamsNodeData
  | GenerateNodeData
  | ResultNodeData
  | Preview3DNodeData

export type UploadNode = Node<UploadNodeData, 'upload'>
export type PromptNode = Node<PromptNodeData, 'prompt'>
export type ParamsNode = Node<ParamsNodeData, 'params'>
export type GenerateNode = Node<GenerateNodeData, 'generate'>
export type ResultNode = Node<ResultNodeData, 'result'>
export type Preview3DNode = Node<Preview3DNodeData, 'preview3d'>

export type CanvasNode =
  | UploadNode
  | PromptNode
  | ParamsNode
  | GenerateNode
  | ResultNode
  | Preview3DNode

export type CanvasEdge = Edge

export type NodeKind = 'upload' | 'prompt' | 'params' | 'generate' | 'result' | 'preview3d'

export const SCENE_PRESETS: { id: ScenePreset; labelKey: 'sceneFacade' | 'sceneInterior' | 'sceneLandscape' }[] = [
  { id: 'facade', labelKey: 'sceneFacade' },
  { id: 'interior', labelKey: 'sceneInterior' },
  { id: 'landscape', labelKey: 'sceneLandscape' },
]

export const VIEW_OPTIONS: { id: ViewAngle; labelKey: 'viewEye' | 'viewBird' | 'viewElevation' }[] = [
  { id: 'eye', labelKey: 'viewEye' },
  { id: 'bird', labelKey: 'viewBird' },
  { id: 'elevation', labelKey: 'viewElevation' },
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
}[] = [
  { id: 'modern', labelKey: 'styleModern' },
  { id: 'neo-chinese', labelKey: 'styleNeoChinese' },
  { id: 'minimal', labelKey: 'styleMinimal' },
  { id: 'luxury', labelKey: 'styleLuxury' },
  { id: 'brutalist', labelKey: 'styleBrutalist' },
  { id: 'scandi', labelKey: 'styleScandi' },
]

export const ASPECT_OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9' },
  { id: '4:3', label: '4:3' },
  { id: '1:1', label: '1:1' },
  { id: '9:16', label: '9:16' },
]

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
