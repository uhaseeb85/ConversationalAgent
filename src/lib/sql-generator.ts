import { Submission, OnboardingFlow, Response, SQLOperation, SQLCondition } from '../types'
import { format } from 'date-fns'

/**
 * Validates SQL identifiers (table/column names) to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and periods
 */
function validateSQLIdentifier(identifier: string, context: string): void {
  // Allow alphanumeric, underscore, period (for schema.table)
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/
  if (!validPattern.test(identifier)) {
    throw new Error(
      `Invalid ${context}: "${identifier}". Only alphanumeric characters, underscores, and schema.table format are allowed.`
    )
  }
  
  // Prevent SQL keywords as identifiers
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE']
  if (sqlKeywords.includes(identifier.toUpperCase())) {
    throw new Error(`Invalid ${context}: "${identifier}" is a reserved SQL keyword`)
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
    case 'number':
      // Ensure it's actually a number to prevent injection
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error(`Invalid number value: ${value}`)
      }
      return String(num)
    
    case 'yes-no':
      return value === true || value === 'yes' ? '1' : '0'
    
    case 'date':
      if (typeof value === 'string') {
        try {
          const date = new Date(value)
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${value}`)
          }
          return `'${format(date, 'yyyy-MM-dd')}'`
        } catch {
          return `'${escapeSQLString(String(value))}'`
        }
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
    validateSQLIdentifier(condition.columnName, 'WHERE column name')
    
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
      case 'in':
        return `${condition.columnName} IN (${value})`
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
  validateSQLIdentifier(operation.tableName, 'table name')
  
  const columns: string[] = []
  const values: string[] = []

  operation.columnMappings.forEach((mapping) => {
    // Validate column name
    validateSQLIdentifier(mapping.columnName, 'column name')
    
    const response = responses.find((r) => r.questionId === mapping.questionId)
    const question = flow.questions.find((q) => q.id === mapping.questionId)
    
    if (question) {
      columns.push(mapping.columnName)
      const value = response?.value ?? null
      values.push(formatSQLValue(value, question.type))
    }
  })

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
  validateSQLIdentifier(operation.tableName, 'table name')
  
  const setClauses: string[] = []

  operation.columnMappings.forEach((mapping) => {
    // Validate column name
    validateSQLIdentifier(mapping.columnName, 'column name')
    
    const response = responses.find((r) => r.questionId === mapping.questionId)
    const question = flow.questions.find((q) => q.id === mapping.questionId)
    
    if (question) {
      const value = response?.value ?? null
      setClauses.push(`${mapping.columnName} = ${formatSQLValue(value, question.type)}`)
    }
  })

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
  validateSQLIdentifier(operation.tableName, 'table name')
  
  const whereClause = generateWhereClause(operation.conditions, responses, flow)

  return `DELETE FROM ${operation.tableName}
${whereClause};`
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
    const sqlStatements = sortedOperations.map((operation) =>
      generateOperationSQL(operation, responses, flow)
    )
    return sqlStatements.join('\n\n')
  }

  // Legacy single-table INSERT support (backward compatibility)
  const { tableName, questions } = flow
  
  // Validate table name
  validateSQLIdentifier(tableName, 'table name')
  
  const columns: string[] = []
  const values: string[] = []

  questions.forEach((question) => {
    // Validate column name
    validateSQLIdentifier(question.sqlColumnName, 'column name')
    
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
