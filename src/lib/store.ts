import { create } from 'zustand'
import { AppStore } from '../types'
import {
  getAllFlows,
  getAllSubmissions,
  saveFlow as dbSaveFlow,
  deleteFlow as dbDeleteFlow,
  saveSubmission as dbSaveSubmission,
} from './db'

// Zustand store for application state
export const useStore = create<AppStore>((set, get) => ({
  flows: [],
  submissions: [],

  setFlows: (flows) => set({ flows }),
  setSubmissions: (submissions) => set({ submissions }),

  addFlow: async (flow) => {
    await dbSaveFlow(flow)
    set((state) => ({ flows: [...state.flows, flow] }))
  },

  updateFlow: async (id, updates) => {
    const flows = get().flows
    const flow = flows.find((f) => f.id === id)
    if (flow) {
      const updated = { ...flow, ...updates, updatedAt: new Date() }
      await dbSaveFlow(updated)
      set((state) => ({
        flows: state.flows.map((f) => (f.id === id ? updated : f)),
      }))
    }
  },

  deleteFlow: async (id) => {
    await dbDeleteFlow(id)
    set((state) => ({ flows: state.flows.filter((f) => f.id !== id) }))
  },

  addSubmission: async (submission) => {
    await dbSaveSubmission(submission)
    set((state) => ({ submissions: [...state.submissions, submission] }))
  },

  updateSubmission: async (id, updates) => {
    const submissions = get().submissions
    const submission = submissions.find((s) => s.id === id)
    if (submission) {
      const updated = { ...submission, ...updates }
      await dbSaveSubmission(updated)
      set((state) => ({
        submissions: state.submissions.map((s) => (s.id === id ? updated : s)),
      }))
    }
  },
}))

// Initialize store with data from IndexedDB
export async function initStore() {
  const flows = await getAllFlows()
  const submissions = await getAllSubmissions()
  useStore.setState({ flows, submissions })
}
