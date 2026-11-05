import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ResultNode as ResultNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, btnPrimary } from './nodeShell'

type Extra = {
  onUseAsRef?: (id: string) => void
  onLocalInpaint?: (id: string) => void
  onSpawnTool?: (id: string, mode: 'night' | 'weather' | 'detail' | 'multiview') => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.25

/** Same-origin API base (canno → thinking-canvas Worker). */
function apiBase(): string {
  if (typeof location === 'undefined') return ''
  const host = location.hostname
  // Image proxy lives on the thinking-canvas Worker; GitHub Pages needs absolute base.
  // canno3d.com is same-origin to that Worker via EdgeOne.
  if (host === 'aiantlab.github.io' || host.endsWith('.github.io')) {
    return 'https://thinking-canvas.yeahsky.workers.dev'
  }
  return ''
}

function filenameFromUrl(url: string, seed?: number | string) {
  try {
    const path = new URL(url, location.origin).pathname
    const base = path.split('/').pop() || ''
    if (/\.(png|jpe?g|webp|gif)$/i.test(base)) return base
  } catch {
    /* ignore */
  }
  return `canno-${seed ?? Date.now()}.png`
}

async function downloadImage(url: string, filename: string) {
  const tryBlob = async (src: string) => {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  }

  try {
    await tryBlob(url)
    return
  } catch {
    /* CORS or network — try Worker proxy */
  }

  try {
    const proxy = `${apiBase()}/api/image-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
    await tryBlob(proxy)
    return
  } catch {
    /* last resort: same-tab navigation with download attr (may still preview if cross-origin) */
  }

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function ResultNode({
  id,
  data,
}: NodeProps<ResultNodeType> & { data: ResultNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()
  const onUseAsRef = (data as Extra).onUseAsRef
  const onLocalInpaint = (data as Extra).onLocalInpaint
  const onSpawnTool = (data as Extra).onSpawnTool
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const copyPrompt = async () => {
    if (!data.promptSnapshot) return
    try {
      await navigator.clipboard.writeText(data.promptSnapshot)
    } catch {
      /* ignore */
    }
  }

  const openLightbox = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLightbox(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    dragRef.current = null
    setDragging(false)
  }, [])

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => clampZoom(Number((z + delta).toFixed(2))))
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP)
      if (e.key === '-' || e.key === '_') zoomBy(-ZOOM_STEP)
      if (e.key === '0') {
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, closeLightbox, zoomBy])

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dir = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    zoomBy(dir)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    setPan({
      x: d.px + (e.clientX - d.x),
      y: d.py + (e.clientY - d.y),
    })
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    dragRef.current = null
    setDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const fileName = data.imageUrl
    ? filenameFromUrl(data.imageUrl, data.seed)
    : `canno-${Date.now()}.png`

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id="in" className="handle-amber" style={{ top: '40%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '40%', transform: 'translate(-100%, -50%)' }}>
        {t('portIn')}
      </span>
      <NodeShell
        title={data.label || t('resultTitle')}
        accent="#14b8a6"
        badge={data.seed ? `SEED ${data.seed}` : 'RESULT'}
        icon={<span className="text-[12px] text-mint">▣</span>}
        widthClass="w-[360px]"
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
        footer={
          data.imageUrl ? (
            <div className="flex justify-between gap-2">
              <span>{t('typeImage')}</span>
              <span>{t('formatImage')}</span>
            </div>
          ) : null
        }
      >
        <FieldLabel>{t('resultTitle')}</FieldLabel>
        <div className="flex h-64 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt="result"
              className="h-full w-full cursor-zoom-in object-cover"
              title={t('clickEnlarge')}
              onClick={(e) => {
                e.stopPropagation()
                openLightbox()
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                openLightbox()
              }}
            />
          ) : (
            <div className="px-4 text-center text-[12px] text-muted">
              {t('resultWaiting')}
              <div className="mt-1 font-mono text-[9px] text-muted/60">{t('resultWaitingHint')}</div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={!data.imageUrl} onClick={() => onUseAsRef?.(id)}>
            {t('useAsRef')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.imageUrl} onClick={() => onLocalInpaint?.(id)}>
            {t('useAsInpaint')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.imageUrl} onClick={() => onSpawnTool?.(id, 'night')}>
            {t('useAsNight')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.imageUrl} onClick={() => onSpawnTool?.(id, 'weather')}>
            {t('useAsWeather')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.imageUrl} onClick={() => onSpawnTool?.(id, 'detail')}>
            {t('useAsDetail')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.imageUrl} onClick={() => onSpawnTool?.(id, 'multiview')}>
            {t('useAsMultiview')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.promptSnapshot} onClick={() => void copyPrompt()}>
            {t('copyPrompt')}
          </button>
          {data.imageUrl ? (
            <button
              type="button"
              className={btnGhost}
              onClick={(e) => {
                e.stopPropagation()
                void downloadImage(data.imageUrl!, fileName)
              }}
            >
              {t('downloadImage')}
            </button>
          ) : null}
          {data.imageUrl ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() =>
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            imageUrl: undefined,
                            seed: undefined,
                            promptSnapshot: undefined,
                            status: 'placeholder',
                          },
                        }
                      : n,
                  ),
                )
              }
            >
              {t('clear')}
            </button>
          ) : null}
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-mint" style={{ top: '40%' }} />
      <span className="port-label right pointer-events-none absolute" style={{ right: -6, top: '40%', transform: 'translate(100%, -50%)' }}>
        {t('portImage')}
      </span>

      {lightbox && data.imageUrl
        ? createPortal(
            <div
              className="image-lightbox fixed inset-0 z-[9999] flex flex-col bg-black/80"
              role="dialog"
              aria-modal="true"
              onClick={closeLightbox}
            >
              <div
                className="image-lightbox__toolbar absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="image-lightbox__btn"
                    aria-label={t('zoomOut')}
                    onClick={() => zoomBy(-ZOOM_STEP)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="image-lightbox__btn image-lightbox__zoom-label"
                    onClick={() => {
                      setZoom(1)
                      setPan({ x: 0, y: 0 })
                    }}
                    title={t('zoomReset')}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    className="image-lightbox__btn"
                    aria-label={t('zoomIn')}
                    onClick={() => zoomBy(ZOOM_STEP)}
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="image-lightbox__btn"
                    onClick={() => void downloadImage(data.imageUrl!, fileName)}
                  >
                    {t('downloadImage')}
                  </button>
                  <button type="button" className="image-lightbox__btn image-lightbox__btn--solid" onClick={closeLightbox}>
                    {t('closeLightbox')}
                  </button>
                </div>
              </div>

              <div
                className="image-lightbox__stage relative flex flex-1 items-center justify-center overflow-hidden p-6 pt-16"
                onClick={closeLightbox}
                onWheel={onWheel}
              >
                <img
                  src={data.imageUrl}
                  alt="result enlarged"
                  className={`image-lightbox__img max-h-[min(90vh,920px)] max-w-[min(92vw,1400px)] select-none rounded-lg object-contain shadow-2xl ${
                    dragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 80ms ease-out',
                  }}
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </div>
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80">
                {t('lightboxHint')}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
