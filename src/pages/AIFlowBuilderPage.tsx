/**
 * AIFlowBuilderPage.tsx
 * AI-powered onboarding flow creation wizard
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { buildSchemaContext, schemaContextToMarkdown, type SchemaContext } from '../lib/schema-context-builder'
import { generateQuestionsFromPurpose, generateSQLOperations, validateOperationSafety } from '../lib/ai-flow-generator'
import { loadAIConfig } from '../lib/ai-client'
import { generateSQL } from '../lib/sql-generator'
import { useStore } from '../lib/store'
import { generateId } from '../lib/utils'
import type { Question, SQLOperation, OnboardingFlow } from '../types'

const STEPS = [
  { id: 1, title: 'Purpose & Context', description: 'Describe your onboarding goal' },
  { id: 2, title: 'Schema Review', description: 'Select relevant database tables' },
  { id: 3, title: 'Questions', description: 'AI-generated questions' },
  { id: 4, title: 'SQL Operations', description: 'Data persistence mapping' },
  { id: 5, title: 'Review & Configure', description: 'Final review and settings' },
]

export function AIFlowBuilderPage() {
  const navigate = useNavigate()
  const { addFlow, flows } = useStore()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [purpose, setPurpose] = useState('')
  const [schema, setSchema] = useState<SchemaContext | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [sqlOperations, setSqlOperations] = useState<SQLOperation[]>([])

  // Flow metadata
  const [flowName, setFlowName] = useState('')
  const [flowDescription, setFlowDescription] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [aiEnabled, setAiEnabled] = useState(false)

  // Check AI configuration on mount
  useEffect(() => {
    const config = loadAIConfig()
    setAiEnabled(config.enabled)
  }, [])

  // Load schema on mount
  useEffect(() => {
    loadSchema()
  }, [])

  async function loadSchema() {
    try {
      setLoading(true)
      // Collect user-defined tables from all existing flows
      const allUserTables = flows.flatMap((f) => f.userDefinedTables ?? [])
      const context = await buildSchemaContext(allUserTables.length > 0 ? allUserTables : undefined)
      setSchema(context)
    } catch (err) {
      setError(`Failed to load schema: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateQuestions() {
    if (!purpose.trim()) {
      setError('Please describe the purpose of your onboarding flow')
      return
    }

    if (!schema) {
      setError('Schema not loaded')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setWarnings([])

      const result = await generateQuestionsFromPurpose(purpose, schema)
      setQuestions(result.questions)
      setWarnings(result.warnings)

      if (result.questions.length === 0) {
        setError('AI did not generate any questions. Please try rephrasing your purpose.')
      } else {
        // Auto-advance to next step
        setCurrentStep(4)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateSQLOperations() {
    if (questions.length === 0) {
      setError('No questions to generate SQL operations for')
      return
    }

    if (!schema) {
      setError('Schema not loaded')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setWarnings([])

      const result = await generateSQLOperations(questions, schema, selectedTables)
      setSqlOperations(result.operations)
      
      // Validate safety
      const safety = validateOperationSafety(result.operations)
      const allWarnings = [...result.warnings, ...safety.warnings, ...safety.criticalWarnings]
      setWarnings(allWarnings)

      if (!safety.safe) {
        setError('⚠️ CRITICAL: AI generated potentially dangerous SQL operations. Please review carefully!')
      }

      if (result.operations.length === 0) {
        setError('AI did not generate any SQL operations.')
      } else {
        // Auto-advance to review step
        setCurrentStep(5)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SQL operations')
    } finally {
      setLoading(false)
    }
  }

  function handleRemoveQuestion(questionId: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  function handleRemoveOperation(operationId: string) {
    setSqlOperations((prev) => prev.filter((op) => op.id !== operationId))
  }

  async function handleSaveFlow() {
    if (!flowName.trim()) {
      setError('Flow name is required')
      return
    }

    if (questions.length === 0) {
      setError('At least one question is required')
      return
    }

    if (sqlOperations.length === 0) {
      setError('At least one SQL operation is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const flow: OnboardingFlow = {
        id: generateId(),
        name: flowName,
        description: flowDescription,
        welcomeMessage: welcomeMessage || undefined,
        completionMessage: completionMessage || undefined,
        questions,
        sqlOperations,
        isActive,
        isPublic,
        tableName: sqlOperations[0]?.tableName || '', // Legacy field
        createdAt: now,
        updatedAt: now,
      }

      addFlow(flow)
      navigate('/') // Redirect to home/flows list
    } catch (err) {
      setError(`Failed to save flow: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  function canProceed(step: number): boolean {
    switch (step) {
      case 1:
        return purpose.trim().length > 0
      case 2:
        return true // Schema review is optional
      case 3:
        return questions.length > 0
      case 4:
        return sqlOperations.length > 0
      case 5:
        return flowName.trim().length > 0
      default:
        return false
    }
  }

  function toggleTableSelection(tableName: string) {
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    )
  }

  // Generate preview SQL
  const previewSQL = (() => {
    if (questions.length === 0 || sqlOperations.length === 0) return ''
    try {
      const dummySubmission = {
        id: 'preview',
        flowId: 'preview',
        flowName: 'Preview',
        responses: questions.map((q) => {
          let value: string | number | boolean | string[] = 'Sample Value'
          if (q.type === 'number') value = 42
          if (q.type === 'yes-no') value = true
          if (q.type === 'date') value = '2024-01-01'
          if (q.type === 'multi-select') value = q.options?.slice(0, 2) ?? []
          return { questionId: q.id, value }
        }),
        status: 'pending' as const,
        startedAt: new Date(),
        completedAt: new Date(),
      }
      const flow = { questions, sqlOperations, tableName: sqlOperations[0]?.tableName || '' }
      return generateSQL(dummySubmission, flow as OnboardingFlow)
    } catch {
      return '-- Error generating preview SQL'
    }
  })()

  if (!aiEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">AI Not Enabled</h1>
          <p className="text-gray-600 mb-6">
            The AI Flow Builder requires AI to be enabled. Please configure your AI settings first.
          </p>
          <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Flow Builder</h1>
        <p className="text-gray-600">Create onboarding flows with AI assistance</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <div className="text-xs mt-2 text-center">
                  <div className="font-semibold">{step.title}</div>
                  <div className="text-gray-500">{step.description}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error/Warning Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <strong>Warnings:</strong>
          <ul className="list-disc ml-5 mt-2">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Content */}
      <Card className="p-6 mb-6">
        {/* Step 1: Purpose & Context */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 1: Purpose & Context</h2>
            <p className="text-gray-600 mb-6">
              Describe what data you want to collect and why. Be specific about your use case.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="purpose">Onboarding Purpose *</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="E.g., Collect new employee information including name, email, department, and start date to populate our HR database"
                  rows={6}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tip: Mention specific data fields and which tables they should go into.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Schema Review */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 2: Schema Review</h2>
            <p className="text-gray-600 mb-6">
              Review available database tables and select the ones relevant to your flow.
            </p>

            {loading && <p>Loading schema...</p>}

            {schema && (
              <div>
                {schema.hasLiveConnection && (
                  <Badge variant="success" className="mb-4 bg-green-50 text-green-700 border-green-200">
                    ✓ Live database connection
                  </Badge>
                )}

                {schema.tables.length === 0 ? (
                  <p className="text-gray-500">
                    No tables found. You can still proceed, but the AI may not generate optimal mappings.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {schema.tables.map((table) => (
                      <Card
                        key={table.name}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedTables.includes(table.name)
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => toggleTableSelection(table.name)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{table.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {table.source}
                              </Badge>
                              {selectedTables.includes(table.name) && (
                                <Badge className="text-xs bg-blue-600">Selected</Badge>
                              )}
                            </div>
                            {table.description && (
                              <p className="text-sm text-gray-600 mb-2">{table.description}</p>
                            )}
                            <div className="text-xs text-gray-500">
                              {table.columns.length} columns:{' '}
                              {table.columns.map((c) => c.name).join(', ')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <details>
                    <summary className="cursor-pointer font-semibold">
                      View Full Schema (Markdown)
                    </summary>
                    <pre className="mt-4 text-xs overflow-auto">
                      {schemaContextToMarkdown(schema)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Questions */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 3: AI-Generated Questions</h2>
            <p className="text-gray-600 mb-6">
              Let AI generate questions based on your purpose and selected tables.
            </p>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <Button onClick={handleGenerateQuestions} disabled={loading}>
                  {loading ? 'Generating...' : '🪄 Generate Questions with AI'}
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-gray-600">{questions.length} questions generated</p>
                  <Button onClick={handleGenerateQuestions} variant="outline" disabled={loading}>
                    Regenerate
                  </Button>
                </div>

                <div className="space-y-3">
                  {questions.map((q) => (
                    <Card key={q.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{q.type}</Badge>
                            <span className="font-semibold">{q.label}</span>
                            {q.required && <Badge className="text-xs bg-red-600">Required</Badge>}
                          </div>
                          <div className="text-sm text-gray-600">
                            {q.placeholder && <div>Placeholder: {q.placeholder}</div>}
                            {q.sqlColumnName && (
                              <div>
                                Maps to: <code className="bg-gray-100 px-1 rounded">{q.tableName ? `${q.tableName}.` : ''}{q.sqlColumnName}</code>
                              </div>
                            )}
                            {q.options && q.options.length > 0 && (
                              <div>Options: {q.options.join(', ')}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="ml-4"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: SQL Operations */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 4: SQL Operations</h2>
            <p className="text-gray-600 mb-6">
              AI will generate SQL operations to persist the collected data.
            </p>

            {sqlOperations.length === 0 ? (
              <div className="text-center py-8">
                <Button onClick={handleGenerateSQLOperations} disabled={loading}>
                  {loading ? 'Generating...' : '🪄 Generate SQL Mappings'}
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-gray-600">{sqlOperations.length} operations generated</p>
                  <Button onClick={handleGenerateSQLOperations} variant="outline" disabled={loading}>
                    Regenerate
                  </Button>
                </div>

                <div className="space-y-3">
                  {sqlOperations.map((op) => (
                    <Card key={op.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className={
                                op.operationType === 'INSERT'
                                  ? 'bg-green-600'
                                  : op.operationType === 'UPDATE'
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }
                            >
                              {op.operationType}
                            </Badge>
                            <span className="font-semibold">{op.tableName}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <strong>Column Mappings:</strong>
                              <ul className="list-disc ml-5">
                                {op.columnMappings.map((m, i) => (
                                  <li key={i}>
                                    <code className="bg-gray-100 px-1 rounded">{m.columnName}</code> ← Question ID: {m.questionId}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {op.conditions && op.conditions.length > 0 && (
                              <div>
                                <strong>Conditions:</strong>
                                <ul className="list-disc ml-5">
                                  {op.conditions.map((c, i) => (
                                    <li key={i}>
                                      {c.columnName} {c.operator} {c.value}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveOperation(op.id)}
                          className="ml-4"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Configure */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Step 5: Review & Configure</h2>
            <p className="text-gray-600 mb-6">
              Review the generated flow and configure metadata before saving.
            </p>

            <div className="space-y-6">
              {/* Flow Metadata */}
              <div className="space-y-4">
                <h3 className="font-semibold">Flow Settings</h3>
                <div>
                  <Label htmlFor="flowName">Flow Name *</Label>
                  <Input
                    id="flowName"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="E.g., New Employee Onboarding"
                  />
                </div>
                <div>
                  <Label htmlFor="flowDescription">Description</Label>
                  <Textarea
                    id="flowDescription"
                    value={flowDescription}
                    onChange={(e) => setFlowDescription(e.target.value)}
                    placeholder="Brief description of this flow"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="welcomeMessage">Welcome Message</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Shown at the start of the flow"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="completionMessage">Completion Message</Label>
                  <Textarea
                    id="completionMessage"
                    value={completionMessage}
                    onChange={(e) => setCompletionMessage(e.target.value)}
                    placeholder="Shown after successful submission"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Active (visible to users)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span>Public (available to all users)</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Card className="p-3">
                    <div className="text-gray-600">Questions</div>
                    <div className="text-2xl font-bold">{questions.length}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-gray-600">SQL Operations</div>
                    <div className="text-2xl font-bold">{sqlOperations.length}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-gray-600">Selected Tables</div>
                    <div className="text-2xl font-bold">{selectedTables.length || 'Auto'}</div>
                  </Card>
                </div>
              </div>

              {/* SQL Preview */}
              <div>
                <h3 className="font-semibold mb-2">SQL Preview (Sample Data)</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto max-h-64">
                  {previewSQL}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          ← Previous
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed(currentStep)}
            >
              Next →
            </Button>
          ) : (
            <Button onClick={handleSaveFlow} disabled={loading || !canProceed(5)}>
              {loading ? 'Saving...' : '💾 Save Flow'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
