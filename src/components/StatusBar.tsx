import { useI18n } from '../i18n'

type Props = {
  nodeCount: number
  edgeCount: number
  zoomPct: number
  savedAgo?: string | null
}

export function StatusBar({ nodeCount, edgeCount, zoomPct, savedAgo }: Props) {
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
        <span className="inline-flex items-center gap-1.5">
          {t('grid')}
          <span className="inline-block h-3.5 w-7 rounded-full bg-gold/90 relative">
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </span>
      </div>
    </footer>
  )
}
