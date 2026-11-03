import type { ReactNode } from 'react'

type Props = {
  title: string
  accent?: string
  badge?: string
  children: ReactNode
  footer?: ReactNode
  running?: boolean
  icon?: ReactNode
}

export function NodeShell({
  title,
  accent = '#d4a84b',
  badge,
  children,
  footer,
  running,
  icon,
}: Props) {
  return (
    <div
      className={`node-shell relative w-[272px] overflow-hidden rounded-[6px] border border-border bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
        running ? 'is-running' : ''
      }`}
    >
      {/* ComfyUI-style left color rail */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
        aria-hidden
      />

      {/* Title bar */}
      <div
        className="flex items-center justify-between gap-2 border-b border-border-soft pl-3.5 pr-2.5 py-[7px]"
        style={{ background: 'linear-gradient(180deg, #2a2a2e 0%, #222226 100%)' }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
          <span className="truncate text-[12px] font-semibold tracking-wide text-ink">
            {title}
          </span>
        </div>
        {badge ? (
          <span
            className="shrink-0 rounded-[3px] px-1.5 py-[2px] font-mono text-[9px] uppercase tracking-wider"
            style={{
              color: accent,
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${accent}44`,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 px-3 py-2.5 pl-3.5">{children}</div>

      {footer ? (
        <div className="border-t border-border-soft bg-panel-3/60 px-3 py-2 pl-3.5">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
      {children}
    </div>
  )
}

export function PortSlot({
  side,
  label,
  top,
  children,
}: {
  side: 'left' | 'right'
  label: string
  top: string
  children: ReactNode
}) {
  return (
    <div className="absolute" style={{ top, [side]: 0, transform: 'translateY(-50%)' }}>
      {children}
      <span className={`port-label ${side === 'left' ? 'left' : 'right'}`}>{label}</span>
    </div>
  )
}

export const inputClass =
  'w-full rounded-[4px] border border-border bg-panel-3 px-2 py-1.5 text-[12px] leading-snug text-ink outline-none placeholder:text-muted/60 focus:border-gold/50 focus:ring-1 focus:ring-gold/20'

export const selectClass =
  'w-full rounded-[4px] border border-border bg-panel-3 px-2 py-1.5 text-[12px] text-ink outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-[4px] bg-gold px-3 py-1.5 text-[12px] font-semibold text-[#1a1410] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:pointer-events-none transition'

export const btnGhost =
  'inline-flex items-center justify-center rounded-[4px] border border-border bg-panel-2 px-2.5 py-1.5 text-[12px] text-ink hover:border-gold/40 hover:bg-panel-3 disabled:opacity-40 transition'
