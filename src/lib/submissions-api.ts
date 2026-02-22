import type { Submission, SubmissionStatus } from '@/types'

const BASE = '/api/submissions'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchSubmissions(flowId?: string): Promise<Submission[]> {
  const url = flowId ? `${BASE}?flowId=${flowId}` : BASE
  const res = await fetch(url, { credentials: 'include' })
  return (await handle<{ submissions: Submission[] }>(res)).submissions
}

export async function fetchSubmission(id: string): Promise<Submission> {
  const res = await fetch(`${BASE}/${id}`, { credentials: 'include' })
  return (await handle<{ submission: Submission }>(res)).submission
}

export async function createSubmission(submission: Omit<Submission, 'id'>): Promise<Submission> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })
  return (await handle<{ submission: Submission }>(res)).submission
}

export async function patchSubmission(
  id: string,
  updates: { status?: SubmissionStatus; generatedSQL?: string; executedAt?: string }
): Promise<Submission> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return (await handle<{ submission: Submission }>(res)).submission
}

export async function fetchSubmissionHistory(id: string) {
  const res = await fetch(`${BASE}/${id}/history`, { credentials: 'include' })
  return (await handle<{ history: unknown[] }>(res)).history
}

export async function recordExecutionHistory(
  id: string,
  results: Array<{ statement: string; success: boolean; rowsAffected?: number; error?: string }>
): Promise<void> {
  await fetch(`${BASE}/${id}/history`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  })
}
