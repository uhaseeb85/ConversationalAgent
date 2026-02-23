import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { parseDDL, ParsedTable } from '@/lib/ddl-parser'
import type { Question, SQLOperation } from '@/types'
import { CheckCircle2, Plus, ChevronRight } from 'lucide-react'

interface Props {
  questions: Question[]
  onApply: (questions: Question[], operations: SQLOperation[]) => void
}

export function SchemaImporter({ questions, onApply }: Props) {
  // DDL mode
  const [ddlText, setDdlText] = useState('')
  const [parsedTables, setParsedTables] = useState<ParsedTable[]>([])
  const [selectedTableIdx, setSelectedTableIdx] = useState(0)

  // ─── DDL parsing ─────────────────────────────────────────────────────────────
  const handleParseDDL = () => {
    const results = parseDDL(ddlText)
    setParsedTables(results)
    setSelectedTableIdx(0)
  }

  const selectedDDLTable = parsedTables[selectedTableIdx] ?? null

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

  return (
    <div className="space-y-6">
      {/* ─── DDL Mode ─────────────────────────────────────── */}
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
    </div>
  )
}
