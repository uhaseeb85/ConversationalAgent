import type { Question, QuestionType, SQLOperation, ColumnMapping } from '../types'
import { generateId } from './utils'

export interface ParsedTable {
  tableName: string
  questions: Question[]
  suggestedOperation: SQLOperation
}

interface RawColumn {
  name: string
  rawType: string
  nullable: boolean
  isPrimaryKey: boolean
  checkValues?: string[]
}

// Map SQL data types to QuestionType
function mapToQuestionType(rawType: string, checkValues?: string[]): QuestionType {
  const t = rawType.toUpperCase()
  if (checkValues && checkValues.length > 0) return 'single-select'
  if (t.includes('BOOL') || t === 'BIT' || t === 'TINYINT(1)') return 'yes-no'
  if (
    t.includes('INT') ||
    t.includes('NUMERIC') ||
    t.includes('DECIMAL') ||
    t.includes('FLOAT') ||
    t.includes('DOUBLE') ||
    t.includes('REAL') ||
    t.includes('NUMBER')
  )
    return 'number'
  if (
    t.includes('DATE') ||
    t.includes('TIME') ||
    t.includes('TIMESTAMP')
  )
    return 'date'
  if (t.includes('EMAIL')) return 'email'
  return 'text'
}

function inferLabel(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function parseColumns(columnBlock: string): RawColumn[] {
  const columns: RawColumn[] = []

  // Split on commas that are NOT inside parentheses
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of columnBlock) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())

  for (const part of parts) {
    const line = part.trim()
    if (!line) continue

    // Skip table-level constraints
    const upperLine = line.toUpperCase()
    if (
      upperLine.startsWith('PRIMARY KEY') ||
      upperLine.startsWith('UNIQUE') ||
      upperLine.startsWith('FOREIGN KEY') ||
      upperLine.startsWith('INDEX') ||
      upperLine.startsWith('KEY ') ||
      upperLine.startsWith('CONSTRAINT')
    )
      continue

    // Column name (handle quoted names)
    const colNameMatch = /^["`\[]?(\w+)["`\]]?\s+(.+)$/.exec(line)
    if (!colNameMatch) continue

    const name = colNameMatch[1]
    const rest = colNameMatch[2]

    // Extract data type (first word/token before spaces or constraints)
    const typeMatch = /^(\w+(?:\s*\([^)]*\))?)/.exec(rest)
    const rawType = typeMatch ? typeMatch[1] : 'TEXT'

    const nullable = !/NOT\s+NULL/i.test(rest)
    const isPrimaryKey = /PRIMARY\s+KEY/i.test(rest)

    // Extract CHECK(...IN(...)) values
    let checkValues: string[] | undefined
    const checkMatch = /CHECK\s*\(\s*\w+\s+IN\s*\(([^)]+)\)/i.exec(rest)
    if (checkMatch) {
      checkValues = checkMatch[1].split(',').map((v) => v.trim().replace(/^['"`]|['"`]$/g, ''))
    }

    columns.push({ name, rawType, nullable, isPrimaryKey, checkValues })
  }

  return columns
}

/**
 * Parses one or more CREATE TABLE statements from DDL text.
 * Returns a ParsedTable per table.
 */
export function parseDDL(ddl: string): ParsedTable[] {
  const results: ParsedTable[] = []

  // Match CREATE TABLE ... ( ... ) with possible IF NOT EXISTS
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?(\w+)["`\]]?\s*\(([^;]+?)\)\s*;?/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(ddl)) !== null) {
    const tableName = match[1].toUpperCase()
    const columnBlock = match[2]

    const rawColumns = parseColumns(columnBlock)
    const questions: Question[] = []
    const mappings: ColumnMapping[] = []
    let order = 0

    for (const col of rawColumns) {
      if (col.isPrimaryKey) continue // Skip PK columns from question list

      const questionType = mapToQuestionType(col.rawType, col.checkValues)
      const questionId = generateId()

      const q: Question = {
        id: questionId,
        type: questionType,
        label: inferLabel(col.name),
        placeholder: `Enter ${inferLabel(col.name).toLowerCase()}`,
        required: !col.nullable,
        validationRules: col.nullable ? [] : [{ type: 'required' }],
        sqlColumnName: col.name,
        options: col.checkValues,
        order: order++,
      }

      questions.push(q)
      mappings.push({ id: generateId(), questionId, columnName: col.name })
    }

    const suggestedOperation: SQLOperation = {
      id: generateId(),
      operationType: 'INSERT',
      tableName,
      label: `Insert into ${tableName}`,
      columnMappings: mappings,
      conditions: [],
      order: 0,
    }

    results.push({ tableName, questions, suggestedOperation })
  }

  return results
}
