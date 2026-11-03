type Props = {
  quotaUsed: number
  quotaTotal: number
  savedHint: string | null
  onSave: () => void
  onNew: () => void
  onLoadDemo: () => void
}

export function TopBar({
  quotaUsed,
  quotaTotal,
  savedHint,
  onSave,
  onNew,
  onLoadDemo,
}: Props) {
  const remain = Math.max(0, quotaTotal - quotaUsed)
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-[8px] border border-border bg-panel/90 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-panel-2 ring-1 ring-gold/35">
          <svg width="14" height="14" viewBox="0 0 64 64" fill="none" aria-hidden>
            <path d="M14 42 L26 18 L38 42 Z" stroke="#d4a84b" strokeWidth="4" />
            <rect x="34" y="28" width="16" height="14" stroke="#4ec9b0" strokeWidth="3" />
          </svg>
        </div>
        <div className="pr-1">
          <div className="text-[13px] font-semibold tracking-wide text-ink leading-tight">
            思维无限画布
          </div>
          <div className="text-[9px] text-muted leading-tight">建筑 · 室内 · 景观 · 工作流</div>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-0.5 rounded-[8px] border border-border bg-panel/90 px-1 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
        {savedHint ? (
          <span className="px-2 text-[11px] text-mint">{savedHint}</span>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          className="rounded-[5px] px-2.5 py-1.5 text-[11px] text-ink/90 hover:bg-panel-2"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onNew}
          className="rounded-[5px] px-2.5 py-1.5 text-[11px] text-ink/90 hover:bg-panel-2"
        >
          新建
        </button>
        <button
          type="button"
          onClick={onLoadDemo}
          className="rounded-[5px] px-2.5 py-1.5 text-[11px] text-muted hover:bg-panel-2 hover:text-ink"
        >
          演示
        </button>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 rounded-[5px] bg-panel-3 px-2 py-1">
          <span className="text-[9px] uppercase tracking-wider text-muted">额度</span>
          <span className="font-mono text-[12px] font-semibold text-gold">
            {remain}
            <span className="font-normal text-muted">/{quotaTotal}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
