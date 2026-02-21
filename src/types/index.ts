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
  questions: Question[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

// Individual response to a question
export interface Response {
  questionId: string
  value: string | number | boolean | string[] | null
}

// Submission status
export type SubmissionStatus = 'pending' | 'executed' | 'failed'

// Complete submission from a customer
export interface Submission {
  id: string
  flowId: string
  flowName: string
  responses: Response[]
  startedAt: Date
  completedAt: Date
  status: SubmissionStatus
  generatedSQL?: string
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
