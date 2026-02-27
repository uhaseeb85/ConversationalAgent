import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { QuestionBuilder } from '@/components/QuestionBuilder'
import { SchemaImporter } from '@/components/SchemaImporter'
import { TableSchemaBuilder } from '@/components/TableSchemaBuilder'
import { Question, SQLOperation, UserDefinedTable } from '@/types'
import { generateId } from '@/lib/utils'
import { Save, ArrowLeft, Database, HelpCircle, Import, Download } from 'lucide-react'

type Tab = 'details' | 'schema' | 'questions' | 'import'

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
      createdAt: id ? flows.find((f) => f.id === id)!.createdAt : now,
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
      createdAt: id ? flows.find((f) => f.id === id)!.createdAt : new Date(),
      updatedAt: new Date(),
      isActive,
    }
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowData.name.replace(/\s+/g, '-').toLowerCase()}.json`
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportFlow}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleSave} size="lg" className="shadow-lg shadow-primary/20">
            <Save className="h-4 w-4 mr-2" />
            Save Flow
          </Button>
        </div>
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
