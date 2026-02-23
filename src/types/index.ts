// Question types supported in the flow builder
export type QuestionType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'single-select'
  | 'multi-select'
  | 'yes-no'

// Conditional logic for showing/hiding questions
export interface ConditionalLogic {
  questionId: string
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than'
  value: string | number | boolean
}

// Validation rules for questions
export interface ValidationRule {
  type: 'required' | 'min-length' | 'max-length' | 'pattern' | 'min' | 'max'
  value?: string | number
  message?: string
}

// User-defined column in a table schema
export interface UserDefinedColumn {
  id: string
  name: string
  dataType: 'text' | 'integer' | 'real' | 'date' | 'datetime' | 'boolean'
  nullable: boolean
  isPrimaryKey: boolean
  defaultValue?: string
  description?: string
}

// User-defined table schema
export interface UserDefinedTable {
  id: string
  name: string
  description?: string
  columns: UserDefinedColumn[]
  createdAt: Date
  updatedAt: Date
}

// Individual question definition
export interface Question {
  id: string
  type: QuestionType
  label: string
  placeholder?: string
  helpText?: string
  options?: string[] // For select and multi-select
  required: boolean
  validationRules: ValidationRule[]
  sqlColumnName: string // Maps to database column
  tableName?: string // Optional: specific table this column belongs to
  conditionalLogic?: ConditionalLogic // Show question based on condition
  order: number
}

// SQL operation types
export type SQLOperationType = 'INSERT' | 'UPDATE' | 'DELETE'

// SQL condition for UPDATE/DELETE WHERE clauses
export interface SQLCondition {
  id?: string // Unique identifier for React keys
  columnName: string
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'like' | 'in'
  value: string // Can be a static value or reference to a question ID with ${questionId}
  valueType: 'static' | 'question' // Whether value is static or from a question response
}

// Column mapping for SQL operations
export interface ColumnMapping {
  id?: string // Unique identifier for React keys
  questionId: string // Which question provides the value
  columnName: string // Target column in the table
}

// SQL operation definition
export interface SQLOperation {
  id: string
  operationType: SQLOperationType
  tableName: string
  label?: string // Optional label for the operation
  columnMappings: ColumnMapping[] // Which questions map to which columns
  conditions: SQLCondition[] // WHERE conditions (for UPDATE/DELETE)
  order: number // Execution order
}

// Onboarding flow definition
export interface OnboardingFlow {
  id: string
  name: string
  description: string
  welcomeMessage?: string
  completionMessage?: string
  tableName: string // Legacy: Primary table name (for backward compatibility)
  sqlOperations?: SQLOperation[] // New: Multiple SQL operations support
  userDefinedTables?: UserDefinedTable[] // New: User-defined table schemas
  questions: Question[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  createdBy?: string | null
  schemaContext?: string | null
}

// Individual response to a question
export interface Response {
  questionId: string
  value: string | number | boolean | string[] | null
}

// User and auth
export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  mustChangePassword?: boolean
  createdAt: string
  lastLoginAt?: string | null
  submissionCount?: number
}

// Submission status
export type SubmissionStatus = 'pending' | 'executed' | 'failed'

// Complete submission from a customer
export interface Submission {
  id: string
  flowId: string
  flowName: string
  userId?: string | null
  responses: Response[]
  startedAt: Date
  completedAt: Date
  status: SubmissionStatus
  generatedSQL?: string
  executedAt?: string | null
}

// Store structure for Zustand
export interface AppStore {
  flows: OnboardingFlow[]
  submissions: Submission[]
  setFlows: (flows: OnboardingFlow[]) => void
  setSubmissions: (submissions: Submission[]) => void
  addFlow: (flow: OnboardingFlow) => void
  updateFlow: (id: string, flow: Partial<OnboardingFlow>) => void
  deleteFlow: (id: string) => void
  addSubmission: (submission: Submission) => void
  updateSubmission: (id: string, submission: Partial<Submission>) => void
}

// DB connection config stored in sessionStorage
export interface DBConnectionConfig {
  type: 'postgresql' | 'sqlite'
  connectionString: string
  label?: string
}

// DB schema types (returned from backend)
export interface SchemaColumn {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  checkValues?: string[]
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

// Result of a single SQL statement execution
export interface StatementResult {
  statement: string
  rowsAffected: number
  success: boolean
  error?: string
}

// Full execution result (transaction-level)
export interface ExecutionResult {
  ok: boolean
  results?: StatementResult[]
  rolledBack?: boolean
  error?: string
}

// AI configuration
export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
}

// Execution history entry
export interface ExecutionHistory {
  id: string
  submissionId: string
  userId: string | null
  userName?: string
  userEmail?: string
  flowName?: string
  statement: string
  success: boolean
  rowsAffected?: number | null
  errorMessage?: string | null
  executedAt: string
}
