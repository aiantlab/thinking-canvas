type ToolItem = {
  type: 'upload' | 'prompt' | 'params' | 'generate' | 'result'
  label: string
  short: string
  accent: string
  icon: string
}

const TOOLS: ToolItem[] = [
  { type: 'upload', label: '参考/户型', short: '参考', accent: '#4ec9b0', icon: '⧉' },
  { type: 'prompt', label: '提示词', short: '提示', accent: '#d4a84b', icon: '✎' },
  { type: 'params', label: '视角风格', short: '参数', accent: '#9b8cff', icon: '◈' },
  { type: 'generate', label: '生成', short: '生成', accent: '#f0b429', icon: '▶' },
  { type: 'result', label: '结果卡', short: '结果', accent: '#4ec9b0', icon: '▣' },
]

type Props = {
  onAdd: (type: ToolItem['type']) => void
}

export function Toolbar({ onAdd }: Props) {
  return (
    <aside className="absolute left-3 top-[72px] z-20 flex flex-col items-stretch gap-0.5 rounded-[8px] border border-border bg-panel/95 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="px-1.5 pb-1 pt-0.5 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-muted/80">
        节点
      </div>
      {TOOLS.map((t) => (
        <button
          key={t.type}
          type="button"
          title={`${t.label} — 点击添加到画布`}
          onClick={() => onAdd(t.type)}
          className="group flex w-[56px] flex-col items-center gap-1 rounded-[6px] px-1 py-2 text-center transition hover:bg-panel-2"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border text-[14px] transition group-hover:brightness-110"
            style={{
              color: t.accent,
              borderColor: `${t.accent}55`,
              background: `${t.accent}14`,
            }}
          >
            {t.icon}
          </span>
          <span className="text-[10px] font-medium leading-none text-ink/90">{t.short}</span>
        </button>
      ))}
      <div className="mx-1 mt-1 border-t border-border-soft pt-1.5 text-center text-[8px] leading-tight text-muted/70">
        拖移 · 滚轮缩放
      </div>
    </aside>
  )
}
