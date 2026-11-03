import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { GenerateNode as GenerateNodeType, GenStatus } from '../../types'
import { FieldLabel, NodeShell, btnPrimary } from './nodeShell'

const STATUS_LABEL: Record<GenStatus, string> = {
  idle: '就绪',
  queued: '排队中…',
  generating: '生成中…',
  done: '已完成',
  error: '失败',
}

type Extra = {
  onGenerate?: (id: string) => void
}

export function GenerateNode({
  id,
  data,
}: NodeProps<GenerateNodeType> & { data: GenerateNodeType['data'] & Extra }) {
  const busy = data.status === 'queued' || data.status === 'generating'
  const onGenerate = (data as Extra).onGenerate

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="ref"
        className="handle-mint"
        style={{ top: '28%' }}
      />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '28%', transform: 'translate(-100%, -50%)' }}
      >
        参考
      </span>
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="handle-gold"
        style={{ top: '50%' }}
      />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '50%', transform: 'translate(-100%, -50%)' }}
      >
        提示
      </span>
      <Handle
        type="target"
        position={Position.Left}
        id="params"
        className="handle-violet"
        style={{ top: '72%' }}
      />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '72%', transform: 'translate(-100%, -50%)' }}
      >
        参数
      </span>

      <NodeShell
        title={data.label || '生成'}
        accent="#f0b429"
        badge="RUN"
        running={busy}
        icon={<span className="text-[11px] text-amber">▶</span>}
      >
        <FieldLabel>状态</FieldLabel>
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
          <span className="text-ink">{STATUS_LABEL[data.status]}</span>
          {busy && data.progress != null ? (
            <span className="ml-auto font-mono text-[10px] text-muted">
              {Math.round(data.progress)}%
            </span>
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
          <div className="rounded-[4px] border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
            {data.lastError}
          </div>
        ) : null}
        <div className="text-[10px] leading-relaxed text-muted">
          连接参考图、提示词与参数后运行。默认 4K；设 VITE_USE_MOCK=1 可回退占位图。
        </div>
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={busy}
          onClick={() => onGenerate?.(id)}
        >
          {busy ? '生成中…' : '开始生成'}
        </button>
      </NodeShell>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="handle-amber"
        style={{ top: '50%' }}
      />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}
      >
        结果
      </span>
    </div>
  )
}
