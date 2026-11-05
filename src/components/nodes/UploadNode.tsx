import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import type { UploadNode as UploadNodeType } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, btnGhost } from './nodeShell'

export function UploadNode({ id, data }: NodeProps<UploadNodeType>) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const { setNodes, deleteElements } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    const ok =
      file.type.startsWith('image/') ||
      /\.(obj|glb|gltf)$/i.test(file.name)
    if (!ok) return
    const url = URL.createObjectURL(file)
    update({ imageUrl: url, fileName: file.name })
  }

  return (
    <div className="relative">
      <NodeShell
        title={data.label || t('uploadTitle')}
        accent="#0ea5e9"
        badge="IMAGE"
        icon={<span className="text-[12px] text-sky">⧉</span>}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
      >
        <FieldLabel>{t('uploadTitle')}</FieldLabel>
        <div
          className="group relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-panel-2 transition hover:border-sky/50"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files?.[0])
          }}
        >
          {data.imageUrl && !/\.(obj|glb|gltf)$/i.test(data.fileName || '') ? (
            <img src={data.imageUrl} alt="ref" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="text-[12px] text-muted">{t('uploadHint')}</div>
              <div className="mt-1 font-mono text-[9px] text-muted/70">{t('uploadFormats')}</div>
            </>
          )}
        </div>
        {data.fileName ? (
          <div className="truncate font-mono text-[10px] text-muted">{data.fileName}</div>
        ) : null}
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
          accept="image/*,.obj,.glb,.gltf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-sky" style={{ top: '50%' }} />
      <span className="port-label right pointer-events-none absolute text-muted" style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}>
        {t('portImage')}
      </span>
    </div>
  )
}
