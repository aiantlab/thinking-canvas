const SESSION_KEY = 'canno-auth-session-v1'

export type Entitlement = {
  plan: string
  status: string
  usage: number
  generation_limit: number
  remaining: number
  max_resolution?: string
  unlimited?: boolean
  period_start?: string | null
  period_end?: string | null
}

export type AuthSession = {
  email: string
  token: string
  entitlement: Entitlement
}


async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.email || !parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function authHeaders(token?: string | null): HeadersInit {
  const t = token ?? loadSession()?.token
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (t) h.Authorization = `Bearer ${t}`
  return h
}


export async function registerAccount(email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || data.ok === false) throw new Error(String(data.error || '账号验证失败，请稍后再试。'))
  return data
}

export async function loginAccount(email: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseJson(res)
  if (!res.ok || data.ok === false) throw new Error(String(data.error || '账号验证失败，请稍后再试。'))
  const session: AuthSession = {
    email: String(data.email || email),
    token: String(data.token || ''),
    entitlement: (data.entitlement || {
      plan: 'free',
      status: 'active',
      usage: 0,
      generation_limit: 30,
      remaining: 30,
      max_resolution: '2K',
      unlimited: false,
    }) as Entitlement,
  }
  if (!session.token) throw new Error('登录未返回会话。')
  saveSession(session)
  return session
}

export async function fetchMe(token?: string | null): Promise<AuthSession> {
  const res = await fetch('/api/auth/me', { headers: authHeaders(token) })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(String(data.error || '未登录。'))
  const prev = loadSession()
  const session: AuthSession = {
    email: String(data.email || prev?.email || ''),
    token: token || prev?.token || '',
    entitlement: data.entitlement as Entitlement,
  }
  if (!session.email || !session.token) throw new Error('会话无效。')
  saveSession(session)
  return session
}

export async function logoutAccount(): Promise<void> {
  const prev = loadSession()
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders(prev?.token) })
  } catch {
    /* ignore */
  }
  saveSession(null)
}

export async function consumeQuota(amount = 1): Promise<Entitlement | null> {
  const prev = loadSession()
  if (!prev?.token) return null
  const res = await fetch('/api/auth/consume', {
    method: 'POST',
    headers: authHeaders(prev.token),
    body: JSON.stringify({ amount }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    if (data.entitlement) {
      const next = { ...prev, entitlement: data.entitlement as Entitlement }
      saveSession(next)
    }
    throw new Error(String(data.error || '额度不足。'))
  }
  const entitlement = data.entitlement as Entitlement
  saveSession({ ...prev, entitlement })
  return entitlement
}

export function entitlementToQuota(e: Entitlement): { used: number; total: number; unlimited?: boolean; maxResolution?: string } {
  if (e.unlimited || e.plan === 'admin') {
    return { used: 0, total: 999999999, unlimited: true, maxResolution: '4K' }
  }
  return {
    used: Number(e.usage) || 0,
    total: Number(e.generation_limit) || 0,
    unlimited: false,
    maxResolution: e.max_resolution || '2K',
  }
}
