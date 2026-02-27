import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'
import { Question, QuestionType, UserDefinedTable } from '@/types'
import { generateId } from '@/lib/utils'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface QuestionBuilderProps {
  readonly questions: Question[]
  readonly userDefinedTables?: UserDefinedTable[]
  readonly onAddQuestion: (question: Question) => void
  readonly onUpdateQuestion: (questionId: string, updates: Partial<Question>) => void
  readonly onDeleteQuestion: (questionId: string) => void
  readonly onReorderQuestions: (questions: Question[]) => void
}

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'single-select', label: 'Single Select' },
  { value: 'multi-select', label: 'Multi Select' },
  { value: 'yes-no', label: 'Yes/No' },
]

function SortableQuestionItem({
  question,
  index,
  allQuestions,
  userDefinedTables,
  onUpdate,
  onDelete,
}: {
  question: Question
  index: number
  allQuestions: Question[]
  userDefinedTables?: UserDefinedTable[]
  onUpdate: (questionId: string, updates: Partial<Question>) => void
  onDelete: (questionId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const selectedTable = question.tableName && userDefinedTables
    ? userDefinedTables.find((t) => t.name === question.tableName)
    : null

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <div className="border rounded-lg bg-white shadow-sm">
        <div className="flex items-center p-4 space-x-3 bg-muted/30 rounded-t-lg">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{question.label || `Question ${index + 1}`}</div>
            <div className="text-sm text-muted-foreground">
              {questionTypes.find((t) => t.value === question.type)?.label} →{' '}
              {selectedTable ? `${selectedTable.name}.${question.sqlColumnName}` : question.sqlColumnName}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(question.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Label *</Label>
                <Input
                  value={question.label}
                  onChange={(e) => onUpdate(question.id, { label: e.target.value })}
                  placeholder="e.g., What's your email?"
                />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={question.type}
                  onChange={(e) =>
                    onUpdate(question.id, { type: e.target.value as QuestionType })
                  }
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Table and Column Selection */}
            {userDefinedTables && userDefinedTables.length > 0 && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-3">
                <div className="text-xs font-semibold text-blue-900">Database Column Mapping</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Select Table (optional)</Label>
                    <Select
                      value={question.tableName || ''}
                      onChange={(e) => {
                        const tableName = e.target.value
                        if (tableName) {
                          // Auto-select first column if available
                          const table = userDefinedTables.find((t) => t.name === tableName)
                          if (table && table.columns.length > 0) {
                            onUpdate(question.id, {
                              tableName: tableName,
                              sqlColumnName: table.columns[0].name,
                            })
                          } else {
                            onUpdate(question.id, { tableName: tableName, sqlColumnName: '' })
                          }
                        } else {
                          onUpdate(question.id, { tableName: undefined })
                        }
                      }}
                    >
                      <option value="">No specific table</option>
                      {userDefinedTables.map((table) => (
                        <option key={table.id} value={table.name}>
                          {table.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Select Column *</Label>
                    {selectedTable ? (
                      <Select
                        value={question.sqlColumnName}
                        onChange={(e) => onUpdate(question.id, { sqlColumnName: e.target.value })}
                      >
                        <option value="">Choose a column...</option>
                        {selectedTable.columns.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name} ({col.dataType})
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={question.sqlColumnName}
                        onChange={(e) => onUpdate(question.id, { sqlColumnName: e.target.value })}
                        placeholder="e.g., email_address"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Standard column input when no tables defined */}
            {(!userDefinedTables || userDefinedTables.length === 0) && (
              <div className="space-y-2">
                <Label>SQL Column Name *</Label>
                <Input
                  value={question.sqlColumnName}
                  onChange={(e) => onUpdate(question.id, { sqlColumnName: e.target.value })}
                  placeholder="e.g., email_address"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={question.placeholder || ''}
                onChange={(e) => onUpdate(question.id, { placeholder: e.target.value })}
                placeholder="Placeholder text..."
              />
            </div>

            {(question.type === 'single-select' || question.type === 'multi-select') && (
              <div className="space-y-2">
                <Label>Options (comma-separated) *</Label>
                <Textarea
                  value={question.options?.join(', ') || ''}
                  onChange={(e) =>
                    onUpdate(question.id, {
                      options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                  rows={2}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`required-${question.id}`}
                checked={question.required}
                onChange={(e) => onUpdate(question.id, { required: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`required-${question.id}`} className="cursor-pointer">
                Required
              </Label>
            </div>

            {allQuestions.length > 1 && (
              <div className="border-t pt-4 mt-4">
                <Label className="mb-2 block">Conditional Logic (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={question.conditionalLogic?.questionId || ''}
                    onChange={(e) =>
                      onUpdate(question.id, {
                        conditionalLogic: e.target.value
                          ? {
                              questionId: e.target.value,
                              operator: 'equals',
                              value: '',
                            }
                          : undefined,
                      })
                    }
                  >
                    <option value="">No condition</option>
                    {allQuestions
                      .filter((q) => q.id !== question.id && q.order < question.order)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          Show if: {q.label}
                        </option>
                      ))}
                  </Select>

                  {question.conditionalLogic && (
                    <>
                      <Select
                        value={question.conditionalLogic.operator}
                        onChange={(e) =>
                          onUpdate(question.id, {
                            conditionalLogic: {
                              ...question.conditionalLogic!,
                              operator: e.target.value as any,
                            },
                          })
                        }
                      >
                        <option value="equals">equals</option>
                        <option value="not-equals">not equals</option>
                        <option value="contains">contains</option>
                      </Select>

                      <Input
                        value={String(question.conditionalLogic.value)}
                        onChange={(e) =>
                          onUpdate(question.id, {
                            conditionalLogic: {
                              ...question.conditionalLogic!,
                              value: e.target.value,
                            },
                          })
                        }
                        placeholder="value"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function QuestionBuilder({
  questions,
  userDefinedTables,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: QuestionBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
        ...q,
        order: idx,
      }))
      onReorderQuestions(reordered)
    }
  }

  const handleAddNewQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      type: 'text',
      label: '',
      required: false,
      validationRules: [],
      sqlColumnName: '',
      order: questions.length,
    }
    onAddQuestion(newQuestion)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions</CardTitle>
        <CardDescription>
          Add and configure questions for your onboarding flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No questions yet. Add your first question.</p>
            <Button onClick={handleAddNewQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {questions.map((question, index) => (
                  <SortableQuestionItem
                    key={question.id}
                    question={question}
                    index={index}
                    allQuestions={questions}
                    userDefinedTables={userDefinedTables}
                    onUpdate={onUpdateQuestion}
                    onDelete={onDeleteQuestion}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Button onClick={handleAddNewQuestion} variant="outline" className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Question
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
