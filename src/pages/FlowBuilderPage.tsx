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
import { TableSchemaBuilder } from '@/components/TableSchemaBuilder'
import { Question, SQLOperation, SQLCondition, UserDefinedTable, RunCondition } from '@/types'
import { generateId } from '@/lib/utils'
import { Save, ArrowLeft, Database, HelpCircle, Import, Download, Trash2, Layers } from 'lucide-react'

type Tab = 'details' | 'schema' | 'questions' | 'sql-ops' | 'import'

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
  const [userDefinedTables, setUserDefinedTables] = useState<UserDefinedTable[]>([])

  // Load flow data
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
        setUserDefinedTables(flow.userDefinedTables || [])
      }
    }
  }, [id, flows])

  const validateFlowData = (): boolean => {
    if (!name.trim() || questions.length === 0) {
      alert('Please fill in all required fields and add at least one question')
      return false
    }

    return true
  }

  const handleSave = () => {
    if (!validateFlowData()) return

    const now = new Date()
    const flowData = {
      id: id || generateId(),
      name: name.trim(),
      description: description.trim(),
      welcomeMessage: welcomeMessage.trim() || undefined,
      completionMessage: completionMessage.trim() || undefined,
      tableName: tableName.trim() || (sqlOperations.length > 0 ? sqlOperations[0].tableName : 'DEFAULT_TABLE'),
      sqlOperations: sqlOperations.length > 0 ? sqlOperations : undefined,
      userDefinedTables: userDefinedTables.length > 0 ? userDefinedTables : undefined,
      questions,
      createdAt: id ? (flows.find((f) => f.id === id)?.createdAt ?? now) : now,
      updatedAt: now,
      isActive,
    }

    if (id) {
      updateFlow(id, flowData)
    } else {
      addFlow(flowData)
    }

    navigate('/')
  }

  const handleExportFlow = () => {
    const flowData = {
      id: id || generateId(),
      name: name.trim() || 'untitled-flow',
      description: description.trim(),
      welcomeMessage: welcomeMessage.trim() || undefined,
      completionMessage: completionMessage.trim() || undefined,
      tableName: tableName.trim() || 'DEFAULT_TABLE',
      sqlOperations: sqlOperations.length > 0 ? sqlOperations : undefined,
      userDefinedTables: userDefinedTables.length > 0 ? userDefinedTables : undefined,
      questions,
      createdAt: id ? (flows.find((f) => f.id === id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date(),
      isActive,
    }
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowData.name.replaceAll(' ', '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-muted-foreground">
              {id ? 'Edit Flow' : 'Create Flow'}
            </h1>
            <p className="text-sm text-muted-foreground">Build your onboarding questionnaire</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportFlow}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export JSON</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={handleSave} size="lg" className="shadow-lg shadow-primary/20">
            <Save className="h-4 w-4 mr-2" />
            Save Flow
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 min-w-max">
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
            Database Schema
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
            onClick={() => setActiveTab('sql-ops')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sql-ops'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Layers className="h-4 w-4 inline-block mr-1" />
            SQL Operations
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
            Import from DDL
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {/* User-Defined Table Schemas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Custom Table Schemas
              </CardTitle>
              <CardDescription>
                Define custom table structures manually. Useful when you don't have a live database connection or need to plan schemas before implementation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableSchemaBuilder
                tables={userDefinedTables}
                onAddTable={(table) => setUserDefinedTables([...userDefinedTables, table])}
                onUpdateTable={(tableId, updates) => {
                  setUserDefinedTables(
                    userDefinedTables.map((t) =>
                      t.id === tableId ? { ...t, ...updates } : t
                    )
                  )
                }}
                onDeleteTable={(tableId) => {
                  setUserDefinedTables(userDefinedTables.filter((t) => t.id !== tableId))
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'questions' && (
        <QuestionBuilder
          questions={questions}
          userDefinedTables={userDefinedTables}
          onAddQuestion={handleAddQuestion}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onReorderQuestions={handleReorderQuestions}
        />
      )}

      {activeTab === 'sql-ops' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                SQL Operations
              </CardTitle>
              <CardDescription>
                Define INSERT, UPDATE, or DELETE operations that execute when the flow is submitted.
                Map questions to columns and add WHERE conditions for UPDATE/DELETE.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sqlOperations.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-4">No SQL operations yet.</p>
                </div>
              )}

              {sqlOperations.map((op, opIdx) => (
                <div key={op.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">
                      Operation #{opIdx + 1}: {op.label || op.operationType}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSqlOperations(sqlOperations.filter((o) => o.id !== op.id))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Operation Type</Label>
                      <Select
                        value={op.operationType}
                        onChange={(e) => {
                          const updated = [...sqlOperations]
                          updated[opIdx] = { ...op, operationType: e.target.value as SQLOperation['operationType'] }
                          setSqlOperations(updated)
                        }}
                      >
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Table Name</Label>
                      <Input
                        value={op.tableName}
                        onChange={(e) => {
                          const updated = [...sqlOperations]
                          updated[opIdx] = { ...op, tableName: e.target.value }
                          setSqlOperations(updated)
                        }}
                        placeholder="e.g. users"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={op.label || ''}
                        onChange={(e) => {
                          const updated = [...sqlOperations]
                          updated[opIdx] = { ...op, label: e.target.value }
                          setSqlOperations(updated)
                        }}
                        placeholder="e.g. Create User"
                      />
                    </div>
                  </div>

                  {/* Column Mappings */}
                  {op.operationType !== 'DELETE' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Column Mappings</Label>
                      {op.columnMappings.map((cm, cmIdx) => (
                        <div key={cmIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Question</Label>
                            <Select
                              value={cm.questionId}
                              onChange={(e) => {
                                const updated = [...sqlOperations]
                                const mappings = [...op.columnMappings]
                                mappings[cmIdx] = { ...cm, questionId: e.target.value }
                                updated[opIdx] = { ...op, columnMappings: mappings }
                                setSqlOperations(updated)
                              }}
                            >
                              <option value="">Select question...</option>
                              {questions.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.label || q.id}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Column</Label>
                            <Input
                              value={cm.columnName}
                              onChange={(e) => {
                                const updated = [...sqlOperations]
                                const mappings = [...op.columnMappings]
                                mappings[cmIdx] = { ...cm, columnName: e.target.value }
                                updated[opIdx] = { ...op, columnMappings: mappings }
                                setSqlOperations(updated)
                              }}
                              placeholder="column_name"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...sqlOperations]
                              updated[opIdx] = {
                                ...op,
                                columnMappings: op.columnMappings.filter((_, i) => i !== cmIdx),
                              }
                              setSqlOperations(updated)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = [...sqlOperations]
                          updated[opIdx] = {
                            ...op,
                            columnMappings: [...op.columnMappings, { questionId: '', columnName: '' }],
                          }
                          setSqlOperations(updated)
                        }}
                      >
                        + Add Mapping
                      </Button>
                    </div>
                  )}

                  {/* WHERE Conditions (UPDATE / DELETE) */}
                  {op.operationType !== 'INSERT' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">WHERE Conditions</Label>
                      {op.conditions.map((cond, cIdx) => (
                        <div key={cond.id ?? cIdx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Column</Label>
                            <Input
                              value={cond.columnName}
                              onChange={(e) => {
                                const updated = [...sqlOperations]
                                const conds = [...op.conditions]
                                conds[cIdx] = { ...cond, columnName: e.target.value }
                                updated[opIdx] = { ...op, conditions: conds }
                                setSqlOperations(updated)
                              }}
                              placeholder="id"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Operator</Label>
                            <Select
                              value={cond.operator}
                              onChange={(e) => {
                                const updated = [...sqlOperations]
                                const conds = [...op.conditions]
                                conds[cIdx] = { ...cond, operator: e.target.value as SQLCondition['operator'] }
                                updated[opIdx] = { ...op, conditions: conds }
                                setSqlOperations(updated)
                              }}
                            >
                              <option value="equals">equals</option>
                              <option value="not-equals">not equals</option>
                              <option value="greater-than">greater than</option>
                              <option value="less-than">less than</option>
                              <option value="like">like</option>
                              <option value="in">in</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Value Source</Label>
                            <Select
                              value={cond.valueType}
                              onChange={(e) => {
                                const newType = e.target.value as 'static' | 'question'
                                const updated = [...sqlOperations]
                                const conds = [...op.conditions]
                                conds[cIdx] = {
                                  ...cond,
                                  valueType: newType,
                                  value: newType === 'question' ? '' : cond.value,
                                }
                                updated[opIdx] = { ...op, conditions: conds }
                                setSqlOperations(updated)
                              }}
                            >
                              <option value="static">Static value</option>
                              <option value="question">From question</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Value</Label>
                            {cond.valueType === 'question' ? (
                              <Select
                                value={cond.value.replaceAll(/(?:^\$\{)|(?:\}$)/g, '')}
                                onChange={(e) => {
                                  const updated = [...sqlOperations]
                                  const conds = [...op.conditions]
                                  conds[cIdx] = { ...cond, value: `\${${e.target.value}}` }
                                  updated[opIdx] = { ...op, conditions: conds }
                                  setSqlOperations(updated)
                                }}
                              >
                                <option value="">Select question...</option>
                                {questions.map((q) => (
                                  <option key={q.id} value={q.id}>
                                    {q.label || q.id}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <Input
                                value={cond.value}
                                onChange={(e) => {
                                  const updated = [...sqlOperations]
                                  const conds = [...op.conditions]
                                  conds[cIdx] = { ...cond, value: e.target.value }
                                  updated[opIdx] = { ...op, conditions: conds }
                                  setSqlOperations(updated)
                                }}
                                placeholder="value"
                              />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = [...sqlOperations]
                              updated[opIdx] = {
                                ...op,
                                conditions: op.conditions.filter((_, i) => i !== cIdx),
                              }
                              setSqlOperations(updated)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = [...sqlOperations]
                          const newCond: SQLCondition = {
                            id: generateId(),
                            columnName: '',
                            operator: 'equals',
                            value: '',
                            valueType: 'static',
                          }
                          updated[opIdx] = { ...op, conditions: [...op.conditions, newCond] }
                          setSqlOperations(updated)
                        }}
                      >
                        + Add Condition
                      </Button>
                    </div>
                  )}

                  {/* Run Conditions — gate whether this operation executes at all */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Only Run When…</Label>
                      {(op.runConditions ?? []).length > 1 && (
                        <Select
                          value={op.runConditionsOperator ?? 'AND'}
                          onChange={(e) => {
                            const updated = [...sqlOperations]
                            updated[opIdx] = { ...op, runConditionsOperator: e.target.value as 'AND' | 'OR' }
                            setSqlOperations(updated)
                          }}
                          className="w-20 text-xs"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </Select>
                      )}
                    </div>
                    {(op.runConditions ?? []).map((rc, rcIdx) => (
                      <div key={rc.id ?? rcIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Question</Label>
                          <Select
                            value={rc.questionId}
                            onChange={(e) => {
                              const updated = [...sqlOperations]
                              const rcs = [...(op.runConditions ?? [])]
                              rcs[rcIdx] = { ...rc, questionId: e.target.value }
                              updated[opIdx] = { ...op, runConditions: rcs }
                              setSqlOperations(updated)
                            }}
                          >
                            <option value="">Select question…</option>
                            {questions.map((q) => (
                              <option key={q.id} value={q.id}>{q.label || q.id}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Operator</Label>
                          <Select
                            value={rc.operator}
                            onChange={(e) => {
                              const updated = [...sqlOperations]
                              const rcs = [...(op.runConditions ?? [])]
                              rcs[rcIdx] = { ...rc, operator: e.target.value as RunCondition['operator'] }
                              updated[opIdx] = { ...op, runConditions: rcs }
                              setSqlOperations(updated)
                            }}
                          >
                            <option value="equals">equals</option>
                            <option value="not-equals">not equals</option>
                            <option value="contains">contains</option>
                            <option value="greater-than">greater than</option>
                            <option value="less-than">less than</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value</Label>
                          <Input
                            value={rc.value}
                            onChange={(e) => {
                              const updated = [...sqlOperations]
                              const rcs = [...(op.runConditions ?? [])]
                              rcs[rcIdx] = { ...rc, value: e.target.value }
                              updated[opIdx] = { ...op, runConditions: rcs }
                              setSqlOperations(updated)
                            }}
                            placeholder="value"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...sqlOperations]
                            updated[opIdx] = {
                              ...op,
                              runConditions: (op.runConditions ?? []).filter((_, i) => i !== rcIdx),
                            }
                            setSqlOperations(updated)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = [...sqlOperations]
                        const newRc: RunCondition = {
                          id: generateId(),
                          questionId: '',
                          operator: 'equals',
                          value: '',
                        }
                        updated[opIdx] = { ...op, runConditions: [...(op.runConditions ?? []), newRc] }
                        setSqlOperations(updated)
                      }}
                    >
                      + Add Run Condition
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                onClick={() => {
                  const newOp: SQLOperation = {
                    id: generateId(),
                    operationType: 'INSERT',
                    tableName: tableName || '',
                    label: '',
                    columnMappings: [],
                    conditions: [],
                    order: sqlOperations.length,
                  }
                  setSqlOperations([...sqlOperations, newOp])
                }}
                variant="outline"
                className="w-full"
              >
                + Add SQL Operation
              </Button>
            </CardContent>
          </Card>
        </div>
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
    </div>
  )
}
