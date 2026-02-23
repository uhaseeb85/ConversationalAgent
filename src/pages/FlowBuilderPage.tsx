import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { QuestionBuilder } from '@/components/QuestionBuilder'
import { SchemaImporter } from '@/components/SchemaImporter'
import { TableSchemaBuilder } from '@/components/TableSchemaBuilder'
import { Question, SQLOperation, UserDefinedTable, SchemaTable } from '@/types'
import { generateId } from '@/lib/utils'
import { Save, ArrowLeft, Database, HelpCircle, Import, CheckCircle2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { loadDBConfig, getSchema, connectDB, saveDBConfig, clearDBConfig } from '@/lib/db-api'

type Tab = 'details' | 'schema' | 'questions' | 'import'

export function FlowBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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
  
  // Live database connection state
  const [liveDatabaseTables, setLiveDatabaseTables] = useState<SchemaTable[]>([])
  const [loadingLiveTables, setLoadingLiveTables] = useState(false)
  const [dbConnectionName, setDbConnectionName] = useState<string | null>(null)
  
  // Database connection form state
  const [dbType, setDbType] = useState<'postgresql' | 'sqlite'>('postgresql')
  const [connString, setConnString] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connError, setConnError] = useState('')

  // Load live database tables on mount
  useEffect(() => {
    const loadLiveDatabaseSchema = async () => {
      const savedConfig = loadDBConfig()
      if (!savedConfig) return

      setLoadingLiveTables(true)
      setDbConnectionName(savedConfig.label || `${savedConfig.type} database`)
      try {
        const result = await getSchema()
        if (result.ok && result.tables) {
          setLiveDatabaseTables(result.tables)
        }
      } catch (error) {
        console.error('Failed to load live database schema:', error)
      } finally {
        setLoadingLiveTables(false)
      }
    }

    loadLiveDatabaseSchema()
  }, [])

  // Load flow data
  useEffect(() => {
    if (id) {
      const flow = flows.find((f) => f.id === id)
      if (flow) {
        // Check if user can edit this flow
        if (user && user.role !== 'admin' && flow.createdBy !== user.id) {
          alert('You do not have permission to edit this flow')
          navigate('/')
          return
        }
        
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
  }, [id, flows, user, navigate])

  const validateFlowData = (): boolean => {
    if (!name.trim() || questions.length === 0) {
      alert('Please fill in all required fields and add at least one question')
      return false
    }

    return true
  }

  const handleSave = () => {
    if (!validateFlowData()) return

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
      createdAt: id ? flows.find((f) => f.id === id)!.createdAt : new Date(),
      updatedAt: new Date(),
      isActive,
    }

    if (id) {
      updateFlow(id, flowData)
    } else {
      addFlow(flowData)
    }

    navigate('/')
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
          {/* Database Connection Form */}
          {!dbConnectionName && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Connect to Live Database
                </CardTitle>
                <CardDescription>
                  Connect to a running database to automatically load table schemas. Requires the local server to be running.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Database Type</Label>
                    <Select value={dbType} onChange={(e) => setDbType(e.target.value as 'postgresql' | 'sqlite')}>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="sqlite">SQLite</option>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>
                      {dbType === 'sqlite' ? 'File Path' : 'Connection String'}
                    </Label>
                    <Input
                      placeholder={
                        dbType === 'sqlite'
                          ? './demo/company-onboarding.db'
                          : 'postgresql://user:password@localhost:5432/mydb'
                      }
                      value={connString}
                      onChange={(e) => setConnString(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <Button 
                  onClick={async () => {
                    setConnecting(true)
                    setConnError('')
                    try {
                      const result = await connectDB({ type: dbType, connectionString: connString })
                      if (result.ok && result.tables) {
                        // Save connection config
                        const label = `${dbType} database`
                        saveDBConfig({ type: dbType, connectionString: connString, label })
                        setDbConnectionName(label)
                        
                        // Load schema
                        const schemaResult = await getSchema()
                        if (schemaResult.ok && schemaResult.tables) {
                          setLiveDatabaseTables(schemaResult.tables)
                        }
                      } else {
                        setConnError(result.error ?? 'Connection failed')
                      }
                    } catch (err) {
                      setConnError(err instanceof Error ? err.message : 'Failed to connect — is the server running?')
                    } finally {
                      setConnecting(false)
                    }
                  }}
                  disabled={connecting || !connString.trim()}
                >
                  {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  {connecting ? 'Connecting...' : 'Connect & Load Schema'}
                </Button>

                {connError && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{connError}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Live Database Tables */}
          {dbConnectionName && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Live Database Connection
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Connected to <strong>{dbConnectionName}</strong>. These tables are available for SQL Operations (next tab).
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      clearDBConfig()
                      setDbConnectionName(null)
                      setLiveDatabaseTables([])
                      setConnString('')
                    }}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Disconnect
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLiveTables ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Loading database schema...
                  </div>
                ) : liveDatabaseTables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No tables found in connected database</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium">
                        Found {liveDatabaseTables.length} table{liveDatabaseTables.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setLoadingLiveTables(true)
                          try {
                            const result = await getSchema()
                            if (result.ok && result.tables) {
                              setLiveDatabaseTables(result.tables)
                            }
                          } catch (error) {
                            console.error('Failed to reload schema:', error)
                          } finally {
                            setLoadingLiveTables(false)
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {liveDatabaseTables.map((table) => (
                        <div
                          key={table.name}
                          className="border border-green-300 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-mono font-semibold text-sm text-green-700">
                              {table.name}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {table.columns.length} column{table.columns.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {table.columns.slice(0, 5).map((col) => (
                              <div
                                key={col.name}
                                className="text-xs text-muted-foreground font-mono flex items-center gap-2"
                              >
                                <span className="text-green-600">•</span>
                                <span className="font-medium">{col.name}</span>
                                <span className="text-gray-400">({col.dataType})</span>
                                {col.isPrimaryKey && (
                                  <span className="text-blue-600 text-[10px] uppercase">PK</span>
                                )}
                              </div>
                            ))}
                            {table.columns.length > 5 && (
                              <div className="text-xs text-muted-foreground italic">
                                + {table.columns.length - 5} more column{table.columns.length - 5 !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>💡 Tip:</strong> These tables are ready to use in the <strong>SQL Operations</strong> tab. Table and column names will autocomplete when creating INSERT, UPDATE, or DELETE operations.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
