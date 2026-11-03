import type { Edge, Node } from '@xyflow/react'

const KEY = 'thinking-canvas-v2'
const QUOTA_KEY = 'thinking-canvas-quota-v1'

export type PersistedGraph = {
  nodes: Node[]
  edges: Edge[]
  savedAt: number
}

export function loadGraph(): PersistedGraph | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedGraph
    if (!parsed?.nodes || !parsed?.edges) return null
    return parsed
  } catch {
    return null
  }
}

export function saveGraph(nodes: Node[], edges: Edge[]): void {
  const payload: PersistedGraph = {
    nodes,
    edges,
    savedAt: Date.now(),
  }
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export function clearGraph(): void {
  localStorage.removeItem(KEY)
}

export type QuotaState = {
  used: number
  total: number
}

export function loadQuota(): QuotaState {
  try {
    const raw = localStorage.getItem(QUOTA_KEY)
    if (raw) return JSON.parse(raw) as QuotaState
  } catch {
    /* ignore */
  }
  return { used: 3, total: 50 }
}

export function saveQuota(q: QuotaState): void {
  localStorage.setItem(QUOTA_KEY, JSON.stringify(q))
}
