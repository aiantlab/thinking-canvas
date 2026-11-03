import type { Edge, Node } from '@xyflow/react'

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
}

export type ResultNodeData = {
  label: string
  imageUrl?: string
  seed?: number
  promptSnapshot?: string
  status: 'ready' | 'placeholder'
}

export type CanvasNodeData =
  | UploadNodeData
  | PromptNodeData
  | ParamsNodeData
  | GenerateNodeData
  | ResultNodeData

export type UploadNode = Node<UploadNodeData, 'upload'>
export type PromptNode = Node<PromptNodeData, 'prompt'>
export type ParamsNode = Node<ParamsNodeData, 'params'>
export type GenerateNode = Node<GenerateNodeData, 'generate'>
export type ResultNode = Node<ResultNodeData, 'result'>

export type CanvasNode =
  | UploadNode
  | PromptNode
  | ParamsNode
  | GenerateNode
  | ResultNode

export type CanvasEdge = Edge

export const SCENE_PRESETS: { id: ScenePreset; label: string }[] = [
  { id: 'facade', label: '建筑外立面' },
  { id: 'interior', label: '室内空间' },
  { id: 'landscape', label: '景观环境' },
]

export const VIEW_OPTIONS: { id: ViewAngle; label: string }[] = [
  { id: 'eye', label: '人视' },
  { id: 'bird', label: '鸟瞰' },
  { id: 'elevation', label: '侧立面' },
]

export const STYLE_OPTIONS: { id: StylePreset; label: string }[] = [
  { id: 'modern', label: '现代简约' },
  { id: 'neo-chinese', label: '新中式' },
  { id: 'minimal', label: '极简白' },
  { id: 'luxury', label: '轻奢' },
  { id: 'brutalist', label: '粗野主义' },
  { id: 'scandi', label: '北欧' },
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
