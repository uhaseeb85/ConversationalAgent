import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { loadAIConfig, saveAIConfig, chatCompletion, fetchOpenRouterModels, AI_PROVIDERS, type AIModel } from '@/lib/ai-client'
import { useStore } from '@/lib/store'
import { Settings, Bot, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, RefreshCw, Download, Upload, Trash2, Database } from 'lucide-react'

export function SettingsPage() {
  // Store
  const flows = useStore((s) => s.flows)
  const submissions = useStore((s) => s.submissions)
  const setFlows = useStore((s) => s.setFlows)
  const setSubmissions = useStore((s) => s.setSubmissions)

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

      {/* ─── Data Management ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export, import, or clear all locally stored data (flows &amp; submissions).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <Card className="p-4">
              <div className="text-2xl font-bold">{flows.length}</div>
              <div className="text-sm text-muted-foreground">Flows</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{submissions.length}</div>
              <div className="text-sm text-muted-foreground">Submissions</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">
                {(() => {
                  const bytes = (localStorage.getItem('ca_flows')?.length ?? 0) + (localStorage.getItem('ca_submissions')?.length ?? 0)
                  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
                })()}
              </div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                const data = { flows, submissions, exportedAt: new Date().toISOString() }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `conversational-agent-backup-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.json'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string)
                      if (!Array.isArray(data.flows) || !Array.isArray(data.submissions)) {
                        alert('Invalid backup file: missing flows or submissions arrays.')
                        return
                      }
                      if (!confirm(`Import ${data.flows.length} flows and ${data.submissions.length} submissions? This will REPLACE all existing data.`)) return
                      setFlows(data.flows)
                      setSubmissions(data.submissions)
                      localStorage.setItem('ca_flows', JSON.stringify(data.flows))
                      localStorage.setItem('ca_submissions', JSON.stringify(data.submissions))
                      alert('Data imported successfully!')
                    } catch {
                      alert('Invalid JSON file.')
                    }
                  }
                  reader.readAsText(file)
                }
                input.click()
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import All Data
            </Button>

            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                if (!confirm('Are you sure? This will delete ALL flows and submissions permanently.')) return
                if (!confirm('This action CANNOT be undone. Continue?')) return
                setFlows([])
                setSubmissions([])
                localStorage.removeItem('ca_flows')
                localStorage.removeItem('ca_submissions')
                alert('All data cleared.')
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
