/**
 * ai-flow-generator.ts
 * AI-powered onboarding flow generation with safety guardrails
 */

import { chatCompletion, streamChatCompletion, loadAIConfig, type ChatMessage } from './ai-client'
import { schemaContextToJSON, type SchemaContext } from './schema-context-builder'
import { validateSQLIdentifier } from './sql-generator'
import type { Question, QuestionType, SQLOperation } from '../types'

const VALID_QUESTION_TYPES: QuestionType[] = [
  'text',
  'email',
  'phone',
  'number',
  'date',
  'single-select',
  'multi-select',
  'yes-no',
]

/**
 * Attempts to recover a complete JSON array from a truncated string by
 * progressively stripping incomplete trailing elements until the text parses.
 */
function repairTruncatedJSONArray(text: string): unknown[] | null {
  // Strip any trailing comma / whitespace before trying to close the array
  let candidate = text.trimEnd().replace(/,\s*$/, '') + ']'
  for (let i = 0; i < 20; i++) {
    try {
      const parsed = JSON.parse(candidate) as unknown[]
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Remove the last incomplete element: strip back to the previous '}'
      const lastBrace = candidate.lastIndexOf('}')
      if (lastBrace === -1) return null
      candidate = candidate.substring(0, lastBrace + 1).trimEnd().replace(/,\s*$/, '') + ']'
    }
  }
  return null
}

/**
 * System prompt for AI flow generation with guardrails
 */
const SYSTEM_PROMPT = `You are an expert assistant for creating database onboarding forms. Your role is to help users create data collection flows that gather information and store it in a database.

## Your Responsibilities:
1. **Analyze** the user's purpose and database schema
2. **Suggest** appropriate questions to collect the necessary data
3. **Map** question responses to database columns
4. **Generate** SQL operations (INSERT, UPDATE, DELETE) to persist the data

## Question Type Constraints:
You must ONLY suggest questions with these types:
- text: Free-form text input
- email: Email address with validation
- phone: Phone number
- number: Numeric value
- date: Date picker
- single-select: Single choice from options
- multi-select: Multiple choices from options
- yes-no: Boolean choice

## SQL Operation Guidelines:
- **PREFER INSERT operations** for new data collection
- **UPDATE operations** require WHERE conditions to identify which rows to update
- **DELETE operations** require WHERE conditions and should be used sparingly
- **ALWAYS validate** table and column names against the provided schema
- **NEVER suggest** DROP, TRUNCATE, or other destructive DDL operations
- **USE CAUTION** with DELETE and UPDATE - always require specific conditions

## Column Mapping Rules:
- Question IDs must match exactly
- Column names must exist in the schema
- Data types should be compatible:
  - text/email/phone → TEXT columns
  - number → INTEGER or REAL columns
  - date → DATE or DATETIME columns
  - yes-no → BOOLEAN or INTEGER columns
  - single-select → TEXT columns (or match CHECK constraint values)
  - multi-select → TEXT columns (will be stored as comma-separated)

## Output Format:
You will be asked to generate either:
1. **Questions**: Return a JSON array of Question objects
2. **SQL Operations**: Return a JSON array of SQLOperation objects

Always return VALID JSON that can be parsed directly. Do not include markdown code blocks or explanations - just the raw JSON.

## Safety Rules:
- Never suggest operations that could delete all data
- Always include WHERE clauses for UPDATE/DELETE
- Validate that referenced columns exist in the schema
- Prefer specific, targeted operations over broad ones
- Flag any potentially dangerous operations with warnings`

/**
 * Generate questions from a purpose description and schema context
 */
export async function generateQuestionsFromPurpose(
  purpose: string,
  schema: SchemaContext
): Promise<{ questions: Question[]; warnings: string[] }> {
  const config = loadAIConfig()
  if (!config.enabled) {
    throw new Error('AI is not enabled. Please enable it in Settings.')
  }

  const schemaJSON = schemaContextToJSON(schema)

  const userPrompt = `Generate questions for an onboarding flow with this purpose:

"${purpose}"

Available database schema:
${schemaJSON}

Return a JSON array of Question objects with this structure:
[
  {
    "id": "unique-id",
    "type": "text|email|phone|number|date|single-select|multi-select|yes-no",
    "label": "Question text shown to user",
    "placeholder": "Optional placeholder text",
    "helpText": "Optional help text",
    "options": ["option1", "option2"], // Only for single-select and multi-select
    "required": true,
    "validationRules": [], // Array of validation rules
    "sqlColumnName": "column_name", // Which column this maps to
    "tableName": "table_name", // Optional: specific table
    "order": 0
  }
]

Generate 3-8 relevant questions based on the purpose and schema. Use appropriate question types. Return ONLY the JSON array, no markdown or explanations.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  try {
    const response = await chatCompletion(messages, config)
    
    // Check for empty response
    if (!response || response.trim().length === 0) {
      throw new Error('AI returned an empty response. Please try again or check your AI configuration.')
    }
    
    // Try to extract JSON from response (in case AI wraps it in markdown)
    let jsonText = response.trim()
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(jsonText)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    // Validate we have JSON-like content
    if (!jsonText.startsWith('[') && !jsonText.startsWith('{')) {
      console.error('AI response is not valid JSON:', response)
      throw new Error(`AI did not return valid JSON. Response: "${response.substring(0, 200)}..."`)
    }

    let parsed: Question[]
    try {
      parsed = JSON.parse(jsonText) as Question[]
    } catch {
      // Attempt to recover complete objects from a truncated JSON array
      const repaired = repairTruncatedJSONArray(jsonText)
      if (repaired !== null && repaired.length > 0) {
        console.warn('AI response was truncated; recovered', repaired.length, 'question(s) from partial JSON.')
        parsed = repaired as Question[]
      } else {
        console.error('Failed to parse AI response as JSON:', jsonText)
        throw new Error(
          `AI returned malformed JSON (likely truncated). ` +
          `This usually means the response was too long. ` +
          `Try simplifying your purpose or schema. ` +
          `JSON received: "${jsonText.substring(0, 300)}..."`
        )
      }
    }
    
    // Validate and sanitize
    const warnings: string[] = []
    const questions: Question[] = []

    parsed.forEach((q, idx) => {
      // Validate question type
      if (!VALID_QUESTION_TYPES.includes(q.type)) {
        warnings.push(`Question ${idx + 1}: Invalid type "${q.type}" - skipped`)
        return
      }

      // Validate SQL identifiers
      if (q.sqlColumnName) {
        const validation = validateSQLIdentifier(q.sqlColumnName)
        if (!validation.valid) {
          warnings.push(`Question ${idx + 1}: Invalid column name "${q.sqlColumnName}" - ${validation.error}`)
          q.sqlColumnName = '' // Clear invalid identifier
        }
      }

      if (q.tableName) {
        const validation = validateSQLIdentifier(q.tableName)
        if (!validation.valid) {
          warnings.push(`Question ${idx + 1}: Invalid table name "${q.tableName}" - ${validation.error}`)
          q.tableName = undefined
        }
      }

      // Ensure required fields exist
      if (!q.id) q.id = `q${Date.now()}_${idx}`
      if (!q.label) q.label = 'Untitled Question'
      if (q.required === undefined) q.required = false
      if (!q.validationRules) q.validationRules = []
      if (q.order === undefined) q.order = idx

      questions.push(q)
    })

    return { questions, warnings }
  } catch (err) {
    throw new Error(`Failed to generate questions: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Generate SQL operations from questions and schema
 */
export async function generateSQLOperations(
  questions: Question[],
  schema: SchemaContext,
  preferredTables?: string[]
): Promise<{ operations: SQLOperation[]; warnings: string[] }> {
  const config = loadAIConfig()
  if (!config.enabled) {
    throw new Error('AI is not enabled. Please enable it in Settings.')
  }

  const schemaJSON = schemaContextToJSON(schema)
  const questionsJSON = JSON.stringify(questions, null, 2)
  const tablesHint = preferredTables && preferredTables.length > 0
    ? `Focus on these tables: ${preferredTables.join(', ')}`
    : ''

  const userPrompt = `Generate SQL operations to persist data collected from these questions:

Questions:
${questionsJSON}

Database schema:
${schemaJSON}

${tablesHint}

Return a JSON array of SQLOperation objects with this structure:
[
  {
    "id": "unique-id",
    "operationType": "INSERT|UPDATE|DELETE",
    "tableName": "table_name",
    "columnMappings": [
      {
        "questionId": "question-id",
        "columnName": "column_name"
      }
    ],
    "conditions": [], // Array of WHERE conditions for UPDATE/DELETE
    "order": 0
  }
]

Guidelines:
- PREFER INSERT operations for new data
- For UPDATE: include WHERE conditions to identify rows
- For DELETE: include WHERE conditions (never delete all rows)
- Map each question to appropriate columns
- Validate that columns exist in the schema
- Return ONLY the JSON array, no markdown or explanations.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  try {
    const response = await chatCompletion(messages, config)
    
    // Check for empty response
    if (!response || response.trim().length === 0) {
      throw new Error('AI returned an empty response. Please try again or check your AI configuration.')
    }
    
    // Extract JSON
    let jsonText = response.trim()
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(jsonText)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    // Validate we have JSON-like content
    if (!jsonText.startsWith('[') && !jsonText.startsWith('{')) {
      console.error('AI response is not valid JSON:', response)
      throw new Error(`AI did not return valid JSON. Response: "${response.substring(0, 200)}..."`)
    }

    let parsed: SQLOperation[]
    try {
      parsed = JSON.parse(jsonText) as SQLOperation[]
    } catch {
      const repaired = repairTruncatedJSONArray(jsonText)
      if (repaired !== null && repaired.length > 0) {
        console.warn('AI response was truncated; recovered', repaired.length, 'SQL operation(s) from partial JSON.')
        parsed = repaired as SQLOperation[]
      } else {
        console.error('Failed to parse AI response as JSON:', jsonText)
        throw new Error(
          `AI returned malformed JSON (likely truncated). ` +
          `This usually means the response was too long. ` +
          `Try simplifying your questions or schema. ` +
          `JSON received: "${jsonText.substring(0, 300)}..."`
        )
      }
    }
    
    // Validate and sanitize
    const warnings: string[] = []
    const operations: SQLOperation[] = []

    parsed.forEach((op, idx) => {
      // Validate operation type
      if (!['INSERT', 'UPDATE', 'DELETE'].includes(op.operationType)) {
        warnings.push(`Operation ${idx + 1}: Invalid type "${op.operationType}" - skipped`)
        return
      }

      // Validate table name
      if (!op.tableName) {
        warnings.push(`Operation ${idx + 1}: Missing table name - skipped`)
        return
      }
      const tableValidation = validateSQLIdentifier(op.tableName)
      if (!tableValidation.valid) {
        warnings.push(`Operation ${idx + 1}: Invalid table name "${op.tableName}" - ${tableValidation.error}`)
        return
      }

      // Validate column mappings
      if (!op.columnMappings || op.columnMappings.length === 0) {
        warnings.push(`Operation ${idx + 1}: No column mappings - skipped`)
        return
      }

      op.columnMappings.forEach((mapping, mIdx) => {
        const colValidation = validateSQLIdentifier(mapping.columnName)
        if (!colValidation.valid) {
          warnings.push(`Operation ${idx + 1}, Mapping ${mIdx + 1}: Invalid column "${mapping.columnName}"`)
        }
      })

      // Safety check: UPDATE/DELETE should have conditions
      if ((op.operationType === 'UPDATE' || op.operationType === 'DELETE')) {
        if (!op.conditions || op.conditions.length === 0) {
          warnings.push(`⚠️ DANGER: ${op.operationType} on "${op.tableName}" has NO WHERE conditions! This could affect all rows.`)
        }
      }

      // Ensure required fields
      if (!op.id) op.id = `op${Date.now()}_${idx}`
      if (!op.conditions) op.conditions = []
      if (op.order === undefined) op.order = idx

      operations.push(op)
    })

    return { operations, warnings }
  } catch (err) {
    throw new Error(`Failed to generate SQL operations: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Refine a question based on user feedback
 */
export async function refineQuestion(
  question: Question,
  feedback: string,
  schema: SchemaContext
): Promise<Question> {
  const config = loadAIConfig()
  if (!config.enabled) {
    throw new Error('AI is not enabled.')
  }

  const schemaJSON = schemaContextToJSON(schema)
  const questionJSON = JSON.stringify(question, null, 2)

  const userPrompt = `Refine this question based on user feedback:

Current question:
${questionJSON}

User feedback:
"${feedback}"

Database schema:
${schemaJSON}

Return the updated Question object as JSON. Return ONLY the JSON object, no markdown or explanations.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  const response = await chatCompletion(messages, config)
  
  // Check for empty response
  if (!response || response.trim().length === 0) {
    throw new Error('AI returned an empty response. Please try again.')
  }
  
  let jsonText = response.trim()
  const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(jsonText)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Validate we have JSON-like content
  if (!jsonText.startsWith('{')) {
    console.error('AI response is not valid JSON:', response)
    throw new Error(`AI did not return valid JSON. Response: "${response.substring(0, 200)}..."`)
  }

  let parsed: Question
  try {
    parsed = JSON.parse(jsonText) as Question
  } catch {
    throw new Error('AI returned malformed JSON. Please try again.')
  }

  // Validate and sanitise — same rules as generateQuestionsFromPurpose
  if (!VALID_QUESTION_TYPES.includes(parsed.type)) {
    parsed.type = 'text'
  }
  if (parsed.sqlColumnName) {
    const validation = validateSQLIdentifier(parsed.sqlColumnName)
    if (!validation.valid) parsed.sqlColumnName = ''
  }
  if (parsed.tableName) {
    const validation = validateSQLIdentifier(parsed.tableName)
    if (!validation.valid) parsed.tableName = undefined
  }
  if (!parsed.id) parsed.id = `q${Date.now()}_refined`
  if (!parsed.label) parsed.label = 'Untitled Question'
  if (parsed.required === undefined) parsed.required = false
  if (!Array.isArray(parsed.validationRules)) parsed.validationRules = []

  return parsed
}

/**
 * Validate that generated content is safe
 */
export function validateOperationSafety(operations: SQLOperation[]): {
  safe: boolean
  criticalWarnings: string[]
  warnings: string[]
} {
  const criticalWarnings: string[] = []
  const warnings: string[] = []

  operations.forEach((op, idx) => {
    if (op.operationType === 'DELETE') {
      if (!op.conditions || op.conditions.length === 0) {
        criticalWarnings.push(`Operation ${idx + 1}: DELETE without WHERE conditions will delete ALL rows in "${op.tableName}"`)
      } else {
        warnings.push(`Operation ${idx + 1}: DELETE operation detected on "${op.tableName}"`)
      }
    }

    if (op.operationType === 'UPDATE') {
      if (!op.conditions || op.conditions.length === 0) {
        criticalWarnings.push(`Operation ${idx + 1}: UPDATE without WHERE conditions will update ALL rows in "${op.tableName}"`)
      }
    }
  })

  return {
    safe: criticalWarnings.length === 0,
    criticalWarnings,
    warnings,
  }
}

export interface SQLChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Stream a conversational SQL-operations refinement chat.
 * The AI responds with an explanation + a ```json block with the full updated SQLOperation[].
 */
export async function streamSQLOperationsChat(
  questions: Question[],
  currentOperations: SQLOperation[],
  schema: SchemaContext,
  history: SQLChatMessage[],
  userMessage: string,
  onChunk: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const config = loadAIConfig()
  if (!config.enabled) throw new Error('AI is not enabled. Please enable it in Settings.')

  const systemPrompt = `You are an expert SQL operations designer for a form-builder application.

The user has a set of questions in their onboarding flow. Each question collects a value that will be persisted to a database.
SQL operations define HOW those values are persisted (INSERT, UPDATE, or DELETE).

## Current Questions:
${JSON.stringify(questions.map((q) => ({ id: q.id, label: q.label, type: q.type, sqlColumnName: q.sqlColumnName, tableName: q.tableName })), null, 2)}

## Current SQL Operations:
${JSON.stringify(currentOperations, null, 2)}

## Database Schema:
${JSON.stringify(schema, null, 2)}

## Your job:
- Listen to the user's requests to add, modify, or replace SQL operations.
- Respond conversationally — explain what you're doing and why.
- Always end your response with a fenced JSON code block containing the COMPLETE updated SQLOperation[] array.
- The array must include ALL operations (both unchanged and new/modified).
- Use question IDs from the questions list for columnMappings.questionId.
- For UPDATE: always include WHERE conditions.
- For DELETE: always include WHERE conditions. Never delete all rows.
- Never generate DROP, TRUNCATE, or DDL.

## SQLOperation structure:
\`\`\`
{
  "id": "unique-id",
  "operationType": "INSERT" | "UPDATE" | "DELETE",
  "tableName": "table_name",
  "label": "Human readable label",
  "columnMappings": [{ "questionId": "q_id", "columnName": "col_name" }],
  "conditions": [{ "columnName": "col", "operator": "=", "value": "val" }],
  "order": 0
}
\`\`\`

Always end your reply with the complete JSON block even if no changes are needed.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: 'user', content: userMessage },
  ]

  return streamChatCompletion(messages, onChunk, config, signal, {
    maxTokens: 32768,
    temperature: 0.3,
  })
}

/**
 * Extract a SQLOperation[] from an AI chat response that contains a ```json block.
 * Returns null if no valid array is found.
 */
export function extractOperationsFromChatResponse(response: string): SQLOperation[] | null {
  const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(response)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1]) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      return (parsed as SQLOperation[]).map((op, idx) => ({
        ...op,
        id: op.id || `op${Date.now()}_${idx}`,
        conditions: op.conditions ?? [],
        order: op.order ?? idx,
      }))
    }
  } catch { /* ignore */ }
  return null
}
