import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { authHeaders, fetchMe, loadSession, type AuthSession } from './authClient'

type Pack = {
  id: string
  priceYuan: string
  generations: number
  maxResolution: string
  badgeZh?: string
  badgeEn?: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
}

type Props = {
  open: boolean
  onClose: () => void
  onEntitlement?: (session: AuthSession) => void
  onNeedLogin?: () => void
}

const PERSONAL_IDS = new Set(['pack_classic_2k', 'pack_personal_2k'])

/** Product demo thumbs already shipped under /templates — visual only, not feature claims. */
const SAMPLE = {
  promo: {
    src: '/templates/facade_night_thumb.webp',
    altZh: '夜间建筑效果示意',
    altEn: 'Night facade sample',
  },
  personal: {
    src: '/templates/facade_day_thumb.webp',
    altZh: '日景立面效果示意',
    altEn: 'Day facade sample',
  },
  enterprise: {
    src: '/templates/aerial_block_thumb.webp',
    altZh: '鸟瞰街区效果示意',
    altEn: 'Aerial block sample',
  },
} as const

export function PricingModal({ open, onClose, onEntitlement, onNeedLogin }: Props) {
  const { t, locale } = useI18n()
  const [packs, setPacks] = useState<Pack[]>([])
  const [configured, setConfigured] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payUrl, setPayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setPayUrl(null)
    void fetch('/api/pay/packs')
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          packs?: Pack[]
          paymentConfigured?: boolean
          error?: string
        }
        if (cancelled) return
        if (!res.ok) throw new Error(String(data.error || '加载套餐失败'))
        const list = Array.isArray(data.packs) ? data.packs : []
        const promoFirst = [...list].sort((a, b) => {
          const rank = (id: string) =>
            id === 'pack_promo_4k'
              ? 0
              : id === 'pack_classic_2k'
                ? 1
                : id === 'pack_personal_2k'
                  ? 2
                  : id === 'pack_enterprise_4k'
                    ? 3
                    : 9
          return rank(a.id) - rank(b.id)
        })
        setPacks(promoFirst)
        setConfigured(data.paymentConfigured !== false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const sections = useMemo(() => {
    const promo = packs.find((p) => p.id === 'pack_promo_4k') || null
    const personal = packs.filter((p) => PERSONAL_IDS.has(p.id))
    const enterprise = packs.find((p) => p.id === 'pack_enterprise_4k') || null
    const known = new Set<string>([
      ...(promo ? [promo.id] : []),
      ...personal.map((p) => p.id),
      ...(enterprise ? [enterprise.id] : []),
    ])
    const extras = packs.filter((p) => !known.has(p.id))
    return { promo, personal, enterprise, extras }
  }, [packs])

  if (!open) return null

  const buy = async (packId: string) => {
    setError(null)
    setPayUrl(null)
    const session = loadSession()
    if (!session?.token) {
      onNeedLogin?.()
      return
    }
    setBusyId(packId)
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: authHeaders(session.token),
        body: JSON.stringify({ packId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        payUrl?: string
        qrcodeUrl?: string
      }
      if (!res.ok) {
        if (data.code === 'UNAUTHORIZED') onNeedLogin?.()
        throw new Error(String(data.error || '发起支付失败'))
      }
      const url = data.payUrl || data.qrcodeUrl || null
      if (!url) throw new Error('未返回付款链接')
      setPayUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => {
        void fetchMe(session.token)
          .then((me) => onEntitlement?.(me))
          .catch(() => undefined)
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const badgeOf = (p: Pack) => (locale === 'zh' ? p.badgeZh : p.badgeEn)
  const titleOf = (p: Pack) => (locale === 'zh' ? p.titleZh : p.titleEn)
  const descOf = (p: Pack) => (locale === 'zh' ? p.descZh : p.descEn)
  const personalTitle = locale === 'zh' ? '个人版' : 'Personal'
  const enterpriseTitle = locale === 'zh' ? '企业版' : 'Enterprise'
  const sampleHint = locale === 'zh' ? '效果示意' : 'Sample'

  const buyButton = (packId: string, label?: string) => (
    <button
      type="button"
      disabled={!!busyId || !configured}
      onClick={() => void buy(packId)}
      className="w-full shrink-0 rounded-[10px] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
    >
      {busyId === packId ? t('pricingBusy') : label || t('pricingBuy')}
    </button>
  )

  const sampleBanner = (sample: (typeof SAMPLE)[keyof typeof SAMPLE]) => (
    <div className="relative mb-3 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-black/5">
      <img
        src={sample.src}
        alt={locale === 'zh' ? sample.altZh : sample.altEn}
        className="h-[88px] w-full object-cover sm:h-[100px]"
        loading="lazy"
        decoding="async"
      />
      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white/95">
        {sampleHint}
      </span>
    </div>
  )

  const singleCard = (
    p: Pack,
    opts?: { heading?: string; sample?: (typeof SAMPLE)[keyof typeof SAMPLE] },
  ) => (
    <div
      key={p.id}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border bg-panel-2 p-3 sm:p-4"
    >
      {opts?.sample ? sampleBanner(opts.sample) : null}
      {badgeOf(p) ? (
        <div className="mb-2 inline-flex w-fit shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          {badgeOf(p)}
        </div>
      ) : (
        <div className="mb-2 h-[18px] shrink-0" aria-hidden />
      )}
      <div className="shrink-0 text-[13px] font-semibold text-ink">{opts?.heading || titleOf(p)}</div>
      <div className="mt-2 shrink-0 font-mono text-[20px] font-bold text-ink sm:text-[22px]">
        ¥{p.priceYuan}
      </div>
      <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted">{descOf(p)}</p>
      <div className="mt-auto pt-3">{buyButton(p.id)}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{t('pricingTitle')}</h2>
            <p className="mt-1 text-[12px] text-muted">{t('pricingSub')}</p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-[12px] text-muted hover:bg-panel-2 hover:text-ink"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 items-stretch gap-3 rounded-xl border border-border bg-panel-2/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
            {sections.promo ? singleCard(sections.promo, { sample: SAMPLE.promo }) : null}

            {sections.personal.length ? (
              <div className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border bg-panel-2 p-3 sm:p-4">
                {sampleBanner(SAMPLE.personal)}
                {/* Spacer matches badge row height on sibling cards so titles share a line */}
                <div className="mb-2 h-[18px] shrink-0" aria-hidden />
                <div className="shrink-0 text-[13px] font-semibold text-ink">{personalTitle}</div>
                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row sm:items-stretch">
                    {sections.personal.map((p) => (
                      <div
                        key={p.id}
                        className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/80 bg-panel px-3 py-3"
                      >
                        <div className="shrink-0 font-mono text-[18px] font-bold text-ink sm:text-[20px]">
                          ¥{p.priceYuan}
                        </div>
                        <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-muted">{descOf(p)}</p>
                      </div>
                    ))}
                  </div>
                  {/* Shared footer so both personal buy bars sit on the same baseline as siblings */}
                  <div className="mt-auto flex shrink-0 gap-3 pt-3">
                    {sections.personal.map((p) => (
                      <div key={`buy-${p.id}`} className="min-w-0 flex-1">
                        {buyButton(p.id)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {sections.enterprise
              ? singleCard(sections.enterprise, {
                  heading: enterpriseTitle,
                  sample: SAMPLE.enterprise,
                })
              : null}

            {sections.extras.map((p) => singleCard(p))}
          </div>
        </div>

        {!configured ? (
          <div className="border-t border-border px-5 py-3 text-[12px] text-amber-700">
            {t('pricingNotConfigured')}
          </div>
        ) : null}
        {error ? (
          <div className="border-t border-border px-5 py-3 text-[12px] text-danger">{error}</div>
        ) : null}
        {payUrl ? (
          <div className="border-t border-border px-5 py-3 text-[12px] text-muted">
            {t('pricingOpened')}{' '}
            <a className="text-sky-600 underline" href={payUrl} target="_blank" rel="noreferrer">
              {t('pricingOpenAgain')}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
