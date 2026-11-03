import { useI18n } from '../i18n'
import { Preview3DView } from './Preview3DView'

type Props = {
  open: boolean
  imageUrl?: string
  onClose: () => void
}

export function Preview3DModal({ open, imageUrl, onClose }: Props) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm">
      <div className="flex h-[min(720px,85vh)] w-[min(960px,94vw)] flex-col overflow-hidden rounded-[16px] border border-border bg-panel shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[14px] font-semibold text-ink">{t('preview3dTitle')}</div>
            <div className="text-[11px] text-muted">{t('preview3dHint')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-border px-3 py-1.5 text-[12px] text-ink hover:bg-panel-2"
          >
            {t('close3d')}
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-canvas">
          <Preview3DView imageUrl={imageUrl} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
