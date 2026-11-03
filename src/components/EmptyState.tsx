import { useI18n } from '../i18n'

type Props = {
  onLoadDemo: () => void
  onAddGenerate: () => void
}

export function EmptyState({ onLoadDemo, onAddGenerate }: Props) {
  const { t } = useI18n()
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm rounded-[16px] border border-border bg-panel p-5 text-center shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-ink text-white">
          <span className="text-lg">A</span>
        </div>
        <h2 className="text-[15px] font-semibold tracking-wide text-ink">{t('emptyTitle')}</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">{t('emptyBody')}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onLoadDemo}
            className="rounded-[8px] bg-gold px-3.5 py-1.5 text-[12px] font-semibold text-white hover:brightness-105"
          >
            {t('loadDemo')}
          </button>
          <button
            type="button"
            onClick={onAddGenerate}
            className="rounded-[8px] border border-border bg-panel-2 px-3.5 py-1.5 text-[12px] text-ink hover:border-gold/40"
          >
            {t('addGenerate')}
          </button>
        </div>
      </div>
    </div>
  )
}
