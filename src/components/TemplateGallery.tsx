import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import {
  templatesByCategory,
  type TemplateCategory,
  type TemplateDef,
  type TemplateFeature,
} from '../demoData'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (tpl: TemplateDef) => void
}

type Tab = TemplateCategory

function featureChips(features: TemplateFeature[], locale: 'zh' | 'en'): string[] {
  const chips: string[] = []
  for (const f of features) {
    if (f.kind === 'colorzones') chips.push(locale === 'zh' ? '色块分区' : 'Color zones')
    else if (f.kind === 'styleref') chips.push(locale === 'zh' ? '风格参考' : 'Style ref')
    else if (f.kind === 'inpaint') chips.push(locale === 'zh' ? '局部重绘' : 'Inpaint')
    else if (f.kind === 'tool') {
      const mapZh: Record<string, string> = {
        night: '夜景',
        weather: '天气',
        detail: '细节',
        materialMigrate: '材质迁移',
        replace: '物体替换',
        multiview: '多视角',
      }
      const mapEn: Record<string, string> = {
        night: 'Night',
        weather: 'Weather',
        detail: 'Detail',
        materialMigrate: 'Materials',
        replace: 'Replace',
        multiview: 'Multiview',
      }
      chips.push(locale === 'zh' ? mapZh[f.mode] || f.mode : mapEn[f.mode] || f.mode)
    }
  }
  // de-dupe while preserving order
  return [...new Set(chips)].slice(0, 4)
}

export function TemplateGallery({ open, onClose, onSelect }: Props) {
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<Tab>('facade')
  const list = useMemo(() => templatesByCategory(tab), [tab])

  if (!open) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'facade', label: t('tplTabFacade') },
    { id: 'interior', label: t('tplTabInterior') },
    { id: 'landscape', label: t('tplTabLandscape') },
    { id: 'aerial', label: t('tplTabAerial') },
    { id: 'plan', label: t('tplTabPlan') },
  ]

  return (
    <div
      className="tpl-gallery-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('tplGalleryTitle')}
      onClick={onClose}
    >
      <div className="tpl-gallery-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-gallery-head">
          <div>
            <h2 className="tpl-gallery-title">{t('tplGalleryTitle')}</h2>
            <p className="tpl-gallery-sub">
              {t('tplGallerySub').replace('{n}', String(list.length))}
            </p>
          </div>
          <button type="button" className="tpl-gallery-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="tpl-gallery-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              className={`tpl-gallery-tab${tab === tb.id ? ' is-active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="tpl-gallery-grid">
          {list.map((tpl) => {
            const title = locale === 'zh' ? tpl.titleZh : tpl.titleEn
            const blurb = locale === 'zh' ? tpl.blurbZh : tpl.blurbEn
            const catLabel =
              tpl.category === 'facade'
                ? t('tplTabFacade')
                : tpl.category === 'interior'
                  ? t('tplTabInterior')
                  : tpl.category === 'landscape'
                    ? t('tplTabLandscape')
                    : tpl.category === 'aerial'
                      ? t('tplTabAerial')
                      : t('tplTabPlan')
            const chips = featureChips(tpl.features, locale === 'zh' ? 'zh' : 'en')
            return (
              <button
                key={tpl.id}
                type="button"
                className="tpl-card"
                onClick={() => onSelect(tpl)}
              >
                <div className="tpl-card-media">
                  <img src={tpl.thumbUrl} alt={title} loading="lazy" />
                  <span className="tpl-card-badge">{catLabel}</span>
                </div>
                <div className="tpl-card-body">
                  <div className="tpl-card-title">{title}</div>
                  <div className="tpl-card-blurb">{blurb}</div>
                  {chips.length > 0 && (
                    <div className="tpl-card-chips">
                      {chips.map((c) => (
                        <span key={c} className="tpl-card-chip">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
