import type { OnboardingFlow } from '@/types'

const BASE = '/api/flows'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchFlows(): Promise<OnboardingFlow[]> {
  const res = await fetch(BASE, { credentials: 'include' })
  const data = await handle<{ flows: OnboardingFlow[] }>(res)
  return data.flows
}

export async function fetchFlow(id: string): Promise<OnboardingFlow> {
  const res = await fetch(`${BASE}/${id}`, { credentials: 'include' })
  return (await handle<{ flow: OnboardingFlow }>(res)).flow
}

export async function createFlow(flow: Omit<OnboardingFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<OnboardingFlow> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flow),
  })
  return (await handle<{ flow: OnboardingFlow }>(res)).flow
}

export async function updateFlow(id: string, updates: Partial<OnboardingFlow>): Promise<OnboardingFlow> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return (await handle<{ flow: OnboardingFlow }>(res)).flow
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', credentials: 'include' })
  await handle<{ ok: boolean }>(res)
}
