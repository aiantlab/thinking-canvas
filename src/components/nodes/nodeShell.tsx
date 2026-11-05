import type { ReactNode } from 'react'

type Props = {
  title: string
  accent?: string
  badge?: string
  children: ReactNode
  footer?: ReactNode
  running?: boolean
  icon?: ReactNode
  headerTint?: string
  /** Tailwind width class; default w-[288px] */
  widthClass?: string
  /** Optional chrome delete (also Delete/Backspace when selected) */
  onDelete?: () => void
  deleteLabel?: string
}

export function NodeShell({
  title,
  accent = '#3b82f6',
  badge,
  children,
  footer,
  running,
  icon,
  headerTint,
  widthClass = 'w-[288px]',
  onDelete,
  deleteLabel = 'Delete',
}: Props) {
  return (
    <div
      className={`node-shell relative overflow-hidden rounded-[14px] border border-border bg-panel shadow-[0_10px_28px_rgba(15,23,42,0.08)] ${widthClass} ${
        running ? 'is-running' : ''
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 w-[4px]"
        style={{ background: accent }}
        aria-hidden
      />

      <div
        className="flex items-center justify-between gap-2 border-b border-border-soft pl-4 pr-2 py-2"
        style={{
          background: headerTint || `linear-gradient(180deg, ${accent}18 0%, #ffffff 100%)`,
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
          <span className="truncate text-[13px] font-semibold tracking-wide text-ink">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {badge ? (
            <span
              className="rounded-full px-2 py-[2px] font-mono text-[9px] uppercase tracking-wider"
              style={{
                color: accent,
                background: `${accent}14`,
                border: `1px solid ${accent}33`,
              }}
            >
              {badge}
            </span>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              title={deleteLabel}
              aria-label={deleteLabel}
              className="nodrag nopan flex h-6 w-6 items-center justify-center rounded-md text-[14px] text-muted hover:bg-danger/10 hover:text-danger"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2.5 px-3.5 py-3 pl-4">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-border-soft bg-panel-2/80 px-3.5 py-2 pl-4 text-[10px] text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
      {children}
    </div>
  )
}

export const inputClass =
  'nodrag nopan w-full rounded-[8px] border border-border bg-panel-2 px-2.5 py-1.5 text-[12px] leading-snug text-ink outline-none placeholder:text-muted/60 focus:border-gold/50 focus:ring-2 focus:ring-gold/15'

export const selectClass =
  'nodrag nopan w-full rounded-[8px] border border-border bg-panel-2 px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/15'

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-gold px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.28)] hover:brightness-105 active:brightness-95 disabled:opacity-40 disabled:pointer-events-none transition'

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-border bg-panel px-2.5 py-1.5 text-[12px] text-ink hover:border-gold/40 hover:bg-panel-2 disabled:opacity-40 transition'
