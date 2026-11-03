import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type {
  AspectRatio,
  ParamsNode as ParamsNodeType,
  StylePreset,
  ViewAngle,
} from '../../types'
import { ASPECT_OPTIONS, STYLE_OPTIONS, VIEW_OPTIONS } from '../../types'
import { FieldLabel, NodeShell, selectClass } from './nodeShell'

export function ParamsNode({ id, data }: NodeProps<ParamsNodeType>) {
  const { setNodes } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  return (
    <div className="relative">
      <NodeShell
        title={data.label || '视角 · 风格'}
        accent="#9b8cff"
        badge="PARAMS"
        icon={<span className="text-[11px] text-violet">◈</span>}
      >
        <FieldLabel>视角</FieldLabel>
        <select
          className={selectClass}
          value={data.view}
          onChange={(e) => update({ view: e.target.value as ViewAngle })}
        >
          {VIEW_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldLabel>风格</FieldLabel>
        <select
          className={selectClass}
          value={data.style}
          onChange={(e) => update({ style: e.target.value as StylePreset })}
        >
          {STYLE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldLabel>宽高比</FieldLabel>
        <select
          className={selectClass}
          value={data.aspect}
          onChange={(e) => update({ aspect: e.target.value as AspectRatio })}
        >
          {ASPECT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="handle-violet"
        style={{ top: '50%' }}
      />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}
      >
        参数
      </span>
    </div>
  )
}
