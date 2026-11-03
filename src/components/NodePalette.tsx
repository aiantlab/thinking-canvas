import { useMemo, useState } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import type { NodeKind } from '../types'

type CatId = 'all' | 'input' | 'text' | 'control' | 'generate' | 'output' | 'visualize'

type PaletteItem = {
  type: NodeKind
  labelKey: MessageKey
  group: CatId
  accent: string
  icon: string
  enabled?: boolean
}

const ITEMS: PaletteItem[] = [
  { type: 'upload', labelKey: 'nodeUpload', group: 'input', accent: '#0ea5e9', icon: '⧉' },
  { type: 'params', labelKey: 'nodeParams', group: 'input', accent: '#8b5cf6', icon: '◈' },
  { type: 'prompt', labelKey: 'nodePrompt', group: 'text', accent: '#a855f7', icon: '✎' },
  { type: 'generate', labelKey: 'nodeGenerate', group: 'generate', accent: '#f59e0b', icon: '✦' },
  { type: 'result', labelKey: 'nodeResult', group: 'output', accent: '#14b8a6', icon: '▣' },
  { type: 'preview3d', labelKey: 'nodePreview3d', group: 'visualize', accent: '#6366f1', icon: '⬡' },
]

const CATS: { id: CatId; labelKey: MessageKey; color: string }[] = [
  { id: 'all', labelKey: 'catAll', color: '#3b82f6' },
  { id: 'input', labelKey: 'catInput', color: '#f472b6' },
  { id: 'text', labelKey: 'catText', color: '#fb923c' },
  { id: 'control', labelKey: 'catControl', color: '#eab308' },
  { id: 'generate', labelKey: 'catGenerate', color: '#22c55e' },
  { id: 'output', labelKey: 'catOutput', color: '#38bdf8' },
  { id: 'visualize', labelKey: 'catVisualize', color: '#a78bfa' },
]

const GROUP_ORDER: { id: CatId; labelKey: MessageKey }[] = [
  { id: 'input', labelKey: 'groupInput' },
  { id: 'text', labelKey: 'groupText' },
  { id: 'control', labelKey: 'groupControl' },
  { id: 'generate', labelKey: 'groupGeneration' },
  { id: 'output', labelKey: 'groupOutput' },
  { id: 'visualize', labelKey: 'groupVisualize' },
]

type Props = {
  onAdd: (type: NodeKind) => void
}

export function NodePalette({ onAdd }: Props) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<CatId>('all')

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return ITEMS.filter((it) => {
      if (cat !== 'all' && it.group !== cat) return false
      if (!qq) return true
      return t(it.labelKey).toLowerCase().includes(qq) || it.type.includes(qq)
    })
  }, [cat, q, t])

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      ...g,
      items: filtered.filter((it) => it.group === g.id),
    })).filter((g) => g.items.length > 0)
  }, [filtered])

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <h2 className="text-[13px] font-bold tracking-wide text-ink">{t('nodePalette')}</h2>
        <span className="text-muted" aria-hidden>
          ⌕
        </span>
      </div>

      <div className="px-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchNodes')}
          className="w-full rounded-[10px] border border-border bg-panel-2 px-3 py-2 text-[12px] text-ink outline-none placeholder:text-muted focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 px-3">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              cat === c.id ? 'text-white shadow-sm' : 'bg-panel-2 text-muted hover:text-ink'
            }`}
            style={cat === c.id ? { background: c.color } : undefined}
          >
            {t(c.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto px-2.5 pb-3">
        {grouped.map((g) => (
          <div key={g.id}>
            <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {t(g.labelKey)}
            </div>
            <div className="space-y-1">
              {g.items.map((it) => (
                <button
                  key={it.type}
                  type="button"
                  onClick={() => onAdd(it.type)}
                  className="flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2 py-2 text-left transition hover:border-border hover:bg-panel-2"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[13px]"
                    style={{
                      color: it.accent,
                      background: `${it.accent}14`,
                      border: `1px solid ${it.accent}33`,
                    }}
                  >
                    {it.icon}
                  </span>
                  <span className="flex-1 text-[12px] font-medium text-ink">{t(it.labelKey)}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: it.accent }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border-soft px-3 py-2.5 text-[11px] text-muted">
        ? {t('viewShortcuts')}
      </div>
    </aside>
  )
}
