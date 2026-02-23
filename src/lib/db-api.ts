import type { SchemaTable } from '../types'

export interface DBConnectionConfig {
  type: 'postgresql' | 'sqlite'
  connectionString: string
  label?: string
}

export interface ConnectResult {
  ok: boolean
  tables?: string[]
  error?: string
}

export interface SchemaResult {
  ok: boolean
  tables?: SchemaTable[]
  error?: string
}

export interface StatementResult {
  statement: string
  rowsAffected: number
  success: boolean
  error?: string
}

export interface ExecuteResult {
  ok: boolean
  results?: StatementResult[]
  rolledBack?: boolean
  error?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/db${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json() as Promise<T>
}

export function connectDB(config: DBConnectionConfig): Promise<ConnectResult> {
  return request<ConnectResult>('/connect', {
    method: 'POST',
    body: JSON.stringify({ type: config.type, connectionString: config.connectionString }),
  })
}

export function getSchema(): Promise<SchemaResult> {
  return request<SchemaResult>('/schema')
}

export function executeSQL(statements: string[]): Promise<ExecuteResult> {
  return request<ExecuteResult>('/execute', {
    method: 'POST',
    body: JSON.stringify({ statements }),
  })
}

export async function getDBStatus(): Promise<{ type: 'postgresql' | 'sqlite' | null }> {
  return request<{ type: 'postgresql' | 'sqlite' | null }>('/status')
}

// DB Connection Config persistence (localStorage)
const DB_CONFIG_KEY = 'db_connection'

export function loadDBConfig(): DBConnectionConfig | null {
  try {
    const raw = localStorage.getItem(DB_CONFIG_KEY)
    if (!raw) return null
    const config = JSON.parse(raw) as DBConnectionConfig
    return config
  } catch (error) {
    console.error('Failed to load DB config:', error)
    return null
  }
}

export function saveDBConfig(config: DBConnectionConfig): void {
  try {
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save DB config:', error)
  }
}

export function clearDBConfig(): void {
  try {
    localStorage.removeItem(DB_CONFIG_KEY)
  } catch (error) {
    console.error('Failed to clear DB config:', error)
  }
}

/**
 * Returns the demo database configuration
 * This is a pre-populated SQLite database for demonstration purposes
 */
export function getDemoDB(): DBConnectionConfig {
  // In production, this would be an absolute path or handled server-side
  // For now, we use a relative path that the backend can resolve
  return {
    type: 'sqlite',
    connectionString: './demo/company-onboarding.db',
    label: 'Demo: Company Onboarding',
  }
}
