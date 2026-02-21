import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { OnboardingFlow, Submission } from '../types'

// Database schema definition
interface OnboardingDB extends DBSchema {
  flows: {
    key: string
    value: OnboardingFlow
    indexes: { 'by-created': Date }
  }
  submissions: {
    key: string
    value: Submission
    indexes: { 'by-flow': string; 'by-completed': Date }
  }
}

const DB_NAME = 'onboarding-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<OnboardingDB> | null = null

// Initialize database
export async function initDB(): Promise<IDBPDatabase<OnboardingDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<OnboardingDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create flows object store
      if (!db.objectStoreNames.contains('flows')) {
        const flowStore = db.createObjectStore('flows', { keyPath: 'id' })
        flowStore.createIndex('by-created', 'createdAt')
      }

      // Create submissions object store
      if (!db.objectStoreNames.contains('submissions')) {
        const submissionStore = db.createObjectStore('submissions', { keyPath: 'id' })
        submissionStore.createIndex('by-flow', 'flowId')
        submissionStore.createIndex('by-completed', 'completedAt')
      }
    },
  })

  return dbInstance
}

// Flow CRUD operations
export async function getAllFlows(): Promise<OnboardingFlow[]> {
  const db = await initDB()
  return db.getAll('flows')
}

export async function getFlowById(id: string): Promise<OnboardingFlow | undefined> {
  const db = await initDB()
  return db.get('flows', id)
}

export async function saveFlow(flow: OnboardingFlow): Promise<void> {
  const db = await initDB()
  await db.put('flows', flow)
}

export async function deleteFlow(id: string): Promise<void> {
  const db = await initDB()
  await db.delete('flows', id)
}

// Submission CRUD operations
export async function getAllSubmissions(): Promise<Submission[]> {
  const db = await initDB()
  return db.getAll('submissions')
}

export async function getSubmissionById(id: string): Promise<Submission | undefined> {
  const db = await initDB()
  return db.get('submissions', id)
}

export async function getSubmissionsByFlowId(flowId: string): Promise<Submission[]> {
  const db = await initDB()
  return db.getAllFromIndex('submissions', 'by-flow', flowId)
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const db = await initDB()
  await db.put('submissions', submission)
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = await initDB()
  await db.delete('submissions', id)
}

// Utility: Clear all data (useful for testing)
export async function clearAllData(): Promise<void> {
  const db = await initDB()
  const tx = db.transaction(['flows', 'submissions'], 'readwrite')
  await Promise.all([
    tx.objectStore('flows').clear(),
    tx.objectStore('submissions').clear(),
  ])
  await tx.done
}
