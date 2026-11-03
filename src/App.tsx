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
import { EmptyState } from './components/EmptyState'
import { NodePalette } from './components/NodePalette'
import { Preview3DModal } from './components/Preview3DModal'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { GenerateNode } from './components/nodes/GenerateNode'
import { ParamsNode } from './components/nodes/ParamsNode'
import { Preview3DNode } from './components/nodes/Preview3DNode'
import { PromptNode } from './components/nodes/PromptNode'
import { ResultNode } from './components/nodes/ResultNode'
import { UploadNode } from './components/nodes/UploadNode'
import { DEMO_EDGES, DEMO_NODES } from './demoData'
import { useI18n } from './i18n'
import { buildPlaceholderImage, mockDelayMs, randomSeed } from './mockGenerate'
import { DEFAULT_MODEL, DEFAULT_SIZE } from './models'
import {
  pickRefForScapi,
  scapiGenerate,
  shouldUseMockGenerate,
  taskIdToSeed,
} from './scapiClient'
import { clearGraph, loadGraph, loadQuota, saveGraph, saveQuota } from './storage'
import type {
  GenerateNodeData,
  NodeKind,
  ParamsNodeData,
  PromptNodeData,
  ResultNodeData,
  StylePreset,
  UploadNodeData,
  ViewAngle,
  AspectRatio,
} from './types'
import { PROMPT_PRESETS } from './types'

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

function createNode(type: NodeKind, position: { x: number; y: number }, labels: Record<string, string>): Node {
  const id = nextId(type)
  switch (type) {
    case 'upload':
      return {
        id,
        type,
        position,
        data: { label: labels.upload },
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
      }
    }
    case 'params':
      return {
        id,
        type,
        position,
        data: {
          label: labels.params,
          view: 'eye',
          style: 'modern',
          aspect: '16:9',
        } satisfies ParamsNodeData,
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
        } satisfies GenerateNodeData,
      }
    case 'result':
      return {
        id,
        type,
        position,
        data: { label: labels.result, status: 'placeholder' } satisfies ResultNodeData,
      }
    case 'preview3d':
      return {
        id,
        type,
        position,
        data: { label: labels.preview3d },
      }
  }
}

function ZoomReporter({ onZoom }: { onZoom: (pct: number) => void }) {
  const zoom = useStore((s) => s.transform[2])
  useEffect(() => {
    onZoom(Math.round(zoom * 100))
  }, [zoom, onZoom])
  return null
}

function CanvasInner() {
  const { t } = useI18n()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [quota, setQuota] = useState(loadQuota)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)
  const [zoomPct, setZoomPct] = useState(100)
  const [preview3d, setPreview3d] = useState<{ open: boolean; imageUrl?: string }>({
    open: false,
  })
  const { screenToFlowPosition, fitView } = useReactFlow()
  const timers = useRef<number[]>([])

  const labels = useMemo(
    () => ({
      upload: t('labelUpload'),
      prompt: t('labelPrompt'),
      params: t('labelParams'),
      generate: t('labelGenerate'),
      result: t('labelResult'),
      preview3d: t('labelPreview3d'),
    }),
    [t],
  )

  useEffect(() => {
    const saved = loadGraph()
    if (saved && saved.nodes.length > 0) {
      setNodes(saved.nodes)
      setEdges(saved.edges)
    } else {
      setNodes(DEMO_NODES as Node[])
      setEdges(DEMO_EDGES)
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
    }
    setBooted(true)
    return () => {
      for (const tmr of timers.current) window.clearTimeout(tmr)
    }
  }, [fitView, setEdges, setNodes])

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
      if (quota.used >= quota.total) {
        patchNodeData(genId, { status: 'error', lastError: t('quotaExhausted') })
        return
      }

      const incoming = edges.filter((e) => e.target === genId)
      const sourceIds = incoming.map((e) => e.source)
      const related = nodes.filter((n) => sourceIds.includes(n.id) || n.id === genId)

      const promptNode = related.find((n) => n.type === 'prompt')
      const paramsNode = related.find((n) => n.type === 'params')
      const uploadNode = related.find((n) => n.type === 'upload')
      const promptData = promptNode?.data as PromptNodeData | undefined
      const paramsData = paramsNode?.data as ParamsNodeData | undefined
      const uploadData = uploadNode?.data as UploadNodeData | undefined
      const genData = nodes.find((n) => n.id === genId)?.data as GenerateNodeData | undefined

      const view: ViewAngle = paramsData?.view ?? 'eye'
      const style: StylePreset = paramsData?.style ?? 'modern'
      const aspect: AspectRatio = paramsData?.aspect ?? '16:9'
      const positive = promptData?.positive ?? PROMPT_PRESETS.facade.positive
      const refPick = pickRefForScapi(uploadData?.imageUrl)
      const model = genData?.model ?? DEFAULT_MODEL
      const size = genData?.size ?? DEFAULT_SIZE

      let resultId = edges.find(
        (e) => e.source === genId && nodes.some((n) => n.id === e.target && n.type === 'result'),
      )?.target

      setNodes((nds) => {
        let next = nds.map((n) =>
          n.id === genId
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: 'queued',
                  progress: 8,
                  lastError: undefined,
                  onGenerate: (n.data as { onGenerate?: (id: string) => void }).onGenerate,
                },
              }
            : n,
        )

        if (!resultId) {
          const gen = next.find((n) => n.id === genId)
          const pos = gen
            ? { x: gen.position.x + 320, y: gen.position.y - 20 }
            : screenToFlowPosition({ x: 700, y: 240 })
          const resultNode = createNode('result', pos, labels)
          resultId = resultNode.id
          next = [...next, resultNode]
          setEdges((eds) =>
            addEdge(
              {
                id: `e-${genId}-${resultId}`,
                source: genId,
                target: resultId!,
                sourceHandle: 'out',
                targetHandle: 'in',
                style: { strokeWidth: 2.5, stroke: '#14b8a6' },
              },
              eds,
            ),
          )
        }
        return next
      })

      const finishOk = (imageUrl: string, seed: number) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === genId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'done',
                  progress: 100,
                },
              }
            }
            if (resultId && n.id === resultId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'ready',
                  imageUrl,
                  seed,
                  promptSnapshot: positive,
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
        const seed = randomSeed()
        const t1 = window.setTimeout(() => {
          patchNodeData(genId, { status: 'generating', progress: 35 })
        }, 400)
        const t2 = window.setTimeout(() => {
          patchNodeData(genId, { progress: 70 })
        }, Math.floor(delay * 0.55))
        const t3 = window.setTimeout(() => {
          const imageUrl = buildPlaceholderImage({
            seed,
            style,
            view,
            aspect,
            title: positive,
          })
          finishOk(imageUrl, seed)
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
          const styleHint =
            style === 'modern'
              ? 'modern minimal architecture'
              : style === 'neo-chinese'
                ? 'neo-Chinese architecture'
                : style === 'minimal'
                  ? 'minimal white architecture'
                  : style === 'luxury'
                    ? 'light luxury architecture'
                    : style === 'brutalist'
                      ? 'brutalist architecture'
                      : 'Scandinavian architecture'
          const viewHint =
            view === 'bird'
              ? 'aerial bird-eye view'
              : view === 'elevation'
                ? 'side elevation view'
                : 'eye-level perspective'
          const result = await scapiGenerate({
            prompt: `${positive}, ${styleHint}, ${viewHint}`,
            size,
            model,
            aspectRatio: aspect,
            ...refPick,
          })
          window.clearInterval(progressTimer)
          finishOk(result.imageUrl, taskIdToSeed(result.taskId))
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

  const open3d = useCallback((imageUrl: string) => {
    setPreview3d({ open: true, imageUrl })
  }, [])

  const nodesWithHandlers = useMemo(() => {
    return nodes.map((n) => {
      if (n.type === 'generate') {
        return {
          ...n,
          data: {
            ...n.data,
            onGenerate: runGenerate,
          },
        }
      }
      if (n.type === 'result') {
        return {
          ...n,
          data: {
            ...n.data,
            onUseAsRef: useAsRef,
            onOpen3D: open3d,
          },
        }
      }
      return n
    })
  }, [nodes, open3d, runGenerate, useAsRef])

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      upload: UploadNode,
      prompt: PromptNode,
      params: ParamsNode,
      generate: GenerateNode,
      result: ResultNode,
      preview3d: Preview3DNode,
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
      if (n.type === 'generate' || n.type === 'result') {
        const { onGenerate: _g, onUseAsRef: _u, onOpen3D: _o, ...rest } = n.data as Record<
          string,
          unknown
        >
        return { ...n, data: rest }
      }
      return n
    })
    saveGraph(clean, edges)
    setSavedHint(t('savedHint'))
    window.setTimeout(() => setSavedHint(null), 1800)
  }, [edges, nodes, t])

  const handleExport = useCallback(() => {
    const clean = nodes.map((n) => {
      if (n.type === 'generate' || n.type === 'result') {
        const { onGenerate: _g, onUseAsRef: _u, onOpen3D: _o, ...rest } = n.data as Record<
          string,
          unknown
        >
        return { ...n, data: rest }
      }
      return n
    })
    const blob = new Blob([JSON.stringify({ nodes: clean, edges }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thinking-canvas-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [edges, nodes])

  const handleNew = useCallback(() => {
    if (!window.confirm(t('confirmNew'))) return
    clearGraph()
    setNodes([])
    setEdges([])
  }, [setEdges, setNodes, t])

  const handleLoadDemo = useCallback(() => {
    setNodes(DEMO_NODES as Node[])
    setEdges(DEMO_EDGES)
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }))
  }, [fitView, setEdges, setNodes])

  const handleRunAll = useCallback(() => {
    const gens = nodes.filter((n) => n.type === 'generate')
    for (const g of gens) runGenerate(g.id)
  }, [nodes, runGenerate])

  return (
    <div className="app-shell">
      <TopBar
        quotaUsed={quota.used}
        quotaTotal={quota.total}
        savedHint={savedHint}
        onRun={handleRunAll}
        onSave={handleSave}
        onExport={handleExport}
        onNew={handleNew}
        onLoadDemo={handleLoadDemo}
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
            minZoom={0.25}
            maxZoom={2}
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
          >
            <Background
              id="dots"
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.2}
              color="#c9ced8"
            />
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              style={{ marginBottom: 48 }}
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
                  case 'preview3d':
                    return '#6366f1'
                  default:
                    return '#94a3b8'
                }
              }}
              maskColor="rgba(244,245,247,0.72)"
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
      />
      <Preview3DModal
        open={preview3d.open}
        imageUrl={preview3d.imageUrl}
        onClose={() => setPreview3d({ open: false })}
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
