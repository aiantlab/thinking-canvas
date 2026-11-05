import { loadQuota } from '../../storage'
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type {
  GenerateAspect,
  GenerateCount,
  GenerateNode as GenerateNodeType,
  GenStatus,
} from '../../types'
import {
  DEFAULT_GENERATE_ASPECT,
  DEFAULT_GENERATE_COUNT,
  GENERATE_ASPECT_OPTIONS,
  GENERATE_COUNT_OPTIONS,
} from '../../types'
import { useI18n, type MessageKey } from '../../i18n'
import {
  DEFAULT_MODEL,
  DEFAULT_SIZE,
  MODEL_OPTIONS,
  SIZE_OPTIONS,
  clampSizeForModel,
  sizesForModel,
  type ImageSize,
  type ModelId,
} from '../../models'
import { FieldLabel, NodeShell, btnPrimary, selectClass } from './nodeShell'

const STATUS_KEY: Record<GenStatus, MessageKey> = {
  idle: 'statusIdle',
  queued: 'statusQueued',
  generating: 'statusGenerating',
  done: 'statusDone',
  error: 'statusError',
}

const CHIP_SELECTED = 'bg-[#343A40] text-white border-[#343A40]'
const CHIP_IDLE =
  'bg-panel border-border text-muted hover:border-[#343A40]/40 hover:text-ink'

type Extra = {
  onGenerate?: (id: string) => void
}

function AspectIcon({
  box,
  autoIcon,
  selected,
}: {
  box: { w: number; h: number }
  autoIcon?: boolean
  selected: boolean
}) {
  const stroke = selected ? '#ffffff' : '#9ca3af'
  if (autoIcon) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <rect x="3" y="3" width="10" height="10" fill="none" stroke={stroke} strokeWidth="1.2" rx="1" />
        <path
          d="M3 5.5V3h2.5M13 5.5V3h-2.5M3 10.5V13h2.5M13 10.5V13h-2.5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  // Normalize max side to ~16 for consistent visual weight
  const max = Math.max(box.w, box.h)
  const scale = 14 / max
  const w = Math.max(4, box.w * scale)
  const h = Math.max(4, box.h * scale)
  const x = (16 - w) / 2
  const y = (16 - h) / 2
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        rx="1"
      />
    </svg>
  )
}

export function GenerateNode({
  id,
  data,
}: NodeProps<GenerateNodeType> & { data: GenerateNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()
  const busy = data.status === 'queued' || data.status === 'generating'
  const onGenerate = (data as Extra).onGenerate
  const model = data.model ?? DEFAULT_MODEL
  const sizeOptions = sizesForModel(model)
  const size = clampSizeForModel(model, data.size ?? DEFAULT_SIZE)
  const aspect = data.aspect ?? DEFAULT_GENERATE_ASPECT
  const count = data.count ?? DEFAULT_GENERATE_COUNT

  const update = (patch: Partial<GenerateNodeType['data']>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n
        const next = { ...n.data, ...patch }
        if (patch.model) {
          next.size = clampSizeForModel(patch.model as ModelId, next.size)
        }
        return { ...n, data: next }
      }),
    )
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id="ref" className="handle-mint" style={{ top: '28%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '28%', transform: 'translate(-100%, -50%)' }}>
        {t('portRef')}
      </span>
      <Handle type="target" position={Position.Left} id="prompt" className="handle-gold" style={{ top: '50%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '50%', transform: 'translate(-100%, -50%)' }}>
        {t('portPrompt')}
      </span>
      <Handle type="target" position={Position.Left} id="params" className="handle-violet" style={{ top: '72%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '72%', transform: 'translate(-100%, -50%)' }}>
        {t('portParams')}
      </span>

      <NodeShell
        title={data.label || t('nodeGenerate')}
        accent="#f59e0b"
        badge="RUN"
        running={busy}
        widthClass="w-[320px]"
        icon={<span className="text-[12px] text-amber">✦</span>}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
      >
        <FieldLabel>{t('model')}</FieldLabel>
        <select
          className={selectClass}
          value={model}
          disabled={busy}
          onChange={(e) => update({ model: e.target.value as ModelId })}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {t(m.labelKey)}
            </option>
          ))}
        </select>

        <div>
          <FieldLabel>{t('genAspect')}</FieldLabel>
          <div className="rounded-[10px] border border-border bg-panel-2/80 p-1.5">
            <div className="flex flex-wrap gap-0.5">
              {GENERATE_ASPECT_OPTIONS.map((opt) => {
                const selected = aspect === opt.id
                const label = opt.labelKey ? t(opt.labelKey) : opt.label!
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    title={label}
                    aria-pressed={selected}
                    className={`nodrag nopan flex min-w-[30px] flex-1 flex-col items-center gap-0.5 rounded-[7px] border px-0.5 py-1 transition ${
                      selected ? CHIP_SELECTED : `${CHIP_IDLE} border-transparent bg-transparent`
                    } disabled:opacity-40`}
                    onClick={() => update({ aspect: opt.id as GenerateAspect })}
                  >
                    <AspectIcon box={opt.box} autoIcon={opt.autoIcon} selected={selected} />
                    <span className="text-[9px] font-medium leading-none tracking-tight">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>{t('resolution')}</FieldLabel>
          <div className="flex gap-1.5">
            {SIZE_OPTIONS.filter((s) => {
              if (!sizeOptions.includes(s.id)) return false
              const max = (loadQuota().maxResolution || '1K').toUpperCase()
              const rank: Record<string, number> = { '1K': 1, '2K': 2, '4K': 3 }
              return (rank[s.id] || 1) <= (rank[max] || 1)
            }).map((s) => {
              const selected = size === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={selected}
                  className={`nodrag nopan flex-1 rounded-full border px-2 py-1.5 text-[12px] font-semibold transition ${
                    selected ? CHIP_SELECTED : CHIP_IDLE
                  } disabled:opacity-40`}
                  onClick={() => update({ size: s.id as ImageSize })}
                >
                  {t(s.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <FieldLabel>{t('genCount')}</FieldLabel>
          <div className="flex gap-1.5">
            {GENERATE_COUNT_OPTIONS.map((c) => {
              const selected = count === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={selected}
                  className={`nodrag nopan flex-1 rounded-full border px-2 py-1.5 text-[12px] font-semibold transition ${
                    selected ? CHIP_SELECTED : CHIP_IDLE
                  } disabled:opacity-40`}
                  onClick={() => update({ count: c.id as GenerateCount })}
                >
                  {t(c.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        <FieldLabel>{t('status')}</FieldLabel>
        <div className="flex items-center gap-2 text-[12px]">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              data.status === 'done'
                ? 'bg-mint'
                : data.status === 'error'
                  ? 'bg-danger'
                  : busy
                    ? 'bg-amber animate-pulse'
                    : 'bg-muted'
            }`}
          />
          <span className="text-ink">{t(STATUS_KEY[data.status])}</span>
          {busy && data.progress != null ? (
            <span className="ml-auto font-mono text-[10px] text-muted">{Math.round(data.progress)}%</span>
          ) : null}
        </div>
        {busy ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
            <div
              className="h-full rounded-full bg-amber transition-all duration-300"
              style={{ width: `${Math.min(100, data.progress ?? 15)}%` }}
            />
          </div>
        ) : null}
        {data.lastError ? (
          <div className="rounded-[8px] border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
            {data.lastError}
          </div>
        ) : null}
        <div className="text-[10px] leading-relaxed text-muted">{t('genHint')}</div>
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={busy}
          onClick={() => onGenerate?.(id)}
        >
          {busy ? t('generating') : t('startGenerate')}
        </button>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="out" className="handle-amber" style={{ top: '50%' }} />
      <span className="port-label right pointer-events-none absolute" style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}>
        {t('portOut')}
      </span>
    </div>
  )
}
