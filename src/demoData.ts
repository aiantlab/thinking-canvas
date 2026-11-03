import type { Edge } from '@xyflow/react'
import type { CanvasNode } from './types'

export const LINE_PROMPT =
  'Clean architectural line drawing of a modern hillside villa, black ink on white paper, precise perspective elevation and volume, glass facade with thin hatch, terrace and infinity pool outline, trees as simple silhouettes, professional architect concept sketch, no shading gradients, no photorealism, no color, no people, no text, no watermark'

export const RENDER_PROMPT =
  'Photorealistic architectural visualization based on the attached line drawing, modern hillside villa at golden hour, glass facade, warm wood, infinity pool, cinematic lighting, accurate materials, keep the same composition and massing as the sketch, professional architecture presentation render, no people, no text, no watermark'

export const DEMO_NODES: CanvasNode[] = [
  {
    id: 'demo-upload',
    type: 'upload',
    position: { x: 40, y: 120 },
    data: {
      label: '参考 / 线稿',
      imageUrl: '/demo/line_sketch.png',
      fileName: 'line_sketch.png',
    },
  },
  {
    id: 'demo-prompt',
    type: 'prompt',
    position: { x: 40, y: 420 },
    data: {
      label: '提示词',
      preset: 'facade',
      positive: RENDER_PROMPT,
      negative: '模糊，低分辨率，畸变，文字水印，人物过多，偏离线稿体量',
    },
  },
  {
    id: 'demo-params',
    type: 'params',
    position: { x: 360, y: 420 },
    data: {
      label: '视角 · 风格',
      view: 'eye',
      style: 'modern',
      aspect: '16:9',
    },
  },
  {
    id: 'demo-generate',
    type: 'generate',
    position: { x: 360, y: 160 },
    data: {
      label: '生成',
      status: 'done',
      progress: 100,
    },
  },
  {
    id: 'demo-result',
    type: 'result',
    position: { x: 680, y: 140 },
    data: {
      label: '结果',
      status: 'ready',
      imageUrl: '/demo/line_to_render.png',
      seed: 20261103,
      promptSnapshot: RENDER_PROMPT,
    },
  },
]

export const DEMO_EDGES: Edge[] = [
  {
    id: 'e-upload-gen',
    source: 'demo-upload',
    target: 'demo-generate',
    sourceHandle: 'out',
    type: 'default',
    style: { strokeWidth: 2.25 },
    targetHandle: 'ref',
  },
  {
    id: 'e-prompt-gen',
    source: 'demo-prompt',
    target: 'demo-generate',
    sourceHandle: 'out',
    type: 'default',
    style: { strokeWidth: 2.25 },
    targetHandle: 'prompt',
  },
  {
    id: 'e-params-gen',
    source: 'demo-params',
    target: 'demo-generate',
    sourceHandle: 'out',
    type: 'default',
    style: { strokeWidth: 2.25 },
    targetHandle: 'params',
  },
  {
    id: 'e-gen-result',
    source: 'demo-generate',
    target: 'demo-result',
    sourceHandle: 'out',
    type: 'default',
    style: { strokeWidth: 2.25 },
    targetHandle: 'in',
  },
]
