import { create } from 'zustand'
import { AppStore, OnboardingFlow, Submission } from '../types'
import {
  fetchFlows,
  createFlow as apiCreateFlow,
  updateFlow as apiUpdateFlow,
  deleteFlow as apiDeleteFlow,
} from './flows-api'
import {
  fetchSubmissions,
  createSubmission as apiCreateSubmission,
  patchSubmission as apiPatchSubmission,
} from './submissions-api'

// Zustand store — in-memory cache backed by server API
export const useStore = create<AppStore>((set) => ({
  flows: [],
  submissions: [],

  setFlows: (flows) => set({ flows }),
  setSubmissions: (submissions) => set({ submissions }),

  addFlow: async (flow: OnboardingFlow) => {
    const created = await apiCreateFlow(flow)
    set((state) => ({ flows: [...state.flows, created] }))
  },

  updateFlow: async (id: string, updates: Partial<OnboardingFlow>) => {
    const updated = await apiUpdateFlow(id, updates)
    set((state) => ({
      flows: state.flows.map((f) => (f.id === id ? updated : f)),
    }))
  },

  deleteFlow: async (id: string) => {
    await apiDeleteFlow(id)
    set((state) => ({ flows: state.flows.filter((f) => f.id !== id) }))
  },

  addSubmission: async (submission: Submission) => {
    const created = await apiCreateSubmission(submission)
    set((state) => ({ submissions: [...state.submissions, created] }))
  },

  updateSubmission: async (id: string, updates: Partial<Submission>) => {
    const patch = {
      status: updates.status,
      generatedSQL: updates.generatedSQL,
      executedAt: updates.executedAt ?? undefined,
    }
    const updated = await apiPatchSubmission(id, patch)
    set((state) => ({
      submissions: state.submissions.map((s) => (s.id === id ? updated : s)),
    }))
  },
}))

// Initialize store by fetching from server (replaces old IndexedDB init)
export async function initStore() {
  const [flows, submissions] = await Promise.all([
    fetchFlows(),
    fetchSubmissions(),
  ])
  useStore.setState({ flows, submissions })
}
