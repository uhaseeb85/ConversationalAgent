import { create } from 'zustand'
import { AppStore, OnboardingFlow, Submission } from '../types'

const FLOWS_KEY = 'ca_flows'
const SUBMISSIONS_KEY = 'ca_submissions'

function readFlows(): OnboardingFlow[] {
  try {
    const raw = localStorage.getItem(FLOWS_KEY)
    return raw ? (JSON.parse(raw) as OnboardingFlow[]) : []
  } catch {
    return []
  }
}

function readSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY)
    return raw ? (JSON.parse(raw) as Submission[]) : []
  } catch {
    return []
  }
}

function writeFlows(flows: OnboardingFlow[]) {
  localStorage.setItem(FLOWS_KEY, JSON.stringify(flows))
}

function writeSubmissions(submissions: Submission[]) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions))
}

// Zustand store — localStorage-backed, no server required
export const useStore = create<AppStore>((set, get) => ({
  flows: [],
  submissions: [],

  setFlows: (flows) => set({ flows }),
  setSubmissions: (submissions) => set({ submissions }),

  addFlow: (flow: OnboardingFlow) => {
    const flows = [...get().flows, flow]
    writeFlows(flows)
    set({ flows })
  },

  updateFlow: (id: string, updates: Partial<OnboardingFlow>) => {
    const flows = get().flows.map((f) => (f.id === id ? { ...f, ...updates } : f))
    writeFlows(flows)
    set({ flows })
  },

  deleteFlow: (id: string) => {
    const flows = get().flows.filter((f) => f.id !== id)
    writeFlows(flows)
    set({ flows })
  },

  addSubmission: (submission: Submission) => {
    const submissions = [...get().submissions, submission]
    writeSubmissions(submissions)
    set({ submissions })
  },

  updateSubmission: (id: string, updates: Partial<Submission>) => {
    const submissions = get().submissions.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
    writeSubmissions(submissions)
    set({ submissions })
  },
}))

// Initialize store from localStorage (synchronous)
export function initStore() {
  useStore.setState({
    flows: readFlows(),
    submissions: readSubmissions(),
  })
}
