import localforage from 'localforage'
import type { OnboardingFlow, Submission } from '../types'

// ─── Two separate IndexedDB stores ──────────────────────────
const flowStore = localforage.createInstance({
  name: 'conversational-agent',
  storeName: 'flows',
})

const submissionStore = localforage.createInstance({
  name: 'conversational-agent',
  storeName: 'submissions',
})

// ─── Flows ──────────────────────────────────────────────────
export async function getAllFlows(): Promise<OnboardingFlow[]> {
  const items: OnboardingFlow[] = []
  await flowStore.iterate<OnboardingFlow, void>((value) => {
    items.push(value)
  })
  return items
}

export async function putFlow(flow: OnboardingFlow): Promise<void> {
  await flowStore.setItem(flow.id, flow)
}

export async function deleteFlow(id: string): Promise<void> {
  await flowStore.removeItem(id)
}

export async function clearFlows(): Promise<void> {
  await flowStore.clear()
}

export async function replaceAllFlows(flows: OnboardingFlow[]): Promise<void> {
  await flowStore.clear()
  await Promise.all(flows.map((f) => flowStore.setItem(f.id, f)))
}

// ─── Submissions ────────────────────────────────────────────
export async function getAllSubmissions(): Promise<Submission[]> {
  const items: Submission[] = []
  await submissionStore.iterate<Submission, void>((value) => {
    items.push(value)
  })
  return items
}

export async function putSubmission(sub: Submission): Promise<void> {
  await submissionStore.setItem(sub.id, sub)
}

export async function deleteSubmission(id: string): Promise<void> {
  await submissionStore.removeItem(id)
}

export async function deleteSubmissionsByFlowId(flowId: string): Promise<void> {
  const keysToDelete: string[] = []
  await submissionStore.iterate<Submission, void>((value, key) => {
    if (value.flowId === flowId) keysToDelete.push(key)
  })
  await Promise.all(keysToDelete.map((k) => submissionStore.removeItem(k)))
}

export async function clearSubmissions(): Promise<void> {
  await submissionStore.clear()
}

export async function replaceAllSubmissions(subs: Submission[]): Promise<void> {
  await submissionStore.clear()
  await Promise.all(subs.map((s) => submissionStore.setItem(s.id, s)))
}

// ─── Storage estimation ─────────────────────────────────────
export async function estimateStorageUsage(): Promise<string> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    const bytes = est.usage ?? 0
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return '—'
}

// ─── Migration helper ───────────────────────────────────────
const MIGRATED_KEY = 'ca_idb_migrated'

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return

  try {
    const rawFlows = localStorage.getItem('ca_flows')
    const rawSubs = localStorage.getItem('ca_submissions')

    if (rawFlows) {
      const flows = JSON.parse(rawFlows) as OnboardingFlow[]
      await replaceAllFlows(flows)
    }
    if (rawSubs) {
      const subs = JSON.parse(rawSubs) as Submission[]
      await replaceAllSubmissions(subs)
    }

    // Mark migration done and remove old keys
    localStorage.setItem(MIGRATED_KEY, '1')
    localStorage.removeItem('ca_flows')
    localStorage.removeItem('ca_submissions')
  } catch {
    // If migration fails, keep localStorage data for next attempt
  }
}
