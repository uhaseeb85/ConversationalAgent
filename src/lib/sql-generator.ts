import { Submission, OnboardingFlow, Response, SQLOperation, SQLCondition, RunCondition } from '../types'
import { format } from 'date-fns'

/**
 * Validates SQL identifiers (table/column names) to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and periods
 */
export function validateSQLIdentifier(identifier: string): { valid: boolean; error?: string } {
  // Allow alphanumeric, underscore, period (for schema.table)
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/
  if (!validPattern.test(identifier)) {
    return {
      valid: false,
      error: `"${identifier}" - Only alphanumeric characters, underscores, and schema.table format are allowed.`,
    }
  }

  // Prevent SQL keywords as identifiers
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
    'EXEC', 'EXECUTE', 'UNION', 'GRANT', 'REVOKE', 'MERGE', 'CALL', 'BEGIN',
    'COMMIT', 'ROLLBACK', 'WHERE', 'FROM', 'TABLE', 'DATABASE', 'SET', 'USE',
    'INTO', 'AND', 'OR', 'NOT', 'SHOW', 'DESCRIBE', 'EXPLAIN',
  ]
  if (sqlKeywords.includes(identifier.toUpperCase())) {
    return {
      valid: false,
      error: `"${identifier}" is a reserved SQL keyword`,
    }
  }

  return { valid: true }
}

/**
 * Internal version with throwing behavior for backward compatibility
 */
function validateSQLIdentifierThrow(identifier: string, context: string): void {
  const result = validateSQLIdentifier(identifier)
  if (!result.valid) {
    throw new Error(`Invalid ${context}: ${result.error}`)
  }
}

/**
 * Escapes SQL string values to prevent injection
 */
function escapeSQLString(value: string): string {
  return value.replaceAll("'", "''")
}

/**
 * Formats a value for SQL based on its type
 */
function formatSQLValue(value: string | number | boolean | string[] | null, type: string): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  switch (type) {
    case 'number': {
      // Ensure it's actually a number to prevent injection
      const num = Number(value)
      if (Number.isNaN(num)) {
        throw new TypeError(`Invalid number value: ${value}`)
      }
      return String(num)
    }
    
    case 'yes-no':
      return value === true || value === 'yes' ? '1' : '0'
    
    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          throw new TypeError(`Invalid date value: '${value}' cannot be parsed as a date`)
        }
        return `'${format(date, 'yyyy-MM-dd')}'`
      }
      return `'${escapeSQLString(String(value))}'`
    
    case 'multi-select':
      if (Array.isArray(value)) {
        return `'${escapeSQLString(value.join(', '))}'`
      }
      return `'${escapeSQLString(String(value))}'`
    
    default:
      // text, email, phone, single-select
      return `'${escapeSQLString(String(value))}'`
  }
}

/**
 * Resolves a condition value (static or from question response)
 */
function resolveConditionValue(
  condition: SQLCondition,
  responses: Response[],
  flow: OnboardingFlow
): string {
  if (condition.valueType === 'static') {
    return `'${escapeSQLString(condition.value)}'`
  }

  // Extract question ID from ${questionId} format
  const regex = /\$\{(.+?)\}/
  const questionIdMatch = regex.exec(condition.value)
  if (questionIdMatch) {
    const questionId = questionIdMatch[1]
    const response = responses.find((r) => r.questionId === questionId)
    const question = flow.questions.find((q) => q.id === questionId)
    
    if (response && question) {
      return formatSQLValue(response.value, question.type)
    }
  }

  return 'NULL'
}

/**
 * Generates WHERE clause from conditions
 */
function generateWhereClause(
  conditions: SQLCondition[],
  responses: Response[],
  flow: OnboardingFlow
): string {
  if (conditions.length === 0) {
    return ''
  }

  const clauses = conditions.map((condition) => {
    // Validate column name
validateSQLIdentifierThrow(condition.columnName, 'WHERE column name')
    
    const value = resolveConditionValue(condition, responses, flow)
    
    switch (condition.operator) {
      case 'equals':
        return `${condition.columnName} = ${value}`
      case 'not-equals':
        return `${condition.columnName} != ${value}`
      case 'greater-than':
        return `${condition.columnName} > ${value}`
      case 'less-than':
        return `${condition.columnName} < ${value}`
      case 'like':
        return `${condition.columnName} LIKE ${value}`
      case 'in': {
        // value is a single-quoted string like 'a, b, c' — split and re-quote each item
        const rawVal = condition.valueType === 'static'
          ? condition.value
          : String(value).replace(/^'|'$/g, '')
        const items = rawVal.split(',').map((v) => `'${escapeSQLString(v.trim())}'`)
        return `${condition.columnName} IN (${items.join(', ')})`
      }
      default:
        return `${condition.columnName} = ${value}`
    }
  })

  return `WHERE ${clauses.join(' AND ')}`
}

/**
 * Generates INSERT statement
 */
function generateInsertSQL(
  operation: SQLOperation,
  responses: Response[],
  flow: OnboardingFlow
): string {
  // Validate table name
  validateSQLIdentifierThrow(operation.tableName, 'table name')
  
  const columns: string[] = []
  const values: string[] = []

  operation.columnMappings.forEach((mapping) => {
    // Validate column name
    validateSQLIdentifierThrow(mapping.columnName, 'column name')
    
    const response = responses.find((r) => r.questionId === mapping.questionId)
    const question = flow.questions.find((q) => q.id === mapping.questionId)
    
    if (question) {
      columns.push(mapping.columnName)
      const value = response?.value ?? null
      values.push(formatSQLValue(value, question.type))
    }
  })

  if (columns.length === 0) {
    throw new Error(`INSERT into "${operation.tableName}" has no column mappings. Add at least one question-to-column mapping.`)
  }

  return `INSERT INTO ${operation.tableName} (${columns.join(', ')})
VALUES (${values.join(', ')});`
}

/**
 * Generates UPDATE statement
 */
function generateUpdateSQL(
  operation: SQLOperation,
  responses: Response[],
  flow: OnboardingFlow
): string {
  // Validate table name
  validateSQLIdentifierThrow(operation.tableName, 'table name')
  
  const setClauses: string[] = []

  operation.columnMappings.forEach((mapping) => {
    // Validate column name
    validateSQLIdentifierThrow(mapping.columnName, 'column name')
    
    const response = responses.find((r) => r.questionId === mapping.questionId)
    const question = flow.questions.find((q) => q.id === mapping.questionId)
    
    if (question) {
      const value = response?.value ?? null
      setClauses.push(`${mapping.columnName} = ${formatSQLValue(value, question.type)}`)
    }
  })

  if (setClauses.length === 0) {
    throw new Error(`UPDATE on "${operation.tableName}" has no column mappings. Add at least one question-to-column mapping.`)
  }

  const whereClause = generateWhereClause(operation.conditions, responses, flow)

  return `UPDATE ${operation.tableName}
SET ${setClauses.join(', ')}
${whereClause};`
}

/**
 * Generates DELETE statement
 */
function generateDeleteSQL(
  operation: SQLOperation,
  responses: Response[],
  flow: OnboardingFlow
): string {
  // Validate table name
  validateSQLIdentifierThrow(operation.tableName, 'table name')

  if (!operation.conditions || operation.conditions.length === 0) {
    throw new Error(`DELETE on "${operation.tableName}" has no WHERE conditions. A bare DELETE would remove all rows — add at least one condition.`)
  }

  const whereClause = generateWhereClause(operation.conditions, responses, flow)

  return `DELETE FROM ${operation.tableName}
${whereClause};`
}

/**
 * Evaluates a single RunCondition against recorded responses.
 */
function evalRunCondition(rc: RunCondition, responses: Response[]): boolean {
  const response = responses.find((r) => r.questionId === rc.questionId)
  if (!response) return false
  const rv = String(response.value).toLowerCase()
  const cv = String(rc.value).toLowerCase()
  switch (rc.operator) {
    case 'equals':       return rv === cv
    case 'not-equals':   return rv !== cv
    case 'contains':     return rv.includes(cv)
    case 'greater-than': { const a = Number.parseFloat(rv); const b = Number.parseFloat(cv); return !Number.isNaN(a) && !Number.isNaN(b) && a > b }
    case 'less-than':    { const a = Number.parseFloat(rv); const b = Number.parseFloat(cv); return !Number.isNaN(a) && !Number.isNaN(b) && a < b }
    default:             return true
  }
}

/**
 * Returns true if the operation's runConditions are satisfied (or absent).
 */
function shouldRunOperation(operation: SQLOperation, responses: Response[]): boolean {
  const { runConditions, runConditionsOperator } = operation
  if (!runConditions || runConditions.length === 0) return true
  const op = runConditionsOperator ?? 'AND'
  if (op === 'OR') return runConditions.some((rc) => evalRunCondition(rc, responses))
  return runConditions.every((rc) => evalRunCondition(rc, responses))
}

/**
 * Generates SQL statement for a single operation
 */
function generateOperationSQL(
  operation: SQLOperation,
  responses: Response[],
  flow: OnboardingFlow
): string {
  switch (operation.operationType) {
    case 'INSERT':
      return generateInsertSQL(operation, responses, flow)
    case 'UPDATE':
      return generateUpdateSQL(operation, responses, flow)
    case 'DELETE':
      return generateDeleteSQL(operation, responses, flow)
    default:
      return ''
  }
}

/**
 * Generates SQL statements from submission data
 * Supports both legacy single-table INSERT and new multi-operation flows
 */
export function generateSQL(submission: Submission, flow: OnboardingFlow): string {
  const { responses } = submission

  // New multi-operation support
  if (flow.sqlOperations && flow.sqlOperations.length > 0) {
    const sortedOperations = [...flow.sqlOperations].sort((a, b) => a.order - b.order)
    const sqlStatements = sortedOperations
      .filter((operation) => shouldRunOperation(operation, responses))
      .map((operation) => generateOperationSQL(operation, responses, flow))
    return sqlStatements.join('\n\n')
  }

  // Legacy single-table INSERT support (backward compatibility)
  const { tableName, questions } = flow
  
  // Validate table name
  validateSQLIdentifierThrow(tableName, 'table name')
  
  const columns: string[] = []
  const values: string[] = []

  questions.forEach((question) => {
    // Validate column name
    validateSQLIdentifierThrow(question.sqlColumnName, 'column name')
    
    const response = responses.find((r) => r.questionId === question.id)
    
    if (!response && !question.required) {
      return
    }

    columns.push(question.sqlColumnName)
    const value = response?.value ?? null
    values.push(formatSQLValue(value, question.type))
  })

  return `INSERT INTO ${tableName} (${columns.join(', ')})
VALUES (${values.join(', ')});`
}

/**
 * Validates that all required questions have responses
 */
export function validateSubmission(responses: Response[], flow: OnboardingFlow): {
  isValid: boolean
  missingQuestions: string[]
} {
  const missingQuestions: string[] = []

  flow.questions.forEach((question) => {
    if (question.required) {
      const response = responses.find((r) => r.questionId === question.id)
      if (!response?.value || response.value === '') {
        missingQuestions.push(question.label)
      }
    }
  })

  return {
    isValid: missingQuestions.length === 0,
    missingQuestions,
  }
}
