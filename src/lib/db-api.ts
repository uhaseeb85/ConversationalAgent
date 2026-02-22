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
