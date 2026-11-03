import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type { PromptNode as PromptNodeType, ScenePreset } from '../../types'
import { PROMPT_PRESETS, SCENE_PRESETS } from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, inputClass, selectClass } from './nodeShell'

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { t } = useI18n()
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
      <Handle type="target" position={Position.Left} id="in" className="handle-mint" style={{ top: '28%' }} />
      <span className="port-label left pointer-events-none absolute" style={{ left: -6, top: '28%', transform: 'translate(-100%, -50%)' }}>
        {t('portRef')}
      </span>
      <NodeShell
        title={data.label || t('promptTitle')}
        accent="#a855f7"
        badge="PROMPT"
        icon={<span className="text-[12px] text-violet">✎</span>}
      >
        <FieldLabel>{t('scenePreset')}</FieldLabel>
        <select
          className={selectClass}
          value={data.preset}
          onChange={(e) => applyPreset(e.target.value as ScenePreset)}
        >
          {SCENE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {t(p.labelKey)}
            </option>
          ))}
        </select>
        <FieldLabel>{t('positive')}</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={data.positive}
          onChange={(e) => update({ positive: e.target.value })}
          placeholder={t('positivePh')}
        />
        <FieldLabel>{t('negative')}</FieldLabel>
        <textarea
          className={`${inputClass} min-h-[48px] resize-y`}
          value={data.negative}
          onChange={(e) => update({ negative: e.target.value })}
          placeholder={t('negativePh')}
        />
      </NodeShell>
      <Handle type="source" position={Position.Right} id="out" className="handle-violet" style={{ top: '50%' }} />
      <span className="port-label right pointer-events-none absolute" style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}>
        {t('portText')}
      </span>
    </div>
  )
}
