import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { InpaintNode as InpaintNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, btnPrimary, inputClass } from './nodeShell'

type Extra = {
  onInpaint?: (id: string) => void
  /** Resolved source image from connected upload/result */
  sourceImageUrl?: string
}

const BRUSH_SIZES = [12, 28, 48] as const

export function InpaintNode({
  id,
  data,
}: NodeProps<InpaintNodeType> & { data: InpaintNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()
  const onInpaint = (data as Extra).onInpaint
  const sourceUrl = (data as Extra).sourceImageUrl

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

  const busy = data.status === 'queued' || data.status === 'generating'
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

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    painting.current = true
    last.current = null
    const p = pointerPos(e)
    paintAt(p.x, p.y)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return
    const p = pointerPos(e)
    paintAt(p.x, p.y)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    painting.current = false
    last.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const clearMask = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const saveMaskAndClose = () => {
    const canvas = canvasRef.current
    if (canvas) {
      update({ maskDataUrl: canvas.toDataURL('image/png') })
    }
    setMaskOpen(false)
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id="image" className="handle-sky" style={{ top: '36%' }} />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '36%', transform: 'translate(-100%, -50%)' }}
      >
        {t('portImage')}
      </span>
      <NodeShell
        title={data.label || t('inpaintTitle')}
        accent="#ec4899"
        badge="INPAINT"
        icon={<span className="text-[12px] text-pink-500">✎</span>}
        widthClass="w-[320px]"
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
        footer={
          <div className="flex flex-wrap items-center gap-1.5">
            <span>{t('inpaintLimit')}</span>
          </div>
        }
      >
        <FieldLabel>{t('inpaintSource')}</FieldLabel>
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {sourceUrl ? (
            <img src={sourceUrl} alt="inpaint source" className="h-full w-full object-cover" />
          ) : (
            <div className="px-3 text-center text-[11px] text-muted">{t('inpaintNeedSource')}</div>
          )}
        </div>

        <FieldLabel>{t('inpaintPrompt')}</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={data.prompt}
          placeholder={t('inpaintPromptPh')}
          onChange={(e) => update({ prompt: e.target.value })}
        />

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
            <button type="button" className={btnGhost} onClick={() => update({ maskDataUrl: undefined })}>
              {t('inpaintClearMask')}
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <span>{t('status')}: {statusLabel}</span>
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
          disabled={!sourceUrl || busy}
          onClick={() => onInpaint?.(id)}
        >
          {busy ? t('generating') : t('inpaintRun')}
        </button>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-pink" style={{ top: '36%' }} />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '36%', transform: 'translate(100%, -50%)' }}
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
                        brush === s ? 'bg-pink-500 text-white' : 'bg-white/80 text-ink'
                      }`}
                      onClick={() => setBrush(s)}
                    >
                      {s}px
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      !erasing ? 'bg-pink-500 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(false)}
                  >
                    {t('inpaintBrush')}
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      erasing ? 'bg-pink-500 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(true)}
                  >
                    {t('inpaintErase')}
                  </button>
                  <button type="button" className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-ink" onClick={clearMask}>
                    {t('clear')}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-white/80 px-3 py-1.5 text-[12px] text-ink"
                    onClick={() => setMaskOpen(false)}
                  >
                    {t('closeLightbox')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-pink-500 px-3 py-1.5 text-[12px] font-semibold text-white"
                    onClick={saveMaskAndClose}
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
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/85">
                {t('inpaintMaskHint')}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
