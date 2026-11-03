type Props = {
  onLoadDemo: () => void
  onAddGenerate: () => void
}

export function EmptyState({ onLoadDemo, onAddGenerate }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm rounded-[8px] border border-border bg-panel/95 p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] bg-panel-2 ring-1 ring-gold/30">
          <span className="text-lg text-gold">∞</span>
        </div>
        <h2 className="text-[15px] font-semibold tracking-wide text-ink">从一条生成链路开始</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          左侧添加节点并连线：参考图 → 提示词 / 参数 → 生成 → 结果。观感对标专业节点编辑器。
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onLoadDemo}
            className="rounded-[4px] bg-gold px-3.5 py-1.5 text-[12px] font-semibold text-[#1a1410] hover:brightness-110"
          >
            载入演示节点
          </button>
          <button
            type="button"
            onClick={onAddGenerate}
            className="rounded-[4px] border border-border bg-panel-2 px-3.5 py-1.5 text-[12px] text-ink hover:border-gold/40"
          >
            添加生成卡
          </button>
        </div>
      </div>
    </div>
  )
}
