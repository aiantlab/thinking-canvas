import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import type { StyleRefNode as StyleRefNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost, inputClass } from './nodeShell'

/** Optional public demo thumbs if present under /demo */
const STYLE_PRESETS: { id: string; labelZh: string; labelEn: string; path: string }[] = [
  { id: 'line', labelZh: '线稿参考', labelEn: 'Line sketch', path: '/demo/line_sketch.png' },
  { id: 'render', labelZh: '效果图参考', labelEn: 'Render look', path: '/demo/line_to_render.png' },
]

export function StyleRefNode({ id, data }: NodeProps<StyleRefNodeType>) {
  const { t, locale } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const { setNodes, deleteElements } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    update({ imageUrl: URL.createObjectURL(file), fileName: file.name })
  }

  return (
    <div className="relative">
      <NodeShell
        title={data.label || t('styleRefTitle')}
        accent="#8b5cf6"
        badge="STYLE"
        icon={<span className="text-[12px] text-violet">✦</span>}
        widthClass="w-[300px]"
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
        footer={<div>{t('styleRefHint')}</div>}
      >
        <FieldLabel>{t('styleRefImage')}</FieldLabel>
        <div
          className="group relative flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-panel-2 transition hover:border-violet/50"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files?.[0])
          }}
        >
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="style ref" className="h-full w-full object-cover" />
          ) : (
            <div className="px-3 text-center text-[11px] text-muted">{t('styleRefUpload')}</div>
          )}
        </div>

        <FieldLabel>{t('styleRefPresets')}</FieldLabel>
        <div className="nodrag nopan flex flex-wrap gap-1.5">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={btnGhost}
              onClick={() =>
                update({
                  imageUrl: p.path,
                  fileName: p.path.split('/').pop(),
                })
              }
            >
              {locale === 'zh' ? p.labelZh : p.labelEn}
            </button>
          ))}
        </div>

        <FieldLabel>{t('styleRefNote')}</FieldLabel>
        <input
          className={inputClass}
          value={data.note || ''}
          placeholder={t('styleRefNotePh')}
          onChange={(e) => update({ note: e.target.value })}
        />

        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => inputRef.current?.click()}>
            {t('selectFile')}
          </button>
          {data.imageUrl ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() => update({ imageUrl: undefined, fileName: undefined })}
            >
              {t('clear')}
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-violet" style={{ top: '50%' }} />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}
      >
        {t('portRef')}
      </span>
    </div>
  )
}
