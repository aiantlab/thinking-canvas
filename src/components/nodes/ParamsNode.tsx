import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import type {
  AspectRatio,
  BaseType,
  DesignDomain,
  LightingPreset,
  ParamsNode as ParamsNodeType,
  StylePreset,
  ViewAngle,
  WeatherPreset,
} from '../../types'
import {
  ASPECT_OPTIONS,
  BASE_TYPE_OPTIONS,
  DEFAULT_ADHERENCE,
  DOMAIN_OPTIONS,
  LIGHTING_OPTIONS,
  STYLE_OPTIONS,
  VIEW_OPTIONS,
  WEATHER_OPTIONS,
  adherenceBand,
  normalizeAdherence,
} from '../../types'
import { useI18n } from '../../i18n'
import { FieldLabel, NodeShell, selectClass } from './nodeShell'

export function ParamsNode({ id, data }: NodeProps<ParamsNodeType>) {
  const { t } = useI18n()
  const { setNodes, deleteElements } = useReactFlow()

  const update = (patch: Partial<typeof data>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const domain = data.domain ?? 'architecture'
  const baseType = data.baseType ?? 'line'
  const adherence = normalizeAdherence(data.adherence ?? DEFAULT_ADHERENCE)
  const lighting = data.lighting ?? 'day'
  const weather = data.weather ?? 'clear'
  const materialLock = data.materialLock ?? false
  const band = adherenceBand(adherence)
  const bandLabel =
    band === 'creative' ? t('adhereCreative') : band === 'precise' ? t('adherePrecise') : t('adhereBalanced')

  return (
    <div className="relative">
      <NodeShell
        title={data.label || t('paramsTitle')}
        accent="#8b5cf6"
        badge="PARAMS"
        icon={<span className="text-[12px] text-violet">◈</span>}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        deleteLabel={t('deleteNode')}
      >
        <FieldLabel>{t('domain')}</FieldLabel>
        <select
          className={selectClass}
          value={domain}
          onChange={(e) => update({ domain: e.target.value as DesignDomain })}
        >
          {DOMAIN_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <FieldLabel>{t('baseType')}</FieldLabel>
        <select
          className={selectClass}
          value={baseType}
          onChange={(e) => update({ baseType: e.target.value as BaseType })}
        >
          {BASE_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <FieldLabel>
          {t('adherence')}
          <span className="ml-2 font-mono normal-case tracking-normal text-violet-600">{adherence}</span>
        </FieldLabel>
        <div className="nodrag nopan rounded-[8px] border border-border bg-panel-2 px-2.5 py-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={adherence}
            aria-label={t('adherence')}
            className="w-full accent-violet-600"
            onChange={(e) => update({ adherence: Number(e.target.value) })}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
            <span>{t('adhereCreative')}</span>
            <span className="font-medium text-violet-600">{bandLabel}</span>
            <span>{t('adherePrecise')}</span>
          </div>
        </div>

        <FieldLabel>{t('view')}</FieldLabel>
        <select
          className={selectClass}
          value={data.view}
          onChange={(e) => update({ view: e.target.value as ViewAngle })}
        >
          {VIEW_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <FieldLabel>{t('style')}</FieldLabel>
        <select
          className={selectClass}
          value={data.style}
          onChange={(e) => update({ style: e.target.value as StylePreset })}
        >
          {STYLE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <FieldLabel>{t('lighting')}</FieldLabel>
        <select
          className={selectClass}
          value={lighting}
          onChange={(e) => update({ lighting: e.target.value as LightingPreset })}
        >
          {LIGHTING_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <FieldLabel>{t('weather')}</FieldLabel>
        <select
          className={selectClass}
          value={weather}
          onChange={(e) => update({ weather: e.target.value as WeatherPreset })}
        >
          {WEATHER_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        <label className="nodrag nopan mt-1 flex cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-panel-2 px-2.5 py-2 text-[12px] text-ink">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-violet-600"
            checked={materialLock}
            onChange={(e) => update({ materialLock: e.target.checked })}
          />
          <span>{t('materialLock')}</span>
        </label>
        {materialLock ? (
          <div className="text-[10px] leading-snug text-violet-600/90">{t('materialLockHint')}</div>
        ) : null}

        <FieldLabel>{t('aspect')}</FieldLabel>
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
      <Handle type="source" position={Position.Right} id="out" className="handle-violet" style={{ top: '50%' }} />
      <span className="port-label right pointer-events-none absolute" style={{ right: -6, top: '50%', transform: 'translate(100%, -50%)' }}>
        {t('portParams')}
      </span>
    </div>
  )
}
