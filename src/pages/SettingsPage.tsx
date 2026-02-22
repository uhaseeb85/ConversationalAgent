import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { loadAIConfig, saveAIConfig, chatCompletion, fetchOpenRouterModels, AI_PROVIDERS, type AIModel } from '@/lib/ai-client'
import { connectDB } from '@/lib/db-api'
import { Settings, Bot, Database, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, KeyRound, AlertTriangle, RefreshCw } from 'lucide-react'

export function SettingsPage() {
  const { user, setUser } = useAuth()
  const location = useLocation()
  const forcedChange = !!(location.state as { mustChangePassword?: boolean } | null)?.mustChangePassword
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

  // Change password
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpResult, setCpResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showCpCurrent, setShowCpCurrent] = useState(false)
  const [showCpNew, setShowCpNew] = useState(false)

  const handleChangePassword = async () => {
    setCpResult(null)
    if (cpNew.length < 8) {
      setCpResult({ ok: false, message: 'New password must be at least 8 characters' })
      return
    }
    if (cpNew !== cpConfirm) {
      setCpResult({ ok: false, message: 'New passwords do not match' })
      return
    }
    setCpLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCpResult({ ok: true, message: 'Password updated successfully!' })
      setCpCurrent('')
      setCpNew('')
      setCpConfirm('')
      // Clear mustChangePassword flag in local auth context
      if (user) setUser({ ...user, mustChangePassword: false })
    } catch (err) {
      setCpResult({ ok: false, message: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setCpLoading(false)
    }
  }

  // DB settings (session only)
  const [dbType, setDbType] = useState<'postgresql' | 'sqlite'>('postgresql')
  const [connString, setConnString] = useState('')
  const [testingDB, setTestingDB] = useState(false)
  const [dbTestResult, setDbTestResult] = useState<{ ok: boolean; message: string; tables?: string[] } | null>(null)

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
        // Persist session connection config (no password goes to localStorage)
        sessionStorage.setItem(
          'db_connection',
          JSON.stringify({ type: dbType, connectionString: connString, label: `${dbType} connection` })
        )
      } else {
        setDbTestResult({ ok: false, message: result.error ?? 'Connection failed' })
      }
    } catch (err) {
      setDbTestResult({
        ok: false,
        message: 'Server not reachable. Make sure backend is running (npm run dev).',
      })
    } finally {
      setTestingDB(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
          <Settings className="h-9 w-9 text-indigo-600" />
          Settings
        </h1>
        <p className="text-muted-foreground">Configure AI and database connections for your flows.</p>
      </div>

      {/* Temp-password notice */}
      {forcedChange && (
        <div className="flex items-start gap-3 mb-6 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Temporary password in use</p>
            <p className="text-xs mt-0.5">An admin has set a temporary password for your account. Please choose a new password below before continuing.</p>
          </div>
        </div>
      )}

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
                onChange={(value) => setAiConfig({ ...aiConfig, model: value })}
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

      {/* ─── Change Password ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password. You'll need to enter your current password to confirm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Current password</Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={showCpCurrent ? 'text' : 'password'}
                placeholder="Current password"
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowCpCurrent(!showCpCurrent)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showCpCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-new">New password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showCpNew ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowCpNew(!showCpNew)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showCpNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              type="password"
              placeholder="Repeat new password"
              value={cpConfirm}
              onChange={(e) => setCpConfirm(e.target.value)}
            />
          </div>

          {cpResult && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
              cpResult.ok
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {cpResult.ok
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <span>{cpResult.message}</span>
            </div>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
          >
            {cpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Update password
          </Button>
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
            Connect to a database to enable live schema import and SQL execution. Connection is stored in session memory only — passwords are cleared when the browser tab closes.
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
              <Label>{dbType === 'sqlite' ? 'File Path' : 'Connection String'}</Label>
              <Input
                placeholder={
                  dbType === 'sqlite'
                    ? 'C:/path/to/mydb.db'
                    : 'postgresql://user:password@localhost:5432/mydb'
                }
                value={connString}
                onChange={(e) => setConnString(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <Button onClick={handleTestDB} disabled={testingDB || !connString.trim()}>
            {testingDB ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Connect & Test
          </Button>

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
            The local backend server (<code>npm run dev</code>) proxies these connections. Your credentials are not stored in the browser beyond this session.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
