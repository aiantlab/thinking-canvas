import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

type Props = {
  quotaUsed: number
  quotaTotal: number
  quotaUnlimited?: boolean
  savedHint: string | null
  accountEmail: string | null
  onRun: () => void
  onSave: () => void
  onExport: () => void
  onImport: () => void
  onNew: () => void
  onLoadDemo: () => void
  onBuy: () => void
  onSignIn: () => void
  onSignUp: () => void
  onSignOut: () => void
}

export function TopBar({
  quotaUsed,
  quotaTotal,
  quotaUnlimited,
  savedHint,
  accountEmail,
  onRun,
  onSave,
  onExport,
  onImport,
  onNew,
  onLoadDemo,
  onBuy,
  onSignIn,
  onSignUp,
  onSignOut,
}: Props) {
  const { t, locale, setLocale } = useI18n()
  const remain = Math.max(0, quotaTotal - quotaUsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-panel px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="brand-mark flex min-w-0 items-center gap-0.5">
        <img
          src="/assets/brand-icon.png"
          alt=""
          width={30}
          height={30}
          className="brand-icon h-[30px] w-[30px] shrink-0 object-contain"
          draggable={false}
        />
        <span className="brand-wordmark truncate">
          {t('logoTitle')}
        </span>
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
          className="rounded-[10px] border border-border bg-panel px-2.5 py-2 text-[12px] font-medium text-ink hover:bg-panel-2"
          title={t('export')}
        >
          {t('export')}
        </button>
        <button
          type="button"
          onClick={onImport}
          className="rounded-[10px] border border-border bg-panel px-2.5 py-2 text-[12px] font-medium text-ink hover:bg-panel-2"
          title={t('import')}
        >
          {t('import')}
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

        {accountEmail ? (
          <>
            <button
              type="button"
              onClick={onBuy}
              className="ml-1 flex items-center gap-1.5 rounded-[10px] border border-border bg-panel-2 px-2.5 py-1.5 hover:bg-panel"
              title={t('buyCredits')}
            >
              <span className="text-[9px] uppercase tracking-wider text-muted">{t('quota')}</span>
              <span className="font-mono text-[12px] font-semibold text-ink">
                {quotaUnlimited ? (
                  t('quotaUnlimited')
                ) : (
                  <>
                    {remain}
                    <span className="font-normal text-muted">/{quotaTotal}</span>
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onBuy}
              className="rounded-[10px] border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[12px] font-semibold text-sky-700 hover:bg-sky-100"
            >
              {t('buyCredits')}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="max-w-[160px] truncate rounded-[10px] border border-border bg-panel px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-panel-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                {accountEmail}
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-[10px] border border-border bg-panel shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-border-soft px-3 py-2 text-[11px] text-muted">
                    {t('authAccount')}
                  </div>
                  <div className="truncate px-3 py-2 text-[12px] font-medium text-ink">{accountEmail}</div>
                  <button
                    type="button"
                    className="w-full border-t border-border-soft px-3 py-2 text-left text-[12px] text-danger hover:bg-panel-2"
                    onClick={() => {
                      setMenuOpen(false)
                      onSignOut()
                    }}
                  >
                    {t('authSignOut')}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="ml-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-[10px] border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-panel-2"
            >
              {t('authSignIn')}
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className="rounded-[10px] bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
            >
              {t('authSignUp')}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
