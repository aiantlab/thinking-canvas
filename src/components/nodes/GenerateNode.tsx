import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { GenerateNode as GenerateNodeType, GenStatus } from '../../types'
import { useI18n, type MessageKey } from '../../i18n'
import {
  DEFAULT_MODEL,
  DEFAULT_SIZE,
  MODEL_OPTIONS,
  SIZE_OPTIONS,
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

type Extra = {
  onGenerate?: (id: string) => void
}

export function GenerateNode({
  id,
  data,
}: NodeProps<GenerateNodeType> & { data: GenerateNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes } = useReactFlow()
  const busy = data.status === 'queued' || data.status === 'generating'
  const onGenerate = (data as Extra).onGenerate
  const model = data.model ?? DEFAULT_MODEL
  const size = data.size ?? DEFAULT_SIZE

  const update = (patch: Partial<GenerateNodeType['data']>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
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
        icon={<span className="text-[12px] text-amber">✦</span>}
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

        <FieldLabel>{t('size')}</FieldLabel>
        <select
          className={selectClass}
          value={size}
          disabled={busy}
          onChange={(e) => update({ size: e.target.value as ImageSize })}
        >
          {SIZE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.labelKey)}
            </option>
          ))}
        </select>

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
