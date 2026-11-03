import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { ResultNode as ResultNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, btnPrimary } from './nodeShell'

type Extra = {
  onUseAsRef?: (id: string) => void
  onOpen3D?: (imageUrl: string) => void
}

export function ResultNode({
  id,
  data,
}: NodeProps<ResultNodeType> & { data: ResultNodeType['data'] & Extra }) {
  const { t } = useI18n()
  const { setNodes } = useReactFlow()
  const onUseAsRef = (data as Extra).onUseAsRef
  const onOpen3D = (data as Extra).onOpen3D

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
      <Handle type="target" position={Position.Left} id="in" className="handle-amber" style={{ top: '40%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '40%', transform: 'translate(-100%, -50%)' }}>
        {t('portIn')}
      </span>
      <NodeShell
        title={data.label || t('resultTitle')}
        accent="#14b8a6"
        badge={data.seed ? `SEED ${data.seed}` : 'RESULT'}
        icon={<span className="text-[12px] text-mint">▣</span>}
        footer={
          data.imageUrl ? (
            <div className="flex justify-between gap-2">
              <span>{t('type3d')}</span>
              <span>{t('formatGltf')}</span>
            </div>
          ) : null
        }
      >
        <FieldLabel>{t('resultTitle')}</FieldLabel>
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="result" className="h-full w-full object-cover" />
          ) : (
            <div className="px-4 text-center text-[12px] text-muted">
              {t('resultWaiting')}
              <div className="mt-1 font-mono text-[9px] text-muted/60">{t('resultWaitingHint')}</div>
            </div>
          )}
        </div>
        {data.promptSnapshot ? (
          <div className="line-clamp-2 text-[10px] leading-snug text-muted">{data.promptSnapshot}</div>
        ) : null}
        {data.imageUrl ? (
          <button
            type="button"
            className={`${btnGhost} w-full justify-between`}
            onClick={() => onOpen3D?.(data.imageUrl!)}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>⬡</span>
              {t('open3d')}
            </span>
            <span aria-hidden>↗</span>
          </button>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={!data.imageUrl} onClick={() => onUseAsRef?.(id)}>
            {t('useAsRef')}
          </button>
          <button type="button" className={btnGhost} disabled={!data.promptSnapshot} onClick={() => void copyPrompt()}>
            {t('copyPrompt')}
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
              {t('clear')}
            </button>
          ) : null}
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-mint" style={{ top: '40%' }} />
      <span className="port-label right pointer-events-none absolute" style={{ right: -6, top: '40%', transform: 'translate(100%, -50%)' }}>
        {t('portImage')}
      </span>
    </div>
  )
}
