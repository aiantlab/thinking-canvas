import { useI18n } from '../i18n'

type Props = {
  quotaUsed: number
  quotaTotal: number
  savedHint: string | null
  onRun: () => void
  onSave: () => void
  onExport: () => void
  onNew: () => void
  onLoadDemo: () => void
}

export function TopBar({
  quotaUsed,
  quotaTotal,
  savedHint,
  onRun,
  onSave,
  onExport,
  onNew,
  onLoadDemo,
}: Props) {
  const { t, locale, setLocale } = useI18n()
  const remain = Math.max(0, quotaTotal - quotaUsed)

  return (
    <header className="z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-panel px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white">
          <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden>
            <path d="M18 46 L32 14 L46 46 Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
            <path d="M26 46 H38" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-bold tracking-tight text-ink">{t('logoTitle')}</div>
          <div className="truncate text-[11px] font-medium text-muted">{t('logoSub')}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {savedHint ? (
          <span className="hidden text-[11px] text-mint sm:inline">{savedHint}</span>
        ) : null}

        <div className="mr-1 flex items-center rounded-full border border-border bg-panel-2 p-0.5">
          <button
            type="button"
            onClick={() => setLocale('zh')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              locale === 'zh' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t('langZh')}
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              locale === 'en' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {t('langEn')}
          </button>
        </div>

        <button
          type="button"
          onClick={onRun}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-sky-500 px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(14,165,233,0.28)] hover:brightness-105"
        >
          <span aria-hidden>▶</span>
          {t('run')}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-panel px-3 py-2 text-[12px] font-medium text-ink hover:bg-panel-2"
        >
          <span aria-hidden>💾</span>
          {t('save')}
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-panel px-3 py-2 text-[12px] font-medium text-ink hover:bg-panel-2"
        >
          <span aria-hidden>⇪</span>
          {t('export')}
        </button>
        <button
          type="button"
          onClick={onNew}
          className="rounded-[10px] px-2.5 py-2 text-[12px] text-muted hover:bg-panel-2 hover:text-ink"
        >
          {t('new')}
        </button>
        <button
          type="button"
          onClick={onLoadDemo}
          className="rounded-[10px] px-2.5 py-2 text-[12px] text-muted hover:bg-panel-2 hover:text-ink"
        >
          {t('demo')}
        </button>

        <div className="ml-1 flex items-center gap-1.5 rounded-[10px] border border-border bg-panel-2 px-2.5 py-1.5">
          <span className="text-[9px] uppercase tracking-wider text-muted">{t('quota')}</span>
          <span className="font-mono text-[12px] font-semibold text-ink">
            {remain}
            <span className="font-normal text-muted">/{quotaTotal}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
