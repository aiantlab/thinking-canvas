import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthModal } from './auth/AuthModal'
import { PricingModal } from './auth/PricingModal'
import {
  consumeQuota,
  entitlementToQuota,
  fetchMe,
  loadSession,
  logoutAccount,
  saveSession,
  type AuthSession,
} from './auth/authClient'
import { EmptyState } from './components/EmptyState'
import { NodePalette } from './components/NodePalette'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { ColorZonesNode } from './components/nodes/ColorZonesNode'
import { GenerateNode } from './components/nodes/GenerateNode'
import { InpaintNode } from './components/nodes/InpaintNode'
import { ParamsNode } from './components/nodes/ParamsNode'
import { PromptNode } from './components/nodes/PromptNode'
import { ResultNode } from './components/nodes/ResultNode'
import { StyleRefNode } from './components/nodes/StyleRefNode'
import { ToolNode } from './components/nodes/ToolNode'
import { UploadNode } from './components/nodes/UploadNode'
import { TemplateGallery } from './components/TemplateGallery'
import {
  buildTemplateGraph,
  type TemplateDef,
} from './demoData'
import { useI18n } from './i18n'
import { buildPlaceholderImage, mockDelayMs, randomSeed } from './mockGenerate'
import { DEFAULT_MODEL, DEFAULT_SIZE, clampSizeForModel } from './models'
import {
  collectRefsForScapi,
  scapiGenerate,
  shouldUseMockGenerate,
  taskIdToSeed,
} from './scapiClient'
import {
  compositeMaskedResult,
  falInpaint,
  shouldFallbackFromFal,
} from './falInpaintClient'
import { clearGraph, loadGraph, loadQuota, saveGraph, saveQuota } from './storage'
import type {
  AspectRatio,
  ColorZonesNodeData,
  GenerateNodeData,
  InpaintNodeData,
  NodeKind,
  ParamsNodeData,
  PromptNodeData,
  ResultNodeData,
  StylePreset,
  StyleRefNodeData,
  ToolMode,
  ToolNodeData,
  UploadNodeData,
  ViewAngle,
  WeatherPreset,
} from './types'
import { DEFAULT_ADHERENCE, normalizeAdherence } from './types'
import {
  appendExtraPromptBits,
  composeInpaintPrompt,
  composeParamsPrompt,
} from './composeParamsPrompt'
import {
  composeColorZonesLegend,
  composeDetailEnhancePrompt,
  composeMaterialMigratePrompt,
  composeMultiViewPrompt,
  composeNightPrompt,
  composeReplacePrompt,
  composeStyleMatchPrompt,
  composeWeatherConvertPrompt,
  type ColorZoneId,
} from './toolPrompts'
import {
  DEFAULT_GENERATE_ASPECT,
  DEFAULT_GENERATE_COUNT,
  PROMPT_PRESETS,
} from './types'

let idSeq = 1
function nextId(prefix: string) {
  idSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`
}

function wouldCreateCycle(edges: Edge[], source: string, target: string): boolean {
  if (source === target) return true
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    const list = adj.get(e.source) ?? []
    list.push(e.target)
    adj.set(e.source, list)
  }
  const stack = [target]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === source) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    for (const n of adj.get(cur) ?? []) stack.push(n)
  }
  return false
}

const ALLOWED_TYPES = new Set<string>([
  'upload',
  'prompt',
  'params',
  'generate',
  'result',
  'inpaint',
  'colorzones',
  'styleref',
  'tool',
])

function createNode(type: NodeKind, position: { x: number; y: number }, labels: Record<string, string>): Node {
  const id = nextId(type)
  switch (type) {
    case 'upload':
      return {
        id,
        type,
        position,
        data: { label: labels.upload },
        deletable: true,
      }
    case 'prompt': {
      const preset = PROMPT_PRESETS.facade
      return {
        id,
        type,
        position,
        data: {
          label: labels.prompt,
          preset: 'facade',
          positive: preset.positive,
          negative: preset.negative,
        } satisfies PromptNodeData,
        deletable: true,
      }
    }
    case 'params':
      return {
        id,
        type,
        position,
        data: {
          label: labels.params,
          domain: 'architecture',
          baseType: 'line',
          adherence: DEFAULT_ADHERENCE,
          view: 'eye',
          style: 'modern',
          lighting: 'day',
          weather: 'clear',
          materialLock: false,
          aspect: '16:9',
        } satisfies ParamsNodeData,
        deletable: true,
      }
    case 'generate':
      return {
        id,
        type,
        position,
        data: {
          label: labels.generate,
          status: 'idle',
          model: DEFAULT_MODEL,
          size: DEFAULT_SIZE,
          aspect: DEFAULT_GENERATE_ASPECT,
          count: DEFAULT_GENERATE_COUNT,
        } satisfies GenerateNodeData,
        deletable: true,
      }
    case 'result':
      return {
        id,
        type,
        position,
        data: { label: labels.result, status: 'placeholder' } satisfies ResultNodeData,
        deletable: true,
      }
    case 'inpaint':
      return {
        id,
        type,
        position,
        data: {
          label: labels.inpaint,
          prompt: '',
          status: 'idle',
          model: DEFAULT_MODEL,
          size: DEFAULT_SIZE,
        } satisfies InpaintNodeData,
        deletable: true,
      }
    case 'colorzones':
      return {
        id,
        type,
        position,
        data: {
          label: labels.colorzones,
          activeCategory: 'wall',
          usedCategories: [],
        } satisfies ColorZonesNodeData,
        deletable: true,
      }
    case 'styleref':
      return {
        id,
        type,
        position,
        data: {
          label: labels.styleref,
          note: '',
        } satisfies StyleRefNodeData,
        deletable: true,
      }
    case 'tool':
      return {
        id,
        type,
        position,
        data: {
          label: labels.tool,
          mode: 'night',
          weather: 'rain',
          prompt: '',
          status: 'idle',
          model: DEFAULT_MODEL,
          size: DEFAULT_SIZE,
        } satisfies ToolNodeData,
        deletable: true,
      }
  }
}

function sanitizeNodes(raw: Node[]): Node[] {
  return raw
    .filter((n) => n.type && ALLOWED_TYPES.has(n.type))
    .map((n) => {
      if (n.type === 'params') {
        const data = n.data as ParamsNodeData
        return {
          ...n,
          deletable: true,
          data: { ...data, adherence: normalizeAdherence(data?.adherence) },
        }
      }
      return { ...n, deletable: true }
    })
}

function ZoomReporter({ onZoom }: { onZoom: (pct: number) => void }) {
  const zoom = useStore((s) => s.transform[2])
  useEffect(() => {
    onZoom(Math.round(zoom * 100))
  }, [zoom, onZoom])
  return null
}

function resolveBootGraph(): { nodes: Node[]; edges: Edge[]; fromDemo: boolean } {
  const saved = loadGraph()
  if (saved && saved.nodes.length > 0) {
    const clean = sanitizeNodes(saved.nodes as Node[])
    if (clean.length > 0) {
      const ids = new Set(clean.map((n) => n.id))
      return {
        nodes: clean,
        edges: (saved.edges as Edge[]).filter((e) => ids.has(e.source) && ids.has(e.target)),
        fromDemo: false,
      }
    }
  }
  // Cold enter with no/empty/invalid saved graph: empty canvas so EmptyState shows.
  // Demo template only via 「载入模板」 (handleLoadDemo).
  return {
    nodes: [],
    edges: [],
    fromDemo: false,
  }
}

function CanvasInner() {
  const { t } = useI18n()
  // Cold enter: sync-load saved graph when valid; otherwise empty (EmptyState).
  const boot = useMemo(() => resolveBootGraph(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(boot.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(boot.edges)
  const [quota, setQuota] = useState(loadQuota)
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [pricingOpen, setPricingOpen] = useState(false)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [booted] = useState(true)
  const [zoomPct, setZoomPct] = useState(100)
  const [showGrid, setShowGrid] = useState(true)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const timers = useRef<number[]>([])
  const didFitBoot = useRef(false)

  const labels = useMemo(
    () => ({
      upload: t('labelUpload'),
      prompt: t('labelPrompt'),
      params: t('labelParams'),
      generate: t('labelGenerate'),
      result: t('labelResult'),
      inpaint: t('labelInpaint'),
      colorzones: t('labelColorZones'),
      styleref: t('labelStyleRef'),
      tool: t('labelTool'),
    }),
    [t],
  )

  useEffect(() => {
    if (!didFitBoot.current) {
      didFitBoot.current = true
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: boot.fromDemo ? 400 : 0 }))
    }
    return () => {
      for (const tmr of timers.current) window.clearTimeout(tmr)
    }
  }, [boot.fromDemo, fitView])

  useEffect(() => {
    const existing = loadSession()
    if (!existing?.token) return
    let cancelled = false
    void fetchMe(existing.token)
      .then((me) => {
        if (cancelled) return
        setSession(me)
        const q = entitlementToQuota(me.entitlement)
        setQuota(q)
        saveQuota(q)
      })
      .catch(() => {
        if (cancelled) return
        saveSession(null)
        setSession(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const patchNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [setNodes],
  )

  const runGenerate = useCallback(
    (genId: string) => {
      const genToken = session?.token || loadSession()?.token
      if (!genToken) {
        setAuthMode('login')
        setAuthOpen(true)
        patchNodeData(genId, { status: 'error', lastError: t('authLoginRequired') })
        return
      }
      if (!session?.token) {
        const restored = loadSession()
        if (restored) setSession(restored)
      }
      if (quota.used >= quota.total) {
        patchNodeData(genId, { status: 'error', lastError: t('quotaExhausted') })
        return
      }

      const incoming = edges.filter((e) => e.target === genId)
      const sourceIds = incoming.map((e) => e.source)
      const related = nodes.filter((n) => sourceIds.includes(n.id) || n.id === genId)

      const promptNode = related.find((n) => n.type === 'prompt')
      const paramsNode = related.find((n) => n.type === 'params')
      // All connected reference/upload + style ref nodes (N refs → SCAPI urls[])
      const uploadNodes = related.filter((n) => n.type === 'upload')
      const styleRefNodes = related.filter((n) => n.type === 'styleref')
      const colorZonesNode = related.find((n) => n.type === 'colorzones')
      const promptData = promptNode?.data as PromptNodeData | undefined
      const paramsData = paramsNode?.data as ParamsNodeData | undefined
      const genData = nodes.find((n) => n.id === genId)?.data as GenerateNodeData | undefined

      const view: ViewAngle = paramsData?.view ?? 'eye'
      const style: StylePreset = paramsData?.style ?? 'modern'
      const genAspect = genData?.aspect ?? DEFAULT_GENERATE_ASPECT
      const count = genData?.count ?? DEFAULT_GENERATE_COUNT
      // Generate node aspect wins; 'auto' → omit aspectRatio on SCAPI
      const aspectRatio =
        genAspect && genAspect !== 'auto' ? genAspect : undefined
      // Mock placeholder still needs a concrete ratio
      const mockAspect: AspectRatio =
        aspectRatio === '9:16' || aspectRatio === '2:3' || aspectRatio === '3:4'
          ? '9:16'
          : aspectRatio === '1:1'
            ? '1:1'
            : aspectRatio === '4:3' || aspectRatio === '3:2'
              ? '4:3'
              : paramsData?.aspect ?? '16:9'
      const positive = promptData?.positive ?? PROMPT_PRESETS.facade.positive
      const styleUrls = styleRefNodes.map(
        (n) => (n.data as StyleRefNodeData | undefined)?.imageUrl,
      )
      const styleNotes = styleRefNodes
        .map((n) => (n.data as StyleRefNodeData | undefined)?.note?.trim())
        .filter(Boolean) as string[]
      const zonesData = colorZonesNode?.data as ColorZonesNodeData | undefined
      const refPick = collectRefsForScapi([
        ...uploadNodes.map((n) => (n.data as UploadNodeData | undefined)?.imageUrl),
        ...styleUrls,
        zonesData?.overlayDataUrl,
      ])
      const colorLegend = zonesData?.usedCategories?.length
        ? composeColorZonesLegend(zonesData.usedCategories as ColorZoneId[], 'zh')
        : undefined
      const styleNote = styleUrls.some(Boolean)
        ? composeStyleMatchPrompt(styleNotes.join('; '))
        : undefined
      const model = genData?.model ?? DEFAULT_MODEL
      const size = clampSizeForModel(model, genData?.size ?? DEFAULT_SIZE)
      const snapshotPrompt = appendExtraPromptBits(
        composeParamsPrompt(positive, paramsData),
        { colorLegend, styleNote },
      )

      // One result node (+ edge from generate) per requested image count
      const want = Math.min(3, Math.max(1, Number(count) || 1))
      const genNode = nodes.find((n) => n.id === genId)
      const basePos = genNode
        ? { x: genNode.position.x + 320, y: genNode.position.y - 20 }
        : screenToFlowPosition({ x: 700, y: 240 })

      const existingResultIds = edges
        .filter((e) => e.source === genId)
        .map((e) => e.target)
        .filter((tid) => nodes.some((n) => n.id === tid && n.type === 'result'))

      const slotIds: string[] = [...existingResultIds]
      const newResultNodes: Node[] = []
      const newResultEdges: {
        id: string
        source: string
        target: string
        sourceHandle: string
        targetHandle: string
        style: { strokeWidth: number; stroke: string }
      }[] = []

      while (slotIds.length < want) {
        const idx = slotIds.length
        const resultNode = createNode(
          'result',
          { x: basePos.x, y: basePos.y + idx * 220 },
          labels,
        )
        slotIds.push(resultNode.id)
        newResultNodes.push(resultNode)
        newResultEdges.push({
          id: `e-${genId}-${resultNode.id}`,
          source: genId,
          target: resultNode.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          style: { strokeWidth: 2.5, stroke: '#14b8a6' },
        })
      }

      const fillIds = slotIds.slice(0, want)

      setNodes((nds) => {
        const mapped = nds.map((n) => {
          if (n.id === genId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'queued',
                progress: 8,
                lastError: undefined,
                onGenerate: (n.data as { onGenerate?: (id: string) => void }).onGenerate,
              },
            }
          }
          // Clear slots we are about to fill so a Failed-to-fetch mid-run
          // does not leave a stale previous image looking "done".
          if (fillIds.includes(n.id) && n.type === 'result') {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'placeholder',
                imageUrl: undefined,
                seed: undefined,
                promptSnapshot: undefined,
              },
            }
          }
          return n
        })
        return newResultNodes.length ? [...mapped, ...newResultNodes] : mapped
      })

      setEdges((eds) => {
        let next = eds
        for (const rid of fillIds) {
          const has = next.some((e) => e.source === genId && e.target === rid)
          if (has) continue
          const crafted =
            newResultEdges.find((e) => e.target === rid) ?? {
              id: `e-${genId}-${rid}`,
              source: genId,
              target: rid,
              sourceHandle: 'out',
              targetHandle: 'in',
              style: { strokeWidth: 2.5, stroke: '#14b8a6' },
            }
          next = addEdge(crafted, next)
        }
        return next
      })

      const applyResults = (
        items: { imageUrl: string; seed: number }[],
      ) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === genId) {
              return {
                ...n,
                data: { ...n.data, status: 'done', progress: 100 },
              }
            }
            const ri = fillIds.indexOf(n.id)
            if (ri >= 0 && ri < items.length) {
              const r = items[ri]
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'ready',
                  imageUrl: r.imageUrl,
                  seed: r.seed,
                  promptSnapshot: snapshotPrompt,
                },
              }
            }
            return n
          }),
        )
        setQuota((q) => {
          const next = { ...q, used: Math.min(q.total, q.used + items.length) }
          saveQuota(next)
          return next
        })
        if (session?.token) {
          void consumeQuota(items.length)
            .then((ent) => {
              if (!ent) return
              const q = entitlementToQuota(ent)
              setQuota(q)
              saveQuota(q)
              setSession((prev) => (prev ? { ...prev, entitlement: ent } : prev))
            })
            .catch(() => {
              /* keep local decrement */
            })
        }
      }

      const finishErr = (message: string) => {
        patchNodeData(genId, {
          status: 'error',
          progress: 0,
          lastError: message.slice(0, 160),
        })
      }

      if (shouldUseMockGenerate()) {
        const delay = mockDelayMs()
        const t1 = window.setTimeout(() => {
          patchNodeData(genId, { status: 'generating', progress: 35 })
        }, 400)
        const t2 = window.setTimeout(() => {
          patchNodeData(genId, { progress: 70 })
        }, Math.floor(delay * 0.55))
        const t3 = window.setTimeout(() => {
          const items = Array.from({ length: want }, () => {
            const seed = randomSeed()
            return {
              seed,
              imageUrl: buildPlaceholderImage({
                seed,
                style,
                view,
                aspect: mockAspect,
                title: positive,
              }),
            }
          })
          applyResults(items)
        }, delay)
        timers.current.push(t1, t2, t3)
        return
      }

      const tQueued = window.setTimeout(() => {
        patchNodeData(genId, { status: 'generating', progress: 18 })
      }, 300)
      timers.current.push(tQueued)

      const started = Date.now()
      const progressTimer = window.setInterval(() => {
        const elapsed = Date.now() - started
        const p = Math.min(90, 18 + Math.floor(elapsed / 1000) * 3)
        patchNodeData(genId, { status: 'generating', progress: p })
      }, 1200)
      timers.current.push(progressTimer)

      void (async () => {
        try {
          const genReq = {
            prompt: snapshotPrompt,
            size,
            model,
            ...(aspectRatio ? { aspectRatio } : {}),
            ...refPick,
          }
          // SCAPI has no bound `n` — one submit per result slot (multi-out)
          // Multi-ref: genReq.urls already carries every connected https/demo ref.
          const results: { imageUrl: string; taskId: string }[] = []
          let lastErr: string | null = null
          for (let i = 0; i < want; i++) {
            patchNodeData(genId, {
              status: 'generating',
              progress: Math.min(92, 18 + Math.round(((i + 0.5) / want) * 70)),
            })
            try {
              results.push(await scapiGenerate(genReq))
            } catch (err) {
              lastErr = err instanceof Error ? err.message : String(err)
              break
            }
          }
          window.clearInterval(progressTimer)
          if (results.length) {
            applyResults(
              results.map((r) => ({
                imageUrl: r.imageUrl,
                seed: taskIdToSeed(r.taskId),
              })),
            )
          }
          if (lastErr) {
            finishErr(
              results.length
                ? `${lastErr}（已完成 ${results.length}/${want}）`
                : lastErr || t('genFailed'),
            )
          }
        } catch (err) {
          window.clearInterval(progressTimer)
          const msg = err instanceof Error ? err.message : String(err)
          finishErr(msg || t('genFailed'))
        }
      })()
    },
    [
      edges,
      labels,
      nodes,
      patchNodeData,
      quota.total,
      quota.used,
      screenToFlowPosition,
      session?.token,
      setEdges,
      setNodes,
      t,
    ],
  )

  const useAsRef = useCallback(
    (resultId: string) => {
      const result = nodes.find((n) => n.id === resultId)
      const data = result?.data as ResultNodeData | undefined
      if (!result || !data?.imageUrl) return
      const upload = createNode(
        'upload',
        {
          x: result.position.x + 320,
          y: result.position.y,
        },
        labels,
      )
      upload.data = {
        label: labels.upload,
        imageUrl: data.imageUrl,
        fileName: `result-seed-${data.seed ?? 'ref'}.png`,
      }
      setNodes((nds) => [...nds, upload])
    },
    [labels, nodes, setNodes],
  )

  /** Spawn an inpaint node linked from a result image. */
  const useAsInpaint = useCallback(
    (resultId: string) => {
      const result = nodes.find((n) => n.id === resultId)
      const data = result?.data as ResultNodeData | undefined
      if (!result || !data?.imageUrl) return
      const inpaint = createNode(
        'inpaint',
        { x: result.position.x + 360, y: result.position.y },
        labels,
      )
      setNodes((nds) => [...nds, inpaint])
      setEdges((eds) =>
        addEdge(
          {
            id: `e-${resultId}-${inpaint.id}`,
            source: resultId,
            target: inpaint.id,
            sourceHandle: 'out',
            targetHandle: 'image',
            style: { strokeWidth: 2.5, stroke: '#ec4899' },
          },
          eds,
        ),
      )
    },
    [labels, nodes, setEdges, setNodes],
  )

  const runInpaint = useCallback(
    (inpaintId: string) => {
      const inpaintToken = session?.token || loadSession()?.token
      if (!inpaintToken) {
        setAuthMode('login')
        setAuthOpen(true)
        patchNodeData(inpaintId, { status: 'error', lastError: t('authLoginRequired') })
        return
      }
      if (!session?.token) {
        const restored = loadSession()
        if (restored) setSession(restored)
      }
      if (quota.used >= quota.total) {
        patchNodeData(inpaintId, { status: 'error', lastError: t('quotaExhausted') })
        return
      }

      const incoming = edges.filter((e) => e.target === inpaintId)
      const sourceIds = incoming.map((e) => e.source)
      const related = nodes.filter((n) => sourceIds.includes(n.id))
      const srcNode = related.find((n) => n.type === 'result' || n.type === 'upload')
      const srcUrl =
        (srcNode?.data as { imageUrl?: string } | undefined)?.imageUrl
      const inpaintData = nodes.find((n) => n.id === inpaintId)?.data as InpaintNodeData | undefined
      if (!srcUrl) {
        patchNodeData(inpaintId, { status: 'error', lastError: t('inpaintNeedSource') })
        return
      }

      const editPrompt = inpaintData?.prompt ?? ''
      const hasMask = Boolean(inpaintData?.maskDataUrl)
      const composed = composeInpaintPrompt(editPrompt, hasMask)
      const model = inpaintData?.model ?? DEFAULT_MODEL
      const size = clampSizeForModel(model, inpaintData?.size ?? DEFAULT_SIZE)
      const refPick = collectRefsForScapi([srcUrl])

      const inpaintNode = nodes.find((n) => n.id === inpaintId)
      const basePos = inpaintNode
        ? { x: inpaintNode.position.x + 340, y: inpaintNode.position.y }
        : screenToFlowPosition({ x: 700, y: 240 })

      const existingResultIds = edges
        .filter((e) => e.source === inpaintId)
        .map((e) => e.target)
        .filter((tid) => nodes.some((n) => n.id === tid && n.type === 'result'))

      let resultId = existingResultIds[0]
      const newNodes: Node[] = []
      let newEdge: {
        id: string
        source: string
        target: string
        sourceHandle: string
        targetHandle: string
        style: { strokeWidth: number; stroke: string }
      } | null = null

      if (!resultId) {
        const resultNode = createNode('result', basePos, labels)
        resultId = resultNode.id
        newNodes.push(resultNode)
        newEdge = {
          id: `e-${inpaintId}-${resultId}`,
          source: inpaintId,
          target: resultId,
          sourceHandle: 'out',
          targetHandle: 'in',
          style: { strokeWidth: 2.5, stroke: '#14b8a6' },
        }
      }

      setNodes((nds) => {
        const mapped = nds.map((n) => {
          if (n.id === inpaintId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'queued',
                progress: 10,
                lastError: undefined,
              },
            }
          }
          if (n.id === resultId && n.type === 'result') {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'placeholder',
                imageUrl: undefined,
                seed: undefined,
                promptSnapshot: undefined,
              },
            }
          }
          return n
        })
        return newNodes.length ? [...mapped, ...newNodes] : mapped
      })
      if (newEdge) {
        setEdges((eds) => addEdge(newEdge!, eds))
      }

      const finishErr = (message: string) => {
        patchNodeData(inpaintId, {
          status: 'error',
          progress: 0,
          lastError: message.slice(0, 160),
        })
      }

      if (shouldUseMockGenerate()) {
        const delay = mockDelayMs()
        const t1 = window.setTimeout(() => {
          patchNodeData(inpaintId, { status: 'generating', progress: 40 })
        }, 300)
        const t2 = window.setTimeout(() => {
          const seed = randomSeed()
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === inpaintId) {
                return { ...n, data: { ...n.data, status: 'done', progress: 100 } }
              }
              if (n.id === resultId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    status: 'ready',
                    imageUrl: srcUrl,
                    seed,
                    promptSnapshot: composed,
                  },
                }
              }
              return n
            }),
          )
          setQuota((q) => {
            const next = { ...q, used: Math.min(q.total, q.used + 1) }
            saveQuota(next)
            return next
          })
        }, delay)
        timers.current.push(t1, t2)
        return
      }

      const progressTimer = window.setInterval(() => {
        patchNodeData(inpaintId, {
          status: 'generating',
          progress: Math.min(90, 18 + Math.floor((Date.now() % 60000) / 1000) * 2),
        })
      }, 1200)
      timers.current.push(progressTimer)

      void (async () => {
        try {
          patchNodeData(inpaintId, { status: 'generating', progress: 22 })
          let imageUrl = ''
          let seed = 0
          let promptSnap = composed
          let usedNative = false

          const tryFal =
            Boolean(inpaintData?.maskDataUrl) &&
            (srcUrl.startsWith('http') || srcUrl.startsWith('data:') || srcUrl.startsWith('/demo/'))

          if (tryFal) {
            try {
              const falReq: Parameters<typeof falInpaint>[0] = {
                prompt: editPrompt.trim() || 'Edit the masked region naturally, preserve unmasked pixels.',
                maskDataUrl: inpaintData!.maskDataUrl,
              }
              if (/^https?:\/\//i.test(srcUrl) || srcUrl.startsWith('/demo/')) {
                falReq.imageUrl = srcUrl.startsWith('/demo/')
                  ? `https://canno3d.com${srcUrl}`
                  : srcUrl
              } else if (srcUrl.startsWith('data:')) {
                falReq.imageDataUrl = srcUrl
              }
              const r = await falInpaint(falReq)
              imageUrl = r.imageUrl
              seed = taskIdToSeed(r.requestId)
              promptSnap = editPrompt.trim() || composed
              usedNative = true
            } catch (falErr) {
              if (!shouldFallbackFromFal(falErr)) throw falErr
              // fall through to SCAPI
            }
          }

          if (!imageUrl) {
            const r = await scapiGenerate({
              prompt: composed,
              size,
              model,
              ...refPick,
            })
            imageUrl = r.imageUrl
            seed = taskIdToSeed(r.taskId)
            if (inpaintData?.maskDataUrl) {
              try {
                imageUrl = await compositeMaskedResult(
                  srcUrl,
                  r.imageUrl,
                  inpaintData.maskDataUrl,
                )
                promptSnap = composed
              } catch {
                promptSnap = composed
              }
            }
          }

          window.clearInterval(progressTimer)
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === inpaintId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    status: 'done',
                    progress: 100,
                    lastEngine: usedNative ? 'fal-flux-fill' : 'scapi',
                  },
                }
              }
              if (n.id === resultId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    status: 'ready',
                    imageUrl,
                    seed,
                    promptSnapshot: promptSnap,
                  },
                }
              }
              return n
            }),
          )
          setQuota((q) => {
            const next = { ...q, used: Math.min(q.total, q.used + 1) }
            saveQuota(next)
            return next
          })
          if (session?.token) {
            void consumeQuota(1)
              .then((ent) => {
                if (!ent) return
                const q = entitlementToQuota(ent)
                setQuota(q)
                saveQuota(q)
                setSession((prev) => (prev ? { ...prev, entitlement: ent } : prev))
              })
              .catch(() => {})
          }
        } catch (err) {
          window.clearInterval(progressTimer)
          const msg = err instanceof Error ? err.message : String(err)
          finishErr(msg || t('genFailed'))
        }
      })()
    },
    [
      edges,
      labels,
      nodes,
      patchNodeData,
      quota.total,
      quota.used,
      screenToFlowPosition,
      session?.token,
      setEdges,
      setNodes,
      t,
    ],
  )


  /** Spawn a post-process tool node linked from a result. */
  const spawnToolFromResult = useCallback(
    (resultId: string, mode: 'night' | 'weather' | 'detail' | 'multiview') => {
      const result = nodes.find((n) => n.id === resultId)
      const data = result?.data as ResultNodeData | undefined
      if (!result || !data?.imageUrl) return
      const tool = createNode(
        'tool',
        { x: result.position.x + 360, y: result.position.y + 40 },
        labels,
      )
      tool.data = {
        ...(tool.data as ToolNodeData),
        mode,
        weather: mode === 'weather' ? 'rain' : 'clear',
        label:
          mode === 'night'
            ? labels.tool + ' · ' + '夜景'
            : mode === 'weather'
              ? labels.tool + ' · ' + '天气'
              : mode === 'detail'
                ? labels.tool + ' · ' + '细节'
                : labels.tool + ' · ' + '多视角',
      }
      setNodes((nds) => [...nds, tool])
      setEdges((eds) =>
        addEdge(
          {
            id: `e-${resultId}-${tool.id}`,
            source: resultId,
            target: tool.id,
            sourceHandle: 'out',
            targetHandle: 'image',
            style: { strokeWidth: 2.5, stroke: '#7c3aed' },
          },
          eds,
        ),
      )
    },
    [labels, nodes, setEdges, setNodes],
  )

  const runTool = useCallback(
    (toolId: string) => {
      const toolToken = session?.token || loadSession()?.token
      if (!toolToken) {
        setAuthMode('login')
        setAuthOpen(true)
        patchNodeData(toolId, { status: 'error', lastError: t('authLoginRequired') })
        return
      }
      if (!session?.token) {
        const restored = loadSession()
        if (restored) setSession(restored)
      }
      if (quota.used >= quota.total) {
        patchNodeData(toolId, { status: 'error', lastError: t('quotaExhausted') })
        return
      }

      const incoming = edges.filter((e) => e.target === toolId)
      const related = nodes.filter((n) => incoming.some((e) => e.source === n.id))
      const toolData = nodes.find((n) => n.id === toolId)?.data as ToolNodeData | undefined
      const mode: ToolMode = toolData?.mode || 'night'

      const imageEdge = incoming.find((e) => !e.targetHandle || e.targetHandle === 'image')
      const refEdge = incoming.find((e) => e.targetHandle === 'ref')
      // Prefer explicit image handle; fallback first result/upload
      const srcFromHandle = imageEdge
        ? nodes.find((n) => n.id === imageEdge.source)
        : related.find((n) => n.type === 'result' || n.type === 'upload')
      const srcUrl = (srcFromHandle?.data as { imageUrl?: string } | undefined)?.imageUrl
      const refNode = refEdge
        ? nodes.find((n) => n.id === refEdge.source)
        : related.find(
            (n) =>
              (n.type === 'upload' || n.type === 'styleref' || n.type === 'result') &&
              n.id !== srcFromHandle?.id,
          )
      const refUrl = (refNode?.data as { imageUrl?: string } | undefined)?.imageUrl

      if (!srcUrl) {
        patchNodeData(toolId, { status: 'error', lastError: t('toolNeedSource') })
        return
      }
      if ((mode === 'materialMigrate' || mode === 'replace') && !refUrl) {
        patchNodeData(toolId, { status: 'error', lastError: t('toolNeedRef') })
        return
      }

      let composed = ''
      if (mode === 'night') composed = composeNightPrompt()
      else if (mode === 'weather')
        composed = composeWeatherConvertPrompt((toolData?.weather || 'rain') as WeatherPreset)
      else if (mode === 'detail') composed = composeDetailEnhancePrompt()
      else if (mode === 'materialMigrate')
        composed = composeMaterialMigratePrompt(toolData?.prompt)
      else if (mode === 'replace')
        composed = composeReplacePrompt(toolData?.prompt || '', Boolean(toolData?.maskDataUrl))
      else if (mode === 'multiview') composed = 'multiview' // special
      else composed = composeDetailEnhancePrompt()

      const model = toolData?.model ?? DEFAULT_MODEL
      const size = clampSizeForModel(model, toolData?.size ?? DEFAULT_SIZE)
      const refPick = collectRefsForScapi(
        mode === 'materialMigrate' || mode === 'replace' ? [srcUrl, refUrl] : [srcUrl],
      )

      const toolNode = nodes.find((n) => n.id === toolId)
      const basePos = toolNode
        ? { x: toolNode.position.x + 340, y: toolNode.position.y }
        : screenToFlowPosition({ x: 700, y: 240 })

      const want = mode === 'multiview' ? 3 : 1
      const viewKinds = ['front', 'side', 'bird'] as const

      const existingResultIds = edges
        .filter((e) => e.source === toolId)
        .map((e) => e.target)
        .filter((tid) => nodes.some((n) => n.id === tid && n.type === 'result'))

      const slotIds: string[] = [...existingResultIds]
      const newResultNodes: typeof nodes = []
      const newResultEdges: {
        id: string
        source: string
        target: string
        sourceHandle: string
        targetHandle: string
        style: { strokeWidth: number; stroke: string }
      }[] = []

      while (slotIds.length < want) {
        const idx = slotIds.length
        const resultNode = createNode(
          'result',
          { x: basePos.x, y: basePos.y + idx * 220 },
          labels,
        )
        slotIds.push(resultNode.id)
        newResultNodes.push(resultNode)
        newResultEdges.push({
          id: `e-${toolId}-${resultNode.id}`,
          source: toolId,
          target: resultNode.id,
          sourceHandle: 'out',
          targetHandle: 'in',
          style: { strokeWidth: 2.5, stroke: '#14b8a6' },
        })
      }
      const fillIds = slotIds.slice(0, want)

      setNodes((nds) => {
        const mapped = nds.map((n) => {
          if (n.id === toolId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'queued',
                progress: 10,
                lastError: undefined,
              },
            }
          }
          if (fillIds.includes(n.id) && n.type === 'result') {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'placeholder',
                imageUrl: undefined,
                seed: undefined,
                promptSnapshot: undefined,
              },
            }
          }
          return n
        })
        return newResultNodes.length ? [...mapped, ...newResultNodes] : mapped
      })
      setEdges((eds) => {
        let next = eds
        for (const rid of fillIds) {
          if (next.some((e) => e.source === toolId && e.target === rid)) continue
          const crafted =
            newResultEdges.find((e) => e.target === rid) ?? {
              id: `e-${toolId}-${rid}`,
              source: toolId,
              target: rid,
              sourceHandle: 'out',
              targetHandle: 'in',
              style: { strokeWidth: 2.5, stroke: '#14b8a6' },
            }
          next = addEdge(crafted, next)
        }
        return next
      })

      const finishErr = (message: string) => {
        patchNodeData(toolId, {
          status: 'error',
          progress: 0,
          lastError: message.slice(0, 160),
        })
      }

      const applyItems = (
        items: { imageUrl: string; seed: number; prompt: string }[],
      ) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === toolId) {
              return { ...n, data: { ...n.data, status: 'done', progress: 100 } }
            }
            const ri = fillIds.indexOf(n.id)
            if (ri >= 0 && ri < items.length) {
              const r = items[ri]
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'ready',
                  imageUrl: r.imageUrl,
                  seed: r.seed,
                  promptSnapshot: r.prompt,
                },
              }
            }
            return n
          }),
        )
        setQuota((q) => {
          const next = { ...q, used: Math.min(q.total, q.used + items.length) }
          saveQuota(next)
          return next
        })
        if (session?.token) {
          void consumeQuota(items.length)
            .then((ent) => {
              if (!ent) return
              const q = entitlementToQuota(ent)
              setQuota(q)
              saveQuota(q)
              setSession((prev) => (prev ? { ...prev, entitlement: ent } : prev))
            })
            .catch(() => {})
        }
      }

      if (shouldUseMockGenerate()) {
        const delay = mockDelayMs()
        const tmr = window.setTimeout(() => {
          applyItems(
            fillIds.map((_, i) => ({
              imageUrl: srcUrl,
              seed: randomSeed(),
              prompt:
                mode === 'multiview'
                  ? composeMultiViewPrompt(viewKinds[i] || 'front')
                  : composed,
            })),
          )
        }, delay)
        timers.current.push(tmr)
        return
      }

      const progressTimer = window.setInterval(() => {
        patchNodeData(toolId, {
          status: 'generating',
          progress: Math.min(90, 18 + Math.floor((Date.now() % 60000) / 1000) * 2),
        })
      }, 1200)
      timers.current.push(progressTimer)

      void (async () => {
        try {
          patchNodeData(toolId, { status: 'generating', progress: 22 })
          const results: { imageUrl: string; seed: number; prompt: string }[] = []
          let lastErr: string | null = null
          for (let i = 0; i < want; i++) {
            const prompt =
              mode === 'multiview'
                ? composeMultiViewPrompt(viewKinds[i] || 'front')
                : composed
            try {
              let imageUrl = ''
              let seed = 0
              let promptSnap = prompt

              // Object replace with brush mask → Fal native inpaint first
              if (
                mode === 'replace' &&
                toolData?.maskDataUrl &&
                i === 0 &&
                (srcUrl.startsWith('http') ||
                  srcUrl.startsWith('data:') ||
                  srcUrl.startsWith('/demo/'))
              ) {
                try {
                  const falPrompt =
                    (toolData.prompt || '').trim() ||
                    'Replace the masked object with the described subject; keep unmasked regions unchanged.'
                  const falReq: Parameters<typeof falInpaint>[0] = {
                    prompt: falPrompt,
                    maskDataUrl: toolData.maskDataUrl,
                  }
                  if (/^https?:\/\//i.test(srcUrl) || srcUrl.startsWith('/demo/')) {
                    falReq.imageUrl = srcUrl.startsWith('/demo/')
                      ? `https://canno3d.com${srcUrl}`
                      : srcUrl
                  } else if (srcUrl.startsWith('data:')) {
                    falReq.imageDataUrl = srcUrl
                  }
                  const fr = await falInpaint(falReq)
                  imageUrl = fr.imageUrl
                  seed = taskIdToSeed(fr.requestId)
                  promptSnap = falPrompt
                } catch (falErr) {
                  if (!shouldFallbackFromFal(falErr)) throw falErr
                }
              }

              if (!imageUrl) {
                const r = await scapiGenerate({
                  prompt,
                  size,
                  model,
                  ...refPick,
                })
                imageUrl = r.imageUrl
                seed = taskIdToSeed(r.taskId)
                if (mode === 'replace' && toolData?.maskDataUrl) {
                  try {
                    imageUrl = await compositeMaskedResult(
                      srcUrl,
                      r.imageUrl,
                      toolData.maskDataUrl,
                    )
                    promptSnap = prompt
                  } catch {
                    /* keep scapi image */
                  }
                }
              }

              results.push({
                imageUrl,
                seed,
                prompt: promptSnap,
              })
            } catch (err) {
              lastErr = err instanceof Error ? err.message : String(err)
              break
            }
          }
          window.clearInterval(progressTimer)
          if (results.length) applyItems(results)
          if (lastErr) {
            finishErr(
              results.length
                ? `${lastErr}（已完成 ${results.length}/${want}）`
                : lastErr || t('genFailed'),
            )
          }
        } catch (err) {
          window.clearInterval(progressTimer)
          const msg = err instanceof Error ? err.message : String(err)
          finishErr(msg || t('genFailed'))
        }
      })()
    },
    [
      edges,
      labels,
      nodes,
      patchNodeData,
      quota.total,
      quota.used,
      screenToFlowPosition,
      session?.token,
      setEdges,
      setNodes,
      t,
    ],
  )


  const nodesWithHandlers = useMemo(() => {
    return nodes.map((n) => {
      if (n.type === 'generate') {
        return {
          ...n,
          deletable: true,
          data: {
            ...n.data,
            onGenerate: runGenerate,
          },
        }
      }
      if (n.type === 'result') {
        return {
          ...n,
          deletable: true,
          data: {
            ...n.data,
            onUseAsRef: useAsRef,
            onLocalInpaint: useAsInpaint,
            onSpawnTool: spawnToolFromResult,
          },
        }
      }
      if (n.type === 'inpaint') {
        const incoming = edges.filter((e) => e.target === n.id)
        const src = nodes.find(
          (x) =>
            incoming.some((e) => e.source === x.id) &&
            (x.type === 'result' || x.type === 'upload'),
        )
        const sourceImageUrl = (src?.data as { imageUrl?: string } | undefined)?.imageUrl
        return {
          ...n,
          deletable: true,
          data: {
            ...n.data,
            onInpaint: runInpaint,
            sourceImageUrl,
          },
        }
      }
      if (n.type === 'colorzones') {
        const incoming = edges.filter((e) => e.target === n.id)
        const src = nodes.find(
          (x) =>
            incoming.some((e) => e.source === x.id) &&
            (x.type === 'result' || x.type === 'upload'),
        )
        const sourceImageUrl = (src?.data as { imageUrl?: string } | undefined)?.imageUrl
        return {
          ...n,
          deletable: true,
          data: {
            ...n.data,
            sourceImageUrl,
          },
        }
      }
      if (n.type === 'tool') {
        const incoming = edges.filter((e) => e.target === n.id)
        const imageEdge = incoming.find((e) => !e.targetHandle || e.targetHandle === 'image')
        const refEdge = incoming.find((e) => e.targetHandle === 'ref')
        const srcNode = imageEdge
          ? nodes.find((x) => x.id === imageEdge.source)
          : nodes.find(
              (x) =>
                incoming.some((e) => e.source === x.id) &&
                (x.type === 'result' || x.type === 'upload'),
            )
        const refNode = refEdge
          ? nodes.find((x) => x.id === refEdge.source)
          : nodes.find(
              (x) =>
                incoming.some((e) => e.source === x.id) &&
                x.id !== srcNode?.id &&
                (x.type === 'upload' || x.type === 'styleref' || x.type === 'result'),
            )
        return {
          ...n,
          deletable: true,
          data: {
            ...n.data,
            onRunTool: runTool,
            sourceImageUrl: (srcNode?.data as { imageUrl?: string } | undefined)?.imageUrl,
            refImageUrl: (refNode?.data as { imageUrl?: string } | undefined)?.imageUrl,
          },
        }
      }
      return { ...n, deletable: true }
    })
  }, [
    edges,
    nodes,
    runGenerate,
    runInpaint,
    runTool,
    spawnToolFromResult,
    useAsInpaint,
    useAsRef,
  ])

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      upload: UploadNode,
      prompt: PromptNode,
      params: ParamsNode,
      generate: GenerateNode,
      result: ResultNode,
      inpaint: InpaintNode,
      colorzones: ColorZonesNode,
      styleref: StyleRefNode,
      tool: ToolNode,
    }),
    [],
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (wouldCreateCycle(edges, connection.source, connection.target)) return
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            type: 'default',
            style: { strokeWidth: 2.5, stroke: '#94a3b8' },
          },
          eds,
        ),
      )
    },
    [edges, setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false
      if (connection.source === connection.target) return false
      return !wouldCreateCycle(edges, connection.source, connection.target)
    },
    [edges],
  )

  const addNode = useCallback(
    (type: NodeKind) => {
      const pos = screenToFlowPosition({
        x: window.innerWidth / 2 + 80 + (Math.random() * 80 - 40),
        y: window.innerHeight / 2 + (Math.random() * 80 - 40),
      })
      setNodes((nds) => [...nds, createNode(type, pos, labels)])
    },
    [labels, screenToFlowPosition, setNodes],
  )

  const handleSave = useCallback(() => {
    const clean = nodes.map((n) => {
      if (
        n.type === 'generate' ||
        n.type === 'result' ||
        n.type === 'inpaint' ||
        n.type === 'colorzones' ||
        n.type === 'tool'
      ) {
        const {
          onGenerate: _g,
          onUseAsRef: _u,
          onLocalInpaint: _i,
          onInpaint: _p,
          onSpawnTool: _sp,
          onRunTool: _rt,
          sourceImageUrl: _s,
          ...rest
        } = n.data as Record<string, unknown>
        return { ...n, data: rest }
      }
      return n
    })
    saveGraph(clean, edges)
    setSavedHint(t('savedHint'))
    window.setTimeout(() => setSavedHint(null), 1800)
  }, [edges, nodes, t])


  const handleNew = useCallback(() => {
    if (!window.confirm(t('confirmNew'))) return
    clearGraph()
    setNodes([])
    setEdges([])
  }, [setEdges, setNodes, t])

  const pendingGalleryRef = useRef(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleOpenGallery = useCallback(() => {
    const token = session?.token || loadSession()?.token
    if (!token) {
      pendingGalleryRef.current = true
      setAuthMode('login')
      setAuthOpen(true)
      return
    }
    if (!session?.token) {
      const restored = loadSession()
      if (restored) setSession(restored)
    }
    setGalleryOpen(true)
  }, [session?.token])

  const handleSelectTemplate = useCallback(
    (tpl: TemplateDef) => {
      const { nodes: n, edges: e } = buildTemplateGraph(tpl)
      setNodes(sanitizeNodes(n as Node[]))
      setEdges(e)
      setGalleryOpen(false)
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
    },
    [fitView, setEdges, setNodes],
  )

  /** Empty-state / TopBar 「模板」→ gallery; guests get AuthModal instead */
  const handleLoadDemo = handleOpenGallery

  const stripRuntimeHandlers = useCallback((nds: Node[]) => {
    return nds.map((n) => {
      if (
        n.type === 'generate' ||
        n.type === 'result' ||
        n.type === 'inpaint' ||
        n.type === 'colorzones' ||
        n.type === 'tool'
      ) {
        const {
          onGenerate: _g,
          onUseAsRef: _u,
          onLocalInpaint: _i,
          onInpaint: _p,
          onSpawnTool: _sp,
          onRunTool: _rt,
          sourceImageUrl: _s,
          ...rest
        } = n.data as Record<string, unknown>
        return { ...n, data: rest }
      }
      return n
    })
  }, [])

  const handleExport = useCallback(() => {
    const clean = stripRuntimeHandlers(nodes)
    const payload = {
      nodes: clean,
      edges,
      savedAt: Date.now(),
      version: 1,
      app: 'canno3d',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `canno3d-workflow-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setSavedHint(t('exportedHint'))
    window.setTimeout(() => setSavedHint(null), 1800)
  }, [edges, nodes, stripRuntimeHandlers, t])

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as {
          nodes?: Node[]
          edges?: Edge[]
        }
        if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
          window.alert(t('importInvalid'))
          return
        }
        const clean = sanitizeNodes(parsed.nodes)
        if (clean.length === 0) {
          window.alert(t('importInvalid'))
          return
        }
        const ids = new Set(clean.map((n) => n.id))
        const nextEdges = (parsed.edges as Edge[]).filter(
          (e) => e && ids.has(e.source) && ids.has(e.target),
        )
        setNodes(clean)
        setEdges(nextEdges)
        saveGraph(clean, nextEdges)
        setGalleryOpen(false)
        setSavedHint(t('importedHint'))
        window.setTimeout(() => setSavedHint(null), 1800)
        requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
      } catch {
        window.alert(t('importInvalid'))
      } finally {
        if (importInputRef.current) importInputRef.current.value = ''
      }
    },
    [fitView, setEdges, setNodes, t],
  )

  const handleRunAll = useCallback(() => {
    const gens = nodes.filter((n) => n.type === 'generate')
    for (const g of gens) runGenerate(g.id)
  }, [nodes, runGenerate])

  return (
    <div className="app-shell">
      <TopBar
        quotaUsed={quota.used}
        quotaTotal={quota.total}
        quotaUnlimited={!!quota.unlimited}
        savedHint={savedHint}
        accountEmail={session?.email ?? null}
        onRun={handleRunAll}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImportClick}
        onNew={handleNew}
        onLoadDemo={handleLoadDemo}
        onBuy={() => setPricingOpen(true)}
        onSignIn={() => {
          setAuthMode('login')
          setAuthOpen(true)
        }}
        onSignUp={() => {
          setAuthMode('register')
          setAuthOpen(true)
        }}
        onSignOut={() => {
          pendingGalleryRef.current = false
          setGalleryOpen(false)
          void logoutAccount().finally(() => {
            setSession(null)
            const q = loadQuota()
            setQuota(q)
          })
        }}
      />
      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={(next) => {
          setSession(next)
          const q = entitlementToQuota(next.entitlement)
          setQuota(q)
          saveQuota(q)
          if (pendingGalleryRef.current) {
            pendingGalleryRef.current = false
            setGalleryOpen(true)
          }
        }}
      />
      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        onNeedLogin={() => {
          setPricingOpen(false)
          setAuthMode('login')
          setAuthOpen(true)
        }}
        onEntitlement={(next) => {
          setSession(next)
          const q = entitlementToQuota(next.entitlement)
          setQuota(q)
          saveQuota(q)
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          void handleImportFile(f)
        }}
      />
      <TemplateGallery
        open={galleryOpen && !!(session?.token || loadSession()?.token)}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleSelectTemplate}
      />
      <div className="app-main">
        <NodePalette onAdd={addNode} />
        <div className="canvas-wrap">
          {booted && nodes.length === 0 ? (
            <EmptyState onLoadDemo={handleLoadDemo} onAddGenerate={() => addNode('generate')} />
          ) : null}
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: 'default',
              animated: false,
              style: { strokeWidth: 2.5, stroke: '#94a3b8' },
            }}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2.25 }}
            connectionRadius={28}
            snapToGrid
            snapGrid={[18, 18]}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Meta', 'Control']}
            nodesDraggable
            nodesConnectable
            elementsSelectable
          >
            {showGrid ? (
              <Background
                id="dots"
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1.2}
                color="#c9ced8"
              />
            ) : null}
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              /* Compact transparent overview; nodes visually scaled down via CSS */
              style={{ width: 148, height: 100, marginBottom: 0, marginLeft: 0 }}
              bgColor="transparent"
              maskColor="rgba(0,0,0,0)"
              maskStrokeColor="transparent"
              maskStrokeWidth={0}
              nodeStrokeColor="transparent"
              nodeStrokeWidth={0}
              nodeBorderRadius={2}
              nodeClassName="tc-minimap-node"
              nodeColor={(n) => {
                switch (n.type) {
                  case 'upload':
                    return '#0ea5e9'
                  case 'prompt':
                    return '#a855f7'
                  case 'params':
                    return '#8b5cf6'
                  case 'generate':
                    return '#f59e0b'
                  case 'result':
                    return '#14b8a6'
                  case 'inpaint':
                    return '#ec4899'
                  case 'colorzones':
                    return '#f97316'
                  case 'styleref':
                    return '#8b5cf6'
                  case 'tool':
                    return '#7c3aed'
                  default:
                    return '#94a3b8'
                }
              }}
            />
            <ZoomReporter onZoom={setZoomPct} />
          </ReactFlow>
        </div>
      </div>
      <StatusBar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        zoomPct={zoomPct}
        savedAgo={savedHint ? 'just now' : null}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
      />
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
