import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import type { UploadNode as UploadNodeType } from '../../types'
import { FieldLabel, NodeShell, btnGhost } from './nodeShell'

export function UploadNode({ id, data }: NodeProps<UploadNodeType>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { setNodes } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    update({ imageUrl: url, fileName: file.name })
  }

  return (
    <div className="relative">
      <NodeShell
        title={data.label || '参考 / 户型'}
        accent="#4ec9b0"
        badge="IMAGE"
        icon={<span className="text-[11px] text-mint">⧉</span>}
      >
        <FieldLabel>参考图 / 户型平面</FieldLabel>
        <div
          className="group relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[4px] border border-dashed border-border bg-panel-3 transition hover:border-mint/40"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files?.[0])
          }}
        >
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="参考" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="text-[12px] text-muted">点击或拖入图片</div>
              <div className="mt-1 font-mono text-[9px] text-muted/60">JPG · PNG · WEBP</div>
            </>
          )}
        </div>
        {data.fileName ? (
          <div className="truncate font-mono text-[10px] text-muted">{data.fileName}</div>
        ) : null}
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => inputRef.current?.click()}>
            选择文件
          </button>
          {data.imageUrl ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() => update({ imageUrl: undefined, fileName: undefined })}
            >
              清除
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
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="handle-mint"
        style={{ top: '50%' }}
      />
      <span
        className="port-label right pointer-events-none absolute text-muted"
        style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}
      >
        图像
      </span>
    </div>
  )
}
