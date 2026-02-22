import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { QuestionBuilder } from '@/components/QuestionBuilder'
import { SchemaImporter } from '@/components/SchemaImporter'
import { Question, SQLOperation, SQLOperationType, ColumnMapping, SQLCondition } from '@/types'
import { generateId } from '@/lib/utils'
import { Save, ArrowLeft, Database, HelpCircle, PlaySquare, Plus, Trash2, ChevronDown, ChevronRight, Import } from 'lucide-react'

type Tab = 'details' | 'schema' | 'questions' | 'import' | 'simulator'

export function FlowBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addFlow = useStore((state) => state.addFlow)
  const updateFlow = useStore((state) => state.updateFlow)
  const flows = useStore((state) => state.flows)

  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [tableName, setTableName] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [isActive, setIsActive] = useState(true)
  const [sqlOperations, setSqlOperations] = useState<SQLOperation[]>([])
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (id) {
      const flow = flows.find((f) => f.id === id)
      if (flow) {
        setName(flow.name)
        setDescription(flow.description)
        setWelcomeMessage(flow.welcomeMessage || '')
        setCompletionMessage(flow.completionMessage || '')
        setTableName(flow.tableName)
        setQuestions(flow.questions)
        setIsActive(flow.isActive)
        setSqlOperations(flow.sqlOperations || [])
      }
    }
  }, [id, flows])

  const handleSave = async () => {
    if (!name.trim() || questions.length === 0) {
      alert('Please fill in all required fields and add at least one question')
      return
    }

    // Validate SQL operations
    if (sqlOperations.length > 0) {
      for (const op of sqlOperations) {
        if (!op.tableName.trim()) {
          alert('All SQL operations must have a table name')
          return
        }
        if (op.columnMappings.length === 0 && op.operationType !== 'DELETE') {
          alert(`SQL operation on ${op.tableName} must have at least one column mapping`)
          return
        }
      }
    }

    const flowData = {
      id: id || generateId(),
      name: name.trim(),
      description: description.trim(),
      welcomeMessage: welcomeMessage.trim() || undefined,
      completionMessage: completionMessage.trim() || undefined,
      tableName: tableName.trim() || (sqlOperations.length > 0 ? sqlOperations[0].tableName : 'DEFAULT_TABLE'),
      sqlOperations: sqlOperations.length > 0 ? sqlOperations : undefined,
      questions,
      createdAt: id ? flows.find((f) => f.id === id)!.createdAt : new Date(),
      updatedAt: new Date(),
      isActive,
    }

    if (id) {
      await updateFlow(id, flowData)
    } else {
      await addFlow(flowData)
    }

    navigate('/')
  }

  const handleAddSQLOperation = () => {
    const newOperation: SQLOperation = {
      id: generateId(),
      operationType: 'INSERT',
      tableName: '',
      label: '',
      columnMappings: [],
      conditions: [],
      order: sqlOperations.length,
    }
    setSqlOperations([...sqlOperations, newOperation])
    setExpandedOperations(new Set([...expandedOperations, newOperation.id]))
  }

  const handleUpdateSQLOperation = (opId: string, updates: Partial<SQLOperation>) => {
    setSqlOperations(sqlOperations.map(op => op.id === opId ? { ...op, ...updates } : op))
  }

  const handleDeleteSQLOperation = (opId: string) => {
    setSqlOperations(sqlOperations.filter(op => op.id !== opId))
    const newExpanded = new Set(expandedOperations)
    newExpanded.delete(opId)
    setExpandedOperations(newExpanded)
  }

  const toggleOperationExpanded = (opId: string) => {
    const newExpanded = new Set(expandedOperations)
    if (newExpanded.has(opId)) {
      newExpanded.delete(opId)
    } else {
      newExpanded.add(opId)
    }
    setExpandedOperations(newExpanded)
  }

  const handleAddColumnMapping = (opId: string) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newMapping: ColumnMapping = {
        id: generateId(),
        questionId: questions[0]?.id || '',
        columnName: '',
      }
      handleUpdateSQLOperation(opId, {
        columnMappings: [...operation.columnMappings, newMapping]
      })
    }
  }

  const handleUpdateColumnMapping = (opId: string, index: number, updates: Partial<ColumnMapping>) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newMappings = [...operation.columnMappings]
      newMappings[index] = { ...newMappings[index], ...updates }
      handleUpdateSQLOperation(opId, { columnMappings: newMappings })
    }
  }

  const handleDeleteColumnMapping = (opId: string, index: number) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newMappings = operation.columnMappings.filter((_, i) => i !== index)
      handleUpdateSQLOperation(opId, { columnMappings: newMappings })
    }
  }

  const handleAddCondition = (opId: string) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newCondition: SQLCondition = {
        id: generateId(),
        columnName: '',
        operator: 'equals',
        value: '',
        valueType: 'static',
      }
      handleUpdateSQLOperation(opId, {
        conditions: [...operation.conditions, newCondition]
      })
    }
  }

  const handleUpdateCondition = (opId: string, index: number, updates: Partial<SQLCondition>) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newConditions = [...operation.conditions]
      newConditions[index] = { ...newConditions[index], ...updates }
      handleUpdateSQLOperation(opId, { conditions: newConditions })
    }
  }

  const handleDeleteCondition = (opId: string, index: number) => {
    const operation = sqlOperations.find(op => op.id === opId)
    if (operation) {
      const newConditions = operation.conditions.filter((_, i) => i !== index)
      handleUpdateSQLOperation(opId, { conditions: newConditions })
    }
  }

  const handleAddQuestion = (question: Question) => {
    setQuestions([...questions, question])
  }

  const handleUpdateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)))
  }

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId))
  }

  const handleReorderQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground">
            {id ? 'Edit Flow' : 'Create Flow'}
          </h1>
          <p className="text-sm text-muted-foreground">Build your onboarding questionnaire</p>
        </div>
        <Button onClick={handleSave} size="lg" className="shadow-lg shadow-primary/20">
          <Save className="h-4 w-4 mr-2" />
          Save Flow
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Flow Details
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'schema'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Database className="h-4 w-4 inline-block mr-1" />
            SQL Operations & Schema
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'questions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <HelpCircle className="h-4 w-4 inline-block mr-1" />
            Questions
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'import'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Import className="h-4 w-4 inline-block mr-1" />
            Import Schema
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'simulator'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <PlaySquare className="h-4 w-4 inline-block mr-1" />
            SQL Simulator
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">✨</span> Flow Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Flow Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Onboarding"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this onboarding flow for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      placeholder="First message the customer sees..."
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="completionMessage">Completion Message</Label>
                    <Textarea
                      id="completionMessage"
                      placeholder="Message shown after all questions..."
                      value={completionMessage}
                      onChange={(e) => setCompletionMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer font-normal">
                    Flow is active and visible
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                SQL Operations
              </CardTitle>
              <CardDescription>
                Define INSERT, UPDATE, or DELETE operations. Map questions to table columns and add WHERE conditions for UPDATE/DELETE.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sqlOperations.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground mb-4">No SQL operations defined yet</p>
                  <Button onClick={handleAddSQLOperation} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add SQL Operation
                  </Button>
                </div>
              ) : (
                <>
                  {sqlOperations.map((operation) => {
                    const isExpanded = expandedOperations.has(operation.id)
                    return (
                      <div key={operation.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Operation Header */}
                        <div className="bg-gray-50 p-4">
                          <div className="grid grid-cols-12 gap-4 items-start">
                            <div className="col-span-1 flex items-center justify-center pt-2">
                              <button
                                onClick={() => toggleOperationExpanded(operation.id)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                            <div className="col-span-3 space-y-2">
                              <Label className="text-xs text-muted-foreground">Operation Type</Label>
                              <Select
                                value={operation.operationType}
                                onChange={(e) =>
                                  handleUpdateSQLOperation(operation.id, {
                                    operationType: e.target.value as SQLOperationType,
                                  })
                                }
                              >
                                <option value="INSERT">INSERT</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="DELETE">DELETE</option>
                              </Select>
                            </div>
                            <div className="col-span-4 space-y-2">
                              <Label className="text-xs text-muted-foreground">Table Name *</Label>
                              <Input
                                placeholder="e.g., SERVICE_ACCESS"
                                value={operation.tableName}
                                onChange={(e) =>
                                  handleUpdateSQLOperation(operation.id, { tableName: e.target.value })
                                }
                                className="uppercase"
                              />
                            </div>
                            <div className="col-span-3 space-y-2">
                              <Label className="text-xs text-muted-foreground">Label (optional)</Label>
                              <Input
                                placeholder="e.g., Create account"
                                value={operation.label || ''}
                                onChange={(e) =>
                                  handleUpdateSQLOperation(operation.id, { label: e.target.value })
                                }
                              />
                            </div>
                            <div className="col-span-1 flex items-center justify-center pt-7">
                              <button
                                onClick={() => handleDeleteSQLOperation(operation.id)}
                                className="text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="p-6 space-y-6 bg-white">
                            {/* Column Mappings (for INSERT and UPDATE) */}
                            {operation.operationType !== 'DELETE' && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <Label className="text-sm font-semibold">Column Mappings</Label>
                                  <Button
                                    onClick={() => handleAddColumnMapping(operation.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Mapping
                                  </Button>
                                </div>
                                {operation.columnMappings.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">
                                    No column mappings defined. Add at least one mapping.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {operation.columnMappings.map((mapping, mappingIdx) => (
                                      <div
                                        key={mapping.id || mappingIdx}
                                        className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded"
                                      >
                                        <div className="col-span-5">
                                          <Select
                                            value={mapping.questionId}
                                            onChange={(e) =>
                                              handleUpdateColumnMapping(operation.id, mappingIdx, {
                                                questionId: e.target.value,
                                              })
                                            }
                                          >
                                            <option value="">Select Question...</option>
                                            {questions.map((q) => (
                                              <option key={q.id} value={q.id}>
                                                {q.label}
                                              </option>
                                            ))}
                                          </Select>
                                        </div>
                                        <div className="col-span-1 text-center text-muted-foreground">→</div>
                                        <div className="col-span-5">
                                          <Input
                                            placeholder="COLUMN_NAME"
                                            value={mapping.columnName}
                                            onChange={(e) =>
                                              handleUpdateColumnMapping(operation.id, mappingIdx, {
                                                columnName: e.target.value,
                                              })
                                            }
                                            className="uppercase"
                                          />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                          <button
                                            onClick={() => handleDeleteColumnMapping(operation.id, mappingIdx)}
                                            className="text-muted-foreground hover:text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* WHERE Conditions (for UPDATE and DELETE) */}
                            {(operation.operationType === 'UPDATE' || operation.operationType === 'DELETE') && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <Label className="text-sm font-semibold">
                                    WHERE Conditions {operation.operationType === 'UPDATE' || operation.operationType === 'DELETE' ? '(Optional)' : ''}
                                  </Label>
                                  <Button
                                    onClick={() => handleAddCondition(operation.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Condition
                                  </Button>
                                </div>
                                {operation.conditions.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">
                                    No conditions. {operation.operationType} will affect all rows (use with caution).
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {operation.conditions.map((condition, condIdx) => (
                                      <div
                                        key={condition.id || condIdx}
                                        className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded"
                                      >
                                        <div className="col-span-3">
                                          <Input
                                            placeholder="COLUMN_NAME"
                                            value={condition.columnName}
                                            onChange={(e) =>
                                              handleUpdateCondition(operation.id, condIdx, {
                                                columnName: e.target.value,
                                              })
                                            }
                                            className="uppercase"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <Select
                                            value={condition.operator}
                                            onChange={(e) =>
                                              handleUpdateCondition(operation.id, condIdx, {
                                                operator: e.target.value as any,
                                              })
                                            }
                                          >
                                            <option value="equals">=</option>
                                            <option value="not-equals">!=</option>
                                            <option value="greater-than">&gt;</option>
                                            <option value="less-than">&lt;</option>
                                            <option value="like">LIKE</option>
                                            <option value="in">IN</option>
                                          </Select>
                                        </div>
                                        <div className="col-span-2">
                                          <Select
                                            value={condition.valueType}
                                            onChange={(e) =>
                                              handleUpdateCondition(operation.id, condIdx, {
                                                valueType: e.target.value as 'static' | 'question',
                                              })
                                            }
                                          >
                                            <option value="static">Static</option>
                                            <option value="question">Question</option>
                                          </Select>
                                        </div>
                                        <div className="col-span-4">
                                          {condition.valueType === 'question' ? (
                                            <Select
                                              value={condition.value}
                                              onChange={(e) =>
                                                handleUpdateCondition(operation.id, condIdx, {
                                                  value: e.target.value,
                                                })
                                              }
                                            >
                                              <option value="">Select Question...</option>
                                              {questions.map((q) => (
                                                <option key={q.id} value={`\${${q.id}}`}>
                                                  {q.label}
                                                </option>
                                              ))}
                                            </Select>
                                          ) : (
                                            <Input
                                              placeholder="Value"
                                              value={condition.value}
                                              onChange={(e) =>
                                                handleUpdateCondition(operation.id, condIdx, {
                                                  value: e.target.value,
                                                })
                                              }
                                            />
                                          )}
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                          <button
                                            onClick={() => handleDeleteCondition(operation.id, condIdx)}
                                            className="text-muted-foreground hover:text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Button onClick={handleAddSQLOperation} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add SQL Operation
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'questions' && (
        <QuestionBuilder
          questions={questions}
          onAddQuestion={handleAddQuestion}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onReorderQuestions={handleReorderQuestions}
        />
      )}

      {activeTab === 'import' && (
        <SchemaImporter
          questions={questions}
          onApply={(newQuestions, newOperations) => {
            setQuestions([...questions, ...newQuestions])
            setSqlOperations([...sqlOperations, ...newOperations])
            setActiveTab('questions')
          }}
        />
      )}

      {activeTab === 'simulator' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlaySquare className="h-5 w-5 text-primary" />
              SQL Simulator
            </CardTitle>
            <CardDescription>
              Preview how your SQL statements will execute against the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <PlaySquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">SQL Simulator will be available after the flow is saved</p>
              <p className="text-xs mt-2">Complete onboarding sessions will generate SQL that you can test here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
