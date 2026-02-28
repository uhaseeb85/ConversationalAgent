import { Response as FlowResponse, OnboardingFlow } from '../types'
import { ChatMessage, AIConfig, streamChatCompletion } from './ai-client'

/**
 * Dangerous SQL keywords that warrant a warning.
 */
const DANGEROUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA)\b/i, label: 'DROP statement detected' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, label: 'TRUNCATE TABLE detected' },
  { pattern: /\bALTER\s+TABLE\b/i, label: 'ALTER TABLE detected' },
  { pattern: /\bGRANT\b/i, label: 'GRANT statement detected' },
  { pattern: /\bREVOKE\b/i, label: 'REVOKE statement detected' },
  { pattern: /\bDELETE\s+FROM\b/i, label: 'DELETE FROM detected — verify WHERE clause' },
  { pattern: /\bUPDATE\b.*\bSET\b/i, label: 'UPDATE detected — verify WHERE clause' },
]

/**
 * Scans SQL text for dangerous operations.
 */
export function detectDangerousSQL(sql: string): { dangerous: boolean; warnings: string[] } {
  const warnings: string[] = []
  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(sql)) {
      warnings.push(label)
    }
  }
  return { dangerous: warnings.length > 0, warnings }
}

/**
 * Builds a system prompt with the collected answers and schema context.
 */
export function buildSQLSystemPrompt(
  flow: OnboardingFlow,
  responses: FlowResponse[]
): string {
  const lines: string[] = []

  lines.push('You are an expert SQL assistant.')
  lines.push('The user will ask you to generate SQL statements based on data collected from an onboarding form.')
  lines.push('Generate ONLY valid SQL. Do not include explanation text unless the user asks for it.')
  lines.push('Wrap your SQL output in a ```sql code fence.')
  lines.push('')

  // Schema context
  if (flow.schemaContext) {
    lines.push('## Database Schema (DDL)')
    lines.push('```sql')
    lines.push(flow.schemaContext)
    lines.push('```')
    lines.push('')
  }

  // User-defined tables
  if (flow.userDefinedTables && flow.userDefinedTables.length > 0) {
    lines.push('## User-Defined Tables')
    for (const table of flow.userDefinedTables) {
      lines.push(`### ${table.name}${table.description ? ` — ${table.description}` : ''}`)
      lines.push('| Column | Type | Nullable | PK |')
      lines.push('|--------|------|----------|----|')
      for (const col of table.columns) {
        lines.push(`| ${col.name} | ${col.dataType} | ${col.nullable ? 'YES' : 'NO'} | ${col.isPrimaryKey ? 'YES' : ''} |`)
      }
      lines.push('')
    }
  }

  // Collected data
  lines.push('## Collected Answers')
  lines.push('| Question | Answer |')
  lines.push('|----------|--------|')

  for (const resp of responses) {
    const question = flow.questions.find((q) => q.id === resp.questionId)
    if (!question) continue

    const label = question.label
    let valueStr: string
    if (resp.value === null || resp.value === undefined) {
      valueStr = '(no answer)'
    } else if (Array.isArray(resp.value)) {
      valueStr = resp.value.join(', ')
    } else {
      valueStr = String(resp.value)
    }

    // Also include the mapped column name for extra context
    const colHint = question.sqlColumnName ? ` (column: ${question.sqlColumnName})` : ''
    lines.push(`| ${label}${colHint} | ${valueStr} |`)
  }

  lines.push('')
  lines.push('## Safety Rules')
  lines.push('- Never produce DROP, TRUNCATE, or ALTER TABLE statements unless the user explicitly requests them.')
  lines.push('- If you must include a destructive operation, prefix the line with `-- WARNING: destructive operation`.')
  lines.push('- Always use parameterised-style values when the user asks for prepared statements.')

  return lines.join('\n')
}

export interface CustomSQLMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Streams an AI-generated custom SQL response.
 *
 * @param flow          The onboarding flow (for schema + questions context)
 * @param responses     The collected answers
 * @param history       Previous messages in the custom SQL chat
 * @param userPrompt    The user's latest natural-language request
 * @param onChunk       Called with each streaming token
 * @param config        Optional AI config override
 * @param signal        Optional AbortSignal
 * @returns             The full generated text
 */
export async function streamCustomSQL(
  flow: OnboardingFlow,
  responses: FlowResponse[],
  history: CustomSQLMessage[],
  userPrompt: string,
  onChunk: (token: string) => void,
  config?: AIConfig,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = buildSQLSystemPrompt(flow, responses)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    // Include prior conversation for iterative refinement
    ...history.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: 'user', content: userPrompt },
  ]

  return streamChatCompletion(messages, onChunk, config, signal, {
    maxTokens: 1024,
    temperature: 0.3,
  })
}

/**
 * Extracts SQL from a fenced code block if present, otherwise returns as-is.
 */
export function extractSQLFromResponse(text: string): string {
  const match = /```sql\s*\n([\s\S]*?)```/.exec(text)
  if (match) return match[1].trim()

  // Try generic code fence
  const generic = /```\s*\n([\s\S]*?)```/.exec(text)
  if (generic) return generic[1].trim()

  return text.trim()
}
