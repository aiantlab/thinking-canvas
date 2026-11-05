import { useI18n } from '../i18n'

type Props = {
  nodeCount: number
  edgeCount: number
  zoomPct: number
  savedAgo?: string | null
  showGrid?: boolean
  onToggleGrid?: () => void
}

export function StatusBar({
  nodeCount,
  edgeCount,
  zoomPct,
  savedAgo,
  showGrid = true,
  onToggleGrid,
}: Props) {
  const { t } = useI18n()
  return (
    <footer className="z-20 flex h-8 items-center justify-between border-t border-border bg-panel px-4 text-[11px] text-muted">
      <div>
        {nodeCount} {t('statusNodes')} · {edgeCount} {t('statusConnections')}
      </div>
      <div>{savedAgo ? `${t('autosaved')} ${savedAgo}` : '—'}</div>
      <div className="flex items-center gap-3">
        <span>
          {t('zoom')} {zoomPct}%
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-panel-2"
          aria-pressed={showGrid}
          aria-label={t('grid')}
          onClick={() => onToggleGrid?.()}
        >
          {t('grid')}
          <span
            className={`relative inline-block h-3.5 w-7 rounded-full transition-colors ${
              showGrid ? 'bg-gold/90' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${
                showGrid ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </div>
    </footer>
  )
}
