import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { ToolMode, ToolNode as ToolNodeType, WeatherPreset } from '../../types'
import { TOOL_MODE_OPTIONS, WEATHER_OPTIONS } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, btnPrimary, inputClass, selectClass } from './nodeShell'

type Extra = {
  onRunTool?: (id: string) => void
  sourceImageUrl?: string
  /** Second ref: material or object */
  refImageUrl?: string
}

const BRUSH_SIZES = [12, 28, 48] as const

export function ToolNode({
  id,
  data,
}: NodeProps<ToolNodeType> & { data: ToolNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()
  const onRun = (data as Extra).onRunTool
  const sourceUrl = (data as Extra).sourceImageUrl
  const refUrl = (data as Extra).refImageUrl

  const mode: ToolMode = data.mode || 'night'
  const needsRef = mode === 'materialMigrate' || mode === 'replace'
  const needsMask = mode === 'replace'
  const busy = data.status === 'queued' || data.status === 'generating'

  const [maskOpen, setMaskOpen] = useState(false)
  const [brush, setBrush] = useState<(typeof BRUSH_SIZES)[number]>(28)
  const [erasing, setErasing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const painting = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const statusLabel =
    data.status === 'queued'
      ? t('statusQueued')
      : data.status === 'generating'
        ? t('statusGenerating')
        : data.status === 'done'
          ? t('statusDone')
          : data.status === 'error'
            ? t('statusError')
            : t('statusIdle')

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.naturalWidth) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    // Full-res mask for Fal native inpaint (CSS scales display)
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    if (data.maskDataUrl) {
      const prev = new Image()
      prev.onload = () => {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(prev, 0, 0, w, h)
      }
      prev.src = data.maskDataUrl
    }
  }, [data.maskDataUrl])

  useEffect(() => {
    if (!maskOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaskOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [maskOpen])

  const paintAt = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brush
    ctx.strokeStyle = erasing ? '#000000' : '#ffffff'
    ctx.beginPath()
    if (last.current) {
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(x, y)
    } else {
      ctx.moveTo(x, y)
      ctx.lineTo(x + 0.01, y)
    }
    ctx.stroke()
    last.current = { x, y }
  }

  const pointerPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const canRun =
    Boolean(sourceUrl) &&
    !busy &&
    (needsRef ? Boolean(refUrl) : true)

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id="image" className="handle-sky" style={{ top: '28%' }} />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '28%', transform: 'translate(-100%, -50%)' }}
      >
        {t('portImage')}
      </span>
      {needsRef ? (
        <>
          <Handle type="target" position={Position.Left} id="ref" className="handle-violet" style={{ top: '62%' }} />
          <span
            className="port-label left pointer-events-none absolute"
            style={{ left: -6, top: '62%', transform: 'translate(-100%, -50%)' }}
          >
            {mode === 'materialMigrate' ? t('portMaterial') : t('portObject')}
          </span>
        </>
      ) : null}

      <NodeShell
        title={data.label || t('toolTitle')}
        accent="#7c3aed"
        badge="TOOL"
        icon={<span className="text-[12px] text-violet-600">⚒</span>}
        widthClass="w-[320px]"
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
        footer={<div>{t('toolHint')}</div>}
      >
        <FieldLabel>{t('toolMode')}</FieldLabel>
        <select
          className={selectClass}
          value={mode}
          onChange={(e) => update({ mode: e.target.value as ToolMode })}
        >
          {TOOL_MODE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        {mode === 'weather' ? (
          <>
            <FieldLabel>{t('weather')}</FieldLabel>
            <select
              className={selectClass}
              value={data.weather || 'rain'}
              onChange={(e) => update({ weather: e.target.value as WeatherPreset })}
            >
              {WEATHER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {(mode === 'replace' || mode === 'materialMigrate') && (
          <>
            <FieldLabel>
              {mode === 'replace' ? t('replacePrompt') : t('materialMigrateNote')}
            </FieldLabel>
            <textarea
              className={`${inputClass} min-h-[56px] resize-y`}
              value={data.prompt || ''}
              placeholder={
                mode === 'replace' ? t('replacePromptPh') : t('materialMigrateNotePh')
              }
              onChange={(e) => update({ prompt: e.target.value })}
            />
          </>
        )}

        <FieldLabel>{t('toolSource')}</FieldLabel>
        <div className="flex h-24 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {sourceUrl ? (
            <img src={sourceUrl} alt="tool source" className="h-full w-full object-cover" />
          ) : (
            <div className="px-3 text-center text-[11px] text-muted">{t('toolNeedSource')}</div>
          )}
        </div>

        {needsRef ? (
          <>
            <FieldLabel>
              {mode === 'materialMigrate' ? t('toolMaterialRef') : t('toolObjectRef')}
            </FieldLabel>
            <div className="flex h-20 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
              {refUrl ? (
                <img src={refUrl} alt="tool ref" className="h-full w-full object-cover" />
              ) : (
                <div className="px-3 text-center text-[11px] text-muted">{t('toolNeedRef')}</div>
              )}
            </div>
          </>
        ) : null}

        {needsMask ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnGhost}
              disabled={!sourceUrl}
              onClick={() => setMaskOpen(true)}
            >
              {data.maskDataUrl ? t('inpaintEditMask') : t('inpaintDrawMask')}
            </button>
            {data.maskDataUrl ? (
              <button
                type="button"
                className={btnGhost}
                onClick={() => update({ maskDataUrl: undefined })}
              >
                {t('inpaintClearMask')}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <span>
            {t('status')}: {statusLabel}
          </span>
          {typeof data.progress === 'number' && busy ? <span>{data.progress}%</span> : null}
        </div>
        {data.lastError ? (
          <div className="rounded-[8px] border border-danger/30 bg-danger/5 px-2 py-1.5 text-[11px] text-danger">
            {data.lastError}
          </div>
        ) : null}

        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!canRun}
          onClick={() => onRun?.(id)}
        >
          {busy
            ? t('generating')
            : mode === 'multiview'
              ? t('toolRunMultiview')
              : t('toolRun')}
        </button>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="out" className="handle-violet" style={{ top: '40%' }} />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '40%', transform: 'translate(100%, -50%)' }}
      >
        {t('portOut')}
      </span>

      {maskOpen && sourceUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex flex-col bg-black/70"
              role="dialog"
              aria-modal="true"
              onClick={() => setMaskOpen(false)}
            >
              <div
                className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium text-ink">
                    {t('inpaintMaskTitle')}
                  </span>
                  {BRUSH_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        brush === s ? 'bg-violet-600 text-white' : 'bg-white/80 text-ink'
                      }`}
                      onClick={() => setBrush(s)}
                    >
                      {s}px
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      !erasing ? 'bg-violet-600 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(false)}
                  >
                    {t('inpaintBrush')}
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      erasing ? 'bg-violet-600 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(true)}
                  >
                    {t('inpaintErase')}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-white/80 px-3 py-1.5 text-[12px]"
                    onClick={() => setMaskOpen(false)}
                  >
                    {t('closeLightbox')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white"
                    onClick={() => {
                      const canvas = canvasRef.current
                      if (canvas) update({ maskDataUrl: canvas.toDataURL('image/png') })
                      setMaskOpen(false)
                    }}
                  >
                    {t('inpaintSaveMask')}
                  </button>
                </div>
              </div>
              <div
                className="relative flex flex-1 items-center justify-center overflow-auto p-6 pt-16"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative inline-block max-w-full">
                  <img
                    ref={imgRef}
                    src={sourceUrl}
                    alt="mask base"
                    className="block max-h-[min(78vh,860px)] max-w-full rounded-lg"
                    onLoad={initCanvas}
                    draggable={false}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full cursor-crosshair rounded-lg opacity-45"
                    style={{ imageRendering: 'pixelated' }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.preventDefault()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      painting.current = true
                      last.current = null
                      const p = pointerPos(e)
                      paintAt(p.x, p.y)
                    }}
                    onPointerMove={(e) => {
                      if (!painting.current) return
                      const p = pointerPos(e)
                      paintAt(p.x, p.y)
                    }}
                    onPointerUp={(e) => {
                      painting.current = false
                      last.current = null
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId)
                      } catch {
                        /* ignore */
                      }
                    }}
                    onPointerCancel={() => {
                      painting.current = false
                      last.current = null
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
