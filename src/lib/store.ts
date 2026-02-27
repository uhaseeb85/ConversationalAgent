import { create } from 'zustand'
import { AppStore, OnboardingFlow, Submission } from '../types'
import {
  getAllFlows,
  getAllSubmissions,
  putFlow,
  deleteFlow as idbDeleteFlow,
  deleteSubmissionsByFlowId,
  putSubmission,
  deleteSubmission as idbDeleteSubmission,
  replaceAllFlows,
  replaceAllSubmissions,
  migrateFromLocalStorage,
} from './idb'
import { createDemoFlow, DEMO_FLOW_ID } from './demo-flow'

// ─── Zustand store — IndexedDB-backed via localforage ──────
export const useStore = create<AppStore>((set, get) => ({
  flows: [],
  submissions: [],

  setFlows: (flows) => {
    set({ flows })
    replaceAllFlows(flows)
  },
  setSubmissions: (submissions) => {
    set({ submissions })
    replaceAllSubmissions(submissions)
  },

  addFlow: (flow: OnboardingFlow) => {
    const flows = [...get().flows, flow]
    set({ flows })
    putFlow(flow)
  },

  updateFlow: (id: string, updates: Partial<OnboardingFlow>) => {
    const flows = get().flows.map((f) => (f.id === id ? { ...f, ...updates } : f))
    set({ flows })
    const updated = flows.find((f) => f.id === id)
    if (updated) putFlow(updated)
  },

  deleteFlow: (id: string) => {
    const flows = get().flows.filter((f) => f.id !== id)
    const submissions = get().submissions.filter((s) => s.flowId !== id)
    set({ flows, submissions })
    idbDeleteFlow(id)
    deleteSubmissionsByFlowId(id)
  },

  addSubmission: (submission: Submission) => {
    const submissions = [...get().submissions, submission]
    set({ submissions })
    putSubmission(submission)
  },

  updateSubmission: (id: string, updates: Partial<Submission>) => {
    const submissions = get().submissions.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
    set({ submissions })
    const updated = submissions.find((s) => s.id === id)
    if (updated) putSubmission(updated)
  },

  deleteSubmission: (id: string) => {
    const submissions = get().submissions.filter((s) => s.id !== id)
    set({ submissions })
    idbDeleteSubmission(id)
  },
}))

// Initialize store from IndexedDB (async — must complete before first render)
export async function initStore(): Promise<void> {
  // Migrate old localStorage data to IndexedDB on first run
  await migrateFromLocalStorage()

  const flows = await getAllFlows()
  const submissions = await getAllSubmissions()

  // De-duplicate: remove any extra demo flows created by the old random-ID seeder
  const demoFlows = flows.filter(
    (f) => f.name === 'OAuth Client Registration (Demo)' || f.id === DEMO_FLOW_ID
  )
  if (demoFlows.length > 1) {
    // Keep only the one with the canonical DEMO_FLOW_ID (or the first one)
    const keep = demoFlows.find((f) => f.id === DEMO_FLOW_ID) ?? demoFlows[0]
    for (const dup of demoFlows) {
      if (dup.id !== keep.id) {
        const idx = flows.indexOf(dup)
        if (idx >= 0) flows.splice(idx, 1)
        await idbDeleteFlow(dup.id)
      }
    }
  }

  // Seed demo flow if no flows exist at all
  if (flows.length === 0) {
    const demo = createDemoFlow()
    await putFlow(demo)
    flows.push(demo)
  }

  useStore.setState({ flows, submissions })
}
