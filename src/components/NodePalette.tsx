import { useI18n, type MessageKey } from '../i18n'
import type { NodeKind } from '../types'

type PaletteItem = {
  type: NodeKind
  labelKey: MessageKey
  accent: string
  icon: string
}

const ITEMS: PaletteItem[] = [
  { type: 'upload', labelKey: 'nodeUpload', accent: '#0ea5e9', icon: '⧉' },
  { type: 'styleref', labelKey: 'nodeStyleRef', accent: '#8b5cf6', icon: '✦' },
  { type: 'colorzones', labelKey: 'nodeColorZones', accent: '#f97316', icon: '▦' },
  { type: 'params', labelKey: 'nodeParams', accent: '#8b5cf6', icon: '◈' },
  { type: 'prompt', labelKey: 'nodePrompt', accent: '#a855f7', icon: '✎' },
  { type: 'generate', labelKey: 'nodeGenerate', accent: '#f59e0b', icon: '✦' },
  { type: 'result', labelKey: 'nodeResult', accent: '#14b8a6', icon: '▣' },
  { type: 'inpaint', labelKey: 'nodeInpaint', accent: '#ec4899', icon: '🖌' },
  { type: 'tool', labelKey: 'nodeTool', accent: '#7c3aed', icon: '⚒' },
]

type Props = {
  onAdd: (type: NodeKind) => void
}

/** Compact left rail for adding nodes — scrolls when many tools. */
export function NodePalette({ onAdd }: Props) {
  const { t } = useI18n()

  return (
    <aside
      className="node-toolbar z-20 flex h-full min-h-0 w-[72px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r border-border bg-panel py-2.5"
      aria-label={t('nodePalette')}
    >
      {ITEMS.map((it) => (
        <button
          key={it.type}
          type="button"
          title={t(it.labelKey)}
          aria-label={t(it.labelKey)}
          onClick={() => onAdd(it.type)}
          className="flex w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 transition hover:brightness-105 active:scale-95"
          style={{
            color: it.accent,
            background: `${it.accent}14`,
            border: `1px solid ${it.accent}33`,
          }}
        >
          <span className="text-[15px] leading-none">{it.icon}</span>
          <span className="max-w-full truncate text-center text-[9px] font-medium leading-tight text-ink">
            {t(it.labelKey)}
          </span>
        </button>
      ))}
    </aside>
  )
}
