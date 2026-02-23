import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { loadAIConfig, saveAIConfig, chatCompletion, fetchOpenRouterModels, AI_PROVIDERS, type AIModel } from '@/lib/ai-client'
import { connectDB, loadDBConfig, saveDBConfig, clearDBConfig, getDemoDB } from '@/lib/db-api'
import { Settings, Bot, Database, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'

export function SettingsPage() {
  // AI settings
  const [aiConfig, setAiConfig] = useState(loadAIConfig)
  const [testingAI, setTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  const [aiModels, setAiModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')

  // DB settings (persisted in localStorage)
  const [dbType, setDbType] = useState<'postgresql' | 'sqlite'>('postgresql')
  const [connString, setConnString] = useState('')
  const [testingDB, setTestingDB] = useState(false)
  const [dbTestResult, setDbTestResult] = useState<{ ok: boolean; message: string; tables?: string[] } | null>(null)
  const [dbConnected, setDbConnected] = useState(false)
  const [autoConnectDemo, setAutoConnectDemo] = useState(false)

  // Load DB config from localStorage on mount, or auto-load demo database
  useEffect(() => {
    const savedConfig = loadDBConfig()
    if (savedConfig) {
      setDbType(savedConfig.type)
      setConnString(savedConfig.connectionString)
      setDbConnected(true)
    } else {
      // Auto-load demo database if no saved configuration
      const demoConfig = getDemoDB()
      setDbType(demoConfig.type)
      setConnString(demoConfig.connectionString)
      setAutoConnectDemo(true)
    }
  }, [])

  const handleSelectProvider = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId)
    if (!provider) return

    setSelectedProvider(providerId)
    setAiConfig({
      ...aiConfig,
      baseUrl: provider.baseUrl,
      apiKey: provider.defaultApiKey,
      model: provider.defaultModel,
    })
    setAiModels([]) // Clear models when provider changes
    setModelsError(null)
  }

  const handleSaveAI = () => {
    saveAIConfig(aiConfig)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2000)
  }

  const handleLoadModels = async () => {
    if (!aiConfig.apiKey) {
      setModelsError('Please enter API key first')
      return
    }
    
    const isOpenRouter = aiConfig.baseUrl.includes('openrouter.ai')
    if (!isOpenRouter) {
      setModelsError('Model fetching only works with OpenRouter. For LM Studio, manually enter model names from the Models panel.')
      return
    }

    setLoadingModels(true)
    setModelsError(null)
    try {
      const models = await fetchOpenRouterModels(aiConfig.apiKey)
      if (models.length === 0) {
        setModelsError('No models found. Check your API key.')
      } else {
        setAiModels(models)
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Failed to fetch models')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleTestAI = async () => {
    setTestingAI(true)
    setAiTestResult(null)
    try {
      const resp = await chatCompletion(
        [{ role: 'user', content: 'Reply with exactly: CONNECTED' }],
        { ...aiConfig, enabled: true }
      )
      setAiTestResult({ ok: true, message: `Connected! Response: "${resp.trim()}"` })
    } catch (err) {
      setAiTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      })
    } finally {
      setTestingAI(false)
    }
  }

  const handleTestDB = async () => {
    setTestingDB(true)
    setDbTestResult(null)
    try {
      const result = await connectDB({ type: dbType, connectionString: connString })
      if (result.ok) {
        setDbTestResult({
          ok: true,
          message: `Connected! Found ${result.tables?.length ?? 0} tables.`,
          tables: result.tables,
        })
        // Persist connection config to localStorage
        saveDBConfig({
          type: dbType,
          connectionString: connString,
          label: `${dbType} connection`,
        })
        setDbConnected(true)
      } else {
        setDbTestResult({ ok: false, message: result.error ?? 'Connection failed' })
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Server not reachable. Make sure backend is running (npm run dev).'
      setDbTestResult({
        ok: false,
        message: errorMsg,
      })
    } finally {
      setTestingDB(false)
    }
  }

  // Auto-connect to demo database if flagged
  useEffect(() => {
    if (autoConnectDemo && connString) {
      setAutoConnectDemo(false)
      setTimeout(() => {
        handleTestDB()
      }, 500)
    }
  }, [autoConnectDemo, connString])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
          <Settings className="h-9 w-9 text-indigo-600" />
          App Settings
        </h1>
        <p className="text-muted-foreground">Configure AI and database connections for your flows.</p>
      </div>

      {/* ─── AI Configuration ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Configuration
          </CardTitle>
          <CardDescription>
            Connect to OpenRouter (<code>https://openrouter.ai/api/v1</code>) or LM Studio (<code>http://localhost:1234/v1</code>) to enable the AI conversation layer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">AI Conversation Layer</p>
              <p className="text-xs text-muted-foreground">Enable AI-powered natural conversation during onboarding</p>
            </div>
            <button
              role="switch"
              aria-checked={aiConfig.enabled}
              onClick={() => setAiConfig({ ...aiConfig, enabled: !aiConfig.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                aiConfig.enabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label>AI Provider</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AI_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    selectedProvider === provider.id || aiConfig.baseUrl === provider.baseUrl
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  title={provider.description}
                >
                  <span className="text-sm">{provider.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 opacity-70">{provider.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              placeholder="http://localhost:1234/v1"
              value={aiConfig.baseUrl}
              onChange={(e) => {
                setAiConfig({ ...aiConfig, baseUrl: e.target.value })
                setSelectedProvider('') // Clear provider selection when manually edited
              }}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Custom base URL or use provider presets above
            </p>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-... or lmstudio"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                className="font-mono text-sm pr-10"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">For LM Studio use <code>lmstudio</code>. For OpenRouter use your API key.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              {aiConfig.baseUrl.includes('openrouter.ai') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLoadModels}
                  disabled={loadingModels || !aiConfig.apiKey}
                  className="text-xs h-6 gap-1"
                >
                  {loadingModels ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Load Models
                </Button>
              )}
            </div>
            
            {aiModels.length > 0 ? (
              <Select
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              >
                <option value="">Select a model...</option>
                {aiModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                placeholder="e.g. gpt-4o-mini or local-model"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              />
            )}
            
            {modelsError && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">{modelsError}</p>
            )}
            
            {aiModels.length > 0 && (
              <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded p-2">
                ✓ {aiModels.length} models available
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              OpenRouter: Click "Load Models" to see available models. LM Studio: manually enter model names from the Models panel.
            </p>
          </div>

          {aiTestResult && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${aiTestResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {aiTestResult.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <span>{aiTestResult.message}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveAI} variant={aiSaved ? 'default' : 'outline'}>
              {aiSaved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Saved!</> : 'Save Settings'}
            </Button>
            <Button onClick={handleTestAI} disabled={testingAI || !aiConfig.baseUrl} variant="outline">
              {testingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Database Connection ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Connection
          </CardTitle>
          <CardDescription>
            Connect to a database to enable live schema import and SQL execution. Your connection is saved in browser storage and will persist across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dbConnected && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-800 font-medium">Connection saved and will be restored on next visit</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Database Type</Label>
              <Select value={dbType} onChange={(e) => {
                setDbType(e.target.value as 'postgresql' | 'sqlite')
                setDbConnected(false)
                setDbTestResult(null)
              }}>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{dbType === 'sqlite' ? 'File Path' : 'Connection String'}</Label>
              <Input
                placeholder={
                  dbType === 'sqlite'
                    ? 'C:/path/to/mydb.db'
                    : 'postgresql://user:password@localhost:5432/mydb'
                }
                value={connString}
                onChange={(e) => {
                  setConnString(e.target.value)
                  setDbConnected(false)
                  setDbTestResult(null)
                }}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTestDB} disabled={testingDB || !connString.trim()}>
              {testingDB ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Connect & Test
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const demoConfig = getDemoDB()
                setDbType(demoConfig.type)
                setConnString(demoConfig.connectionString)
                setDbConnected(false)
                setDbTestResult(null)
              }}
            >
              Load Demo Database
            </Button>
            {dbConnected && (
              <Button
                onClick={() => {
                  clearDBConfig()
                  setDbConnected(false)
                  setDbTestResult(null)
                  setConnString('')
                  setDbType('postgresql')
                }}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Connection
              </Button>
            )}
          </div>

          {dbTestResult && (
            <div className={`text-sm rounded-lg p-3 ${dbTestResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {dbTestResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="font-medium">{dbTestResult.message}</span>
              </div>
              {dbTestResult.tables && dbTestResult.tables.length > 0 && (
                <div className="pl-6 mt-2">
                  <p className="text-xs font-medium mb-1">Tables:</p>
                  <div className="flex flex-wrap gap-1">
                    {dbTestResult.tables.map((t) => (
                      <span key={t} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-1">
            Connection settings are securely stored in your browser's local storage. The backend proxies these connections for live schema import and SQL execution. Passwords are stored locally only for convenience; never share your browser data with others.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
