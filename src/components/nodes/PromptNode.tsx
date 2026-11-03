import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { PromptNode as PromptNodeType, ScenePreset } from '../../types'
import { PROMPT_PRESETS, SCENE_PRESETS } from '../../types'
import { FieldLabel, NodeShell, inputClass, selectClass } from './nodeShell'

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { setNodes } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const applyPreset = (preset: ScenePreset) => {
    const p = PROMPT_PRESETS[preset]
    update({ preset, positive: p.positive, negative: p.negative })
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="handle-mint"
        style={{ top: '28%' }}
      />
      <span
        className="port-label left pointer-events-none absolute"
        style={{ left: -6, top: '28%', transform: 'translate(-100%, -50%)' }}
      >
        参考
      </span>
      <NodeShell
        title={data.label || '提示词'}
        accent="#d4a84b"
        badge="PROMPT"
        icon={<span className="text-[11px] text-gold">✎</span>}
      >
        <FieldLabel>场景预设</FieldLabel>
        <select
          className={selectClass}
          value={data.preset}
          onChange={(e) => applyPreset(e.target.value as ScenePreset)}
        >
          {SCENE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <FieldLabel>正向提示词</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={data.positive}
          onChange={(e) => update({ positive: e.target.value })}
          placeholder="描述建筑、材质、光线…"
        />
        <FieldLabel>负向提示词</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[48px] resize-y`}
          value={data.negative}
          onChange={(e) => update({ negative: e.target.value })}
          placeholder="不想出现的内容…"
        />
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="handle-gold"
        style={{ top: '50%' }}
      />
      <span
        className="port-label right pointer-events-none absolute"
        style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}
      >
        文本
      </span>
    </div>
  )
}
