import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { parseDDL, ParsedTable } from '@/lib/ddl-parser'
import { connectDB, getSchema } from '@/lib/db-api'
import type { Question, SQLOperation, SchemaTable } from '@/types'
import { generateId } from '@/lib/utils'
import { Database, FileText, CheckCircle2, AlertCircle, Loader2, Plus, ChevronRight } from 'lucide-react'

interface Props {
  questions: Question[]
  onApply: (questions: Question[], operations: SQLOperation[]) => void
}

type Mode = 'ddl' | 'live'

export function SchemaImporter({ questions, onApply }: Props) {
  const [mode, setMode] = useState<Mode>('ddl')

  // DDL mode
  const [ddlText, setDdlText] = useState('')
  const [parsedTables, setParsedTables] = useState<ParsedTable[]>([])
  const [selectedTableIdx, setSelectedTableIdx] = useState(0)

  // Live DB mode
  const [dbType, setDbType] = useState<'postgresql' | 'sqlite'>('postgresql')
  const [connString, setConnString] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connError, setConnError] = useState('')
  const [connTableNames, setConnTableNames] = useState<string[]>([])
  const [selectedLiveTable, setSelectedLiveTable] = useState('')
  const [_liveSchema, setLiveSchema] = useState<SchemaTable[]>([])
  const [liveParsed, setLiveParsed] = useState<ParsedTable | null>(null)

  // ─── DDL parsing ─────────────────────────────────────────────────────────────
  const handleParseDDL = () => {
    const results = parseDDL(ddlText)
    setParsedTables(results)
    setSelectedTableIdx(0)
  }

  const selectedDDLTable = parsedTables[selectedTableIdx] ?? null

  // ─── Live DB ─────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true)
    setConnError('')
    setConnTableNames([])
    try {
      const result = await connectDB({ type: dbType, connectionString: connString })
      if (result.ok && result.tables) {
        setConnTableNames(result.tables)
        setSelectedLiveTable(result.tables[0] ?? '')
      } else {
        setConnError(result.error ?? 'Unknown error')
      }
    } catch (err) {
      setConnError(err instanceof Error ? err.message : 'Failed to connect — is the server running?')
    } finally {
      setConnecting(false)
    }
  }

  const handleLoadLiveTable = async () => {
    if (!selectedLiveTable) return
    try {
      const result = await getSchema()
      if (!result.ok || !result.tables) return
      setLiveSchema(result.tables)

      const table = result.tables.find((t) => t.name === selectedLiveTable)
      if (!table) return

      const questions: Question[] = []
      const mappings = []
      let order = questions.length

      for (const col of table.columns) {
        if (col.isPrimaryKey) continue
        const qid = generateId()
        let qType: Question['type'] = 'text'
        const dt = col.dataType.toLowerCase()
        if (col.checkValues && col.checkValues.length > 0) qType = 'single-select'
        else if (dt.includes('bool') || dt === 'bit') qType = 'yes-no'
        else if (dt.includes('int') || dt.includes('numeric') || dt.includes('float') || dt.includes('real') || dt.includes('decimal')) qType = 'number'
        else if (dt.includes('date') || dt.includes('time')) qType = 'date'

        const label = col.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        questions.push({
          id: qid, type: qType, label,
          placeholder: `Enter ${label.toLowerCase()}`,
          required: !col.nullable,
          validationRules: col.nullable ? [] : [{ type: 'required' }],
          sqlColumnName: col.name,
          options: col.checkValues,
          order: order++,
        })
        mappings.push({ id: generateId(), questionId: qid, columnName: col.name })
      }

      const op: SQLOperation = {
        id: generateId(),
        operationType: 'INSERT',
        tableName: table.name.toUpperCase(),
        label: `Insert into ${table.name.toUpperCase()}`,
        columnMappings: mappings,
        conditions: [],
        order: 0,
      }

      setLiveParsed({ tableName: table.name, questions, suggestedOperation: op })
    } catch (err) {
      setConnError(err instanceof Error ? err.message : 'Failed to load schema')
    }
  }

  // ─── Apply ───────────────────────────────────────────────────────────────────
  const handleApplyDDL = () => {
    if (!selectedDDLTable) return
    const existingOrder = questions.length
    const reorderedQuestions = selectedDDLTable.questions.map((q, i) => ({
      ...q,
      order: existingOrder + i,
    }))
    onApply(reorderedQuestions, [selectedDDLTable.suggestedOperation])
  }

  const handleApplyLive = () => {
    if (!liveParsed) return
    const existingOrder = questions.length
    const reorderedQuestions = liveParsed.questions.map((q, i) => ({
      ...q,
      order: existingOrder + i,
    }))
    onApply(reorderedQuestions, [liveParsed.suggestedOperation])
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setMode('ddl')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mode === 'ddl' ? 'bg-primary text-primary-foreground' : 'bg-white text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Paste DDL / SQL Script
        </button>
        <button
          onClick={() => setMode('live')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            mode === 'live' ? 'bg-primary text-primary-foreground' : 'bg-white text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="h-4 w-4" />
          Live Database Connection
        </button>
      </div>

      {/* ─── DDL Mode ─────────────────────────────────────── */}
      {mode === 'ddl' && (
        <Card>
          <CardHeader>
            <CardTitle>Paste DDL Script</CardTitle>
            <CardDescription>
              Paste one or more <code>CREATE TABLE</code> statements. Questions and column mappings will be generated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={8}
              placeholder={`CREATE TABLE customers (\n  id INT PRIMARY KEY,\n  first_name VARCHAR(100) NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  plan VARCHAR(20) CHECK (plan IN ('Basic','Pro','Enterprise'))\n);`}
              value={ddlText}
              onChange={(e) => setDdlText(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleParseDDL} disabled={!ddlText.trim()}>
              Parse DDL
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            {parsedTables.length > 0 && (
              <div className="space-y-4 pt-2">
                {parsedTables.length > 1 && (
                  <div className="space-y-2">
                    <Label>Select Table ({parsedTables.length} found)</Label>
                    <Select
                      value={String(selectedTableIdx)}
                      onChange={(e) => setSelectedTableIdx(Number(e.target.value))}
                    >
                      {parsedTables.map((t, i) => (
                        <option key={t.tableName} value={i}>{t.tableName}</option>
                      ))}
                    </Select>
                  </div>
                )}

                {selectedDDLTable && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 border-b px-4 py-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        {selectedDDLTable.tableName} — {selectedDDLTable.questions.length} questions generated
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {selectedDDLTable.questions.map((q) => (
                        <div key={q.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{q.label}</span>
                            {q.required && <span className="ml-1 text-red-500">*</span>}
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{q.type}</span>
                            <span className="font-mono text-xs">{q.sqlColumnName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t bg-gray-50">
                      <Button onClick={handleApplyDDL} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Apply to Flow (adds {selectedDDLTable.questions.length} questions)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Live DB Mode ─────────────────────────────────── */}
      {mode === 'live' && (
        <Card>
          <CardHeader>
            <CardTitle>Live Database Connection</CardTitle>
            <CardDescription>
              Connect to a running database. Requires the local server to be running (<code>npm run dev</code>).
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
                      ? 'C:/path/to/database.db'
                      : 'postgresql://user:password@localhost:5432/mydb'
                  }
                  value={connString}
                  onChange={(e) => setConnString(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <Button onClick={handleConnect} disabled={connecting || !connString.trim()}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              {connecting ? 'Connecting...' : 'Connect & Test'}
            </Button>

            {connError && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{connError}</span>
              </div>
            )}

            {connTableNames.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected — {connTableNames.length} tables found
                </div>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="col-span-2 space-y-2">
                    <Label>Select Table to Import</Label>
                    <Select
                      value={selectedLiveTable}
                      onChange={(e) => { setSelectedLiveTable(e.target.value); setLiveParsed(null) }}
                    >
                      {connTableNames.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </div>
                  <Button onClick={handleLoadLiveTable} disabled={!selectedLiveTable} variant="outline">
                    Load Schema
                  </Button>
                </div>

                {liveParsed && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 border-b px-4 py-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        {liveParsed.tableName} — {liveParsed.questions.length} questions generated
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {liveParsed.questions.map((q) => (
                        <div key={q.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{q.label}</span>
                            {q.required && <span className="ml-1 text-red-500">*</span>}
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{q.type}</span>
                            <span className="font-mono text-xs">{q.sqlColumnName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t bg-gray-50">
                      <Button onClick={handleApplyLive} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Apply to Flow (adds {liveParsed.questions.length} questions)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
