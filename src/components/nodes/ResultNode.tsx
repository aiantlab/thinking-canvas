import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { ResultNode as ResultNodeType } from '../../types'
import { FieldLabel, NodeShell, btnGhost, btnPrimary } from './nodeShell'

type Extra = {
  onUseAsRef?: (id: string) => void
}

export function ResultNode({
  id,
  data,
}: NodeProps<ResultNodeType> & { data: ResultNodeType['data'] & Extra }) {
  const { setNodes } = useReactFlow()
  const onUseAsRef = (data as Extra).onUseAsRef

  const copyPrompt = async () => {
    if (!data.promptSnapshot) return
    try {
      await navigator.clipboard.writeText(data.promptSnapshot)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="handle-amber"
        style={{ top: '40%' }}
      />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '40%', transform: 'translate(-100%, -50%)' }}
      >
        输入
      </span>
      <NodeShell
        title={data.label || '结果'}
        accent="#4ec9b0"
        badge={data.seed ? `SEED ${data.seed}` : 'RESULT'}
        icon={<span className="text-[11px] text-mint">▣</span>}
      >
        <FieldLabel>效果图</FieldLabel>
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-[4px] border border-border bg-panel-3">
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="结果" className="h-full w-full object-cover" />
          ) : (
            <div className="px-4 text-center text-[12px] text-muted">
              等待生成…
              <div className="mt-1 font-mono text-[9px] text-muted/60">连接左侧「生成」并运行</div>
            </div>
          )}
        </div>
        {data.promptSnapshot ? (
          <div className="line-clamp-2 text-[10px] leading-snug text-muted">
            {data.promptSnapshot}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={!data.imageUrl}
            onClick={() => onUseAsRef?.(id)}
          >
            作参考再改
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={!data.promptSnapshot}
            onClick={() => void copyPrompt()}
          >
            复制提示
          </button>
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
              清空
            </button>
          ) : null}
        </div>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="handle-mint"
        style={{ top: '40%' }}
      />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '40%', transform: 'translate(100%, -50%)' }}
      >
        图像
      </span>
    </div>
  )
}
