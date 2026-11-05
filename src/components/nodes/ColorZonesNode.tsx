import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  COLOR_ZONE_CATEGORIES,
  type ColorZoneId,
} from '../../toolPrompts'
import type { ColorZonesNode as ColorZonesNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, btnPrimary } from './nodeShell'

type Extra = {
  sourceImageUrl?: string
}

const BRUSH = [14, 28, 44] as const

export function ColorZonesNode({
  id,
  data,
}: NodeProps<ColorZonesNodeType> & { data: ColorZonesNodeType['data'] & Extra }) {
  const { t, locale } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()
  const sourceUrl = (data as Extra).sourceImageUrl

  const [paintOpen, setPaintOpen] = useState(false)
  const [brush, setBrush] = useState<(typeof BRUSH)[number]>(28)
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

  const active = (data.activeCategory || 'wall') as ColorZoneId
  const used = (data.usedCategories || []) as ColorZoneId[]
  const cat =
    COLOR_ZONE_CATEGORIES.find((c) => c.id === active) || COLOR_ZONE_CATEGORIES[0]

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.naturalWidth) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    const maxW = Math.min(920, window.innerWidth - 48)
    const scale = Math.min(1, maxW / w)
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (data.overlayDataUrl) {
      const prev = new Image()
      prev.onload = () => ctx.drawImage(prev, 0, 0, canvas.width, canvas.height)
      prev.src = data.overlayDataUrl
    }
  }, [data.overlayDataUrl])

  useEffect(() => {
    if (!paintOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaintOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paintOpen])

  const paintAt = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brush
    if (erasing) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = cat.color
      ctx.globalAlpha = 0.55
    }
    ctx.beginPath()
    if (last.current) {
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(x, y)
    } else {
      ctx.moveTo(x, y)
      ctx.lineTo(x + 0.01, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
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
    if (!erasing && !used.includes(active)) {
      update({ usedCategories: [...used, active] })
    }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return
    paintAt(pointerPos(e).x, pointerPos(e).y)
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

  const clearOverlay = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    update({ overlayDataUrl: undefined, usedCategories: [] })
  }

  const saveAndClose = () => {
    const canvas = canvasRef.current
    if (canvas) update({ overlayDataUrl: canvas.toDataURL('image/png') })
    setPaintOpen(false)
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
        title={data.label || t('colorZonesTitle')}
        accent="#f97316"
        badge="ZONES"
        icon={<span className="text-[12px] text-orange-500">▦</span>}
        widthClass="w-[320px]"
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
        footer={<div>{t('colorZonesHint')}</div>}
      >
        <FieldLabel>{t('colorZonesActive')}</FieldLabel>
        <div className="nodrag nopan flex flex-wrap gap-1.5">
          {COLOR_ZONE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                active === c.id ? 'text-white' : 'text-ink border border-border bg-panel'
              }`}
              style={
                active === c.id
                  ? { background: c.color }
                  : { borderLeft: `3px solid ${c.color}` }
              }
              onClick={() => update({ activeCategory: c.id })}
            >
              {locale === 'zh' ? c.zh : c.en}
            </button>
          ))}
        </div>

        <div className="flex h-28 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {sourceUrl ? (
            <div className="relative h-full w-full">
              <img src={sourceUrl} alt="zones base" className="h-full w-full object-cover" />
              {data.overlayDataUrl ? (
                <img
                  src={data.overlayDataUrl}
                  alt="zones overlay"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
                />
              ) : null}
            </div>
          ) : (
            <div className="px-3 text-center text-[11px] text-muted">{t('colorZonesNeedSource')}</div>
          )}
        </div>

        {used.length ? (
          <div className="text-[10px] text-muted">
            {t('colorZonesLegend')}:{' '}
            {used
              .map((id) => {
                const c = COLOR_ZONE_CATEGORIES.find((x) => x.id === id)
                return c ? (locale === 'zh' ? c.zh : c.en) : id
              })
              .join(' · ')}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={!sourceUrl}
            onClick={() => setPaintOpen(true)}
          >
            {data.overlayDataUrl ? t('colorZonesEdit') : t('colorZonesPaint')}
          </button>
          {data.overlayDataUrl ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() => update({ overlayDataUrl: undefined, usedCategories: [] })}
            >
              {t('clear')}
            </button>
          ) : null}
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-orange" style={{ top: '36%' }} />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '36%', transform: 'translate(100%, -50%)' }}
      >
        {t('portParams')}
      </span>

      {paintOpen && sourceUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex flex-col bg-black/70"
              role="dialog"
              aria-modal="true"
              onClick={() => setPaintOpen(false)}
            >
              <div
                className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium text-ink">
                    {t('colorZonesPaintTitle')} · {locale === 'zh' ? cat.zh : cat.en}
                  </span>
                  {BRUSH.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        brush === s ? 'bg-orange-500 text-white' : 'bg-white/80 text-ink'
                      }`}
                      onClick={() => setBrush(s)}
                    >
                      {s}px
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      !erasing ? 'bg-orange-500 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(false)}
                  >
                    {t('inpaintBrush')}
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      erasing ? 'bg-orange-500 text-white' : 'bg-white/80 text-ink'
                    }`}
                    onClick={() => setErasing(true)}
                  >
                    {t('inpaintErase')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-ink"
                    onClick={clearOverlay}
                  >
                    {t('clear')}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-white/80 px-3 py-1.5 text-[12px] text-ink"
                    onClick={() => setPaintOpen(false)}
                  >
                    {t('closeLightbox')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white"
                    onClick={saveAndClose}
                  >
                    {t('colorZonesSave')}
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
                    alt="zones base"
                    className="block max-h-[min(78vh,860px)] max-w-full rounded-lg"
                    onLoad={initCanvas}
                    draggable={false}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full cursor-crosshair rounded-lg"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
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
