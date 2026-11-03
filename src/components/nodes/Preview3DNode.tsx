import { Handle, Position, type NodeProps, useEdges, useNodes } from '@xyflow/react'
import { useMemo, useState } from 'react'
import type { Preview3DNode as Preview3DNodeType, ResultNodeData } from '../../types'
import { useI18n } from '../../i18n'
import { Preview3DView } from '../Preview3DView'
import { Preview3DModal } from '../Preview3DModal'
import { FieldLabel, NodeShell, btnGhost } from './nodeShell'

export function Preview3DNode({ id, data }: NodeProps<Preview3DNodeType>) {
  const { t } = useI18n()
  const nodes = useNodes()
  const edges = useEdges()
  const [open, setOpen] = useState(false)

  const imageUrl = useMemo(() => {
    if (data.imageUrl) return data.imageUrl
    const srcIds = edges.filter((e) => e.target === id).map((e) => e.source)
    for (const sid of srcIds) {
      const n = nodes.find((x) => x.id === sid)
      const d = n?.data as ResultNodeData & { imageUrl?: string } | undefined
      if (d?.imageUrl) return d.imageUrl
    }
    return undefined
  }, [data.imageUrl, edges, id, nodes])

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} id="in" className="handle-violet" style={{ top: '45%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '45%', transform: 'translate(-100%, -50%)' }}>
        {t('portImage')}
      </span>
      <NodeShell
        title={data.label || t('preview3dTitle')}
        accent="#6366f1"
        badge="3D"
        icon={<span className="text-[12px]" style={{ color: '#6366f1' }}>⬡</span>}
      >
        <FieldLabel>{t('preview3dTitle')}</FieldLabel>
        <div className="h-40 overflow-hidden rounded-[10px] border border-border bg-panel-2">
          {imageUrl ? (
            <Preview3DView imageUrl={imageUrl} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-muted">
              {t('preview3dNeedImage')}
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${btnGhost} w-full`}
          disabled={!imageUrl}
          onClick={() => setOpen(true)}
        >
          {t('open3d')}
        </button>
      </NodeShell>
      <Preview3DModal open={open} imageUrl={imageUrl} onClose={() => setOpen(false)} />
    </div>
  )
}
