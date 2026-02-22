import type { User } from '@/types'

const BASE = '/api/auth'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function register(email: string, password: string, name: string): Promise<User> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return (await handle<{ user: User }>(res)).user
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await handle<{ user: User }>(res)).user
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' })
}

export async function getMe(): Promise<User | null> {
  const res = await fetch(`${BASE}/me`, { credentials: 'include' })
  if (res.status === 401) return null
  return (await handle<{ user: User }>(res)).user
}
