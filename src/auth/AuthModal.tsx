import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { loginAccount, registerAccount } from './authClient'
import { useI18n } from '../i18n'
import type { AuthSession } from './authClient'

type Mode = 'login' | 'register'

type Props = {
  open: boolean
  initialMode?: Mode
  onClose: () => void
  onSuccess: (session: AuthSession) => void
}

function passwordStrength(pw: string) {
  if (!pw) return { level: 'idle' as const, labelKey: 'authStrengthIdle' as const, score: 0 }
  let c = 0
  if (pw.length >= 8) c += 1
  if (/^[A-Z]/.test(pw)) c += 1
  if (/[a-z]/.test(pw)) c += 1
  if (/\d/.test(pw)) c += 1
  if (/[^A-Za-z0-9]/.test(pw)) c += 1
  if (pw.length >= 12) c += 1
  if (c <= 2) return { level: 'weak' as const, labelKey: 'authStrengthWeak' as const, score: 1 }
  if (c <= 4) return { level: 'medium' as const, labelKey: 'authStrengthMedium' as const, score: 2 }
  return { level: 'strong' as const, labelKey: 'authStrengthStrong' as const, score: 3 }
}

export function AuthModal({ open, initialMode = 'login', onClose, onSuccess }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const strength = useMemo(() => passwordStrength(password), [password])

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setError('')
    setSuccess('')
  }, [open, initialMode])

  if (!open) return null

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setSuccess('')
  }

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting.current) return
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('authEmailInvalid'))
      return
    }
    if (mode === 'register' && password.length < 8) {
      setError(t('authPasswordNeed8'))
      return
    }
    if (mode === 'register' && !/^[A-Z]/.test(password)) {
      setError(t('authPasswordUpper'))
      return
    }
    if (mode === 'login' && password.length < 6) {
      setError(t('authPasswordMin6'))
      return
    }
    setError('')
    submitting.current = true
    setBusy(true)
    try {
      if (mode === 'register') {
        await registerAccount(trimmed, password)
        // Auto-login after register so generate has a live session immediately.
        const session = await loginAccount(trimmed, password)
        onSuccess(session)
        onClose()
        return
      }
      const session = await loginAccount(trimmed, password)
      onSuccess(session)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authFailed'))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onBackdrop}>
      <section
        className="auth-dialog auth-dialog-account"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? t('authLoginTitle') : t('authRegisterTitle')}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
      >
        <button className="auth-close" type="button" onClick={onClose} aria-label={t('closeLightbox')}>
          ×
        </button>

        <div className="auth-dialog-copy">
          <span className="auth-eyebrow">CANNO ACCOUNT</span>
          <h2>{mode === 'login' ? t('authLoginTitle') : t('authRegisterTitle')}</h2>
          <p>{t('authHelper')}</p>
          <p className="auth-password-warning" role="note">
            <span aria-hidden>⚠</span>
            <span>{t('authPasswordWarning')}</span>
          </p>
          <div className="auth-logo-showcase">
            <strong>{t('logoTitle')}</strong>
          </div>
        </div>

        <div className="auth-dialog-flow">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => switchMode('login')}
            >
              {t('authLoginTab')}
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => switchMode('register')}
            >
              {t('authRegisterTab')}
            </button>
          </div>

          <form onSubmit={(e) => void onSubmit(e)}>
            {success ? (
              <p className="auth-success-note" role="status">
                <span aria-hidden>✓</span>
                {success}
              </p>
            ) : null}

            <label>
              <span>{t('authEmail')}</span>
              <span className="auth-field">
                <span aria-hidden>✉</span>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </label>

            <label>
              <span>{t('authPassword')}</span>
              <span className="auth-field">
                <span aria-hidden>⚿</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? t('authPasswordMin8') : t('authPasswordPlaceholder')}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPw ? t('authHidePassword') : t('authShowPassword')}
                  aria-pressed={showPw}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </span>
            </label>

            {mode === 'register' ? (
              <div className={`password-strength is-${strength.level}`} aria-live="polite">
                <div className="password-strength-head">
                  <span>{t('authPasswordStrength')}</span>
                  <strong>{t(strength.labelKey)}</strong>
                </div>
                <div className="password-strength-meter" aria-hidden>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={strength.score >= n ? 'is-active' : ''} />
                  ))}
                </div>
                <small>{t('authPasswordHint')}</small>
              </div>
            ) : null}


            {error ? <p className="auth-error">{error}</p> : null}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy
                ? t('authSubmitting')
                : mode === 'login'
                  ? t('authLoginSubmit')
                  : t('authRegisterSubmitFull')}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
