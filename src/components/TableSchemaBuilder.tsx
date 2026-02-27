import { useState } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Select } from './ui/Select'
import { UserDefinedTable, UserDefinedColumn } from '@/types'
import { generateId } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react'

interface TableSchemaBuilderProps {
  readonly tables: UserDefinedTable[]
  readonly onAddTable: (table: UserDefinedTable) => void
  readonly onUpdateTable: (tableId: string, updates: Partial<UserDefinedTable>) => void
  readonly onDeleteTable: (tableId: string) => void
}

const DATA_TYPES: Array<UserDefinedColumn['dataType']> = [
  'text',
  'integer',
  'real',
  'date',
  'datetime',
  'boolean',
]

export function TableSchemaBuilder({
  tables,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
}: TableSchemaBuilderProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [editingTableName, setEditingTableName] = useState('')
  const [editingTableDesc, setEditingTableDesc] = useState('')

  const handleAddTable = () => {
    const newTable: UserDefinedTable = {
      id: generateId(),
      name: '',
      description: '',
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    onAddTable(newTable)
  }

  const toggleTableExpanded = (tableId: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId)
    } else {
      newExpanded.add(tableId)
    }
    setExpandedTables(newExpanded)
  }

  const handleAddColumn = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId)
    if (table) {
      const newColumn: UserDefinedColumn = {
        id: generateId(),
        name: '',
        dataType: 'text',
        nullable: true,
        isPrimaryKey: false,
      }
      onUpdateTable(tableId, {
        columns: [...table.columns, newColumn],
        updatedAt: new Date(),
      })
    }
  }

  const handleUpdateColumn = (
    tableId: string,
    columnId: string,
    updates: Partial<UserDefinedColumn>
  ) => {
    const table = tables.find((t) => t.id === tableId)
    if (table) {
      const newColumns = table.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      )
      onUpdateTable(tableId, {
        columns: newColumns,
        updatedAt: new Date(),
      })
    }
  }

  const handleDeleteColumn = (tableId: string, columnId: string) => {
    const table = tables.find((t) => t.id === tableId)
    if (table) {
      const newColumns = table.columns.filter((col) => col.id !== columnId)
      onUpdateTable(tableId, {
        columns: newColumns,
        updatedAt: new Date(),
      })
    }
  }

  const startEditingTable = (table: UserDefinedTable) => {
    setEditingTable(table.id)
    setEditingTableName(table.name)
    setEditingTableDesc(table.description || '')
  }

  const saveTableEdit = (tableId: string) => {
    if (!editingTableName.trim()) {
      alert('Table name is required')
      return
    }
    onUpdateTable(tableId, {
      name: editingTableName.trim(),
      description: editingTableDesc.trim() || undefined,
      updatedAt: new Date(),
    })
    setEditingTable(null)
  }

  const cancelTableEdit = () => {
    setEditingTable(null)
  }

  return (
    <div className="space-y-4">
      {tables.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground mb-4">
            No table schemas defined yet. Create your first table to get started.
          </p>
          <Button onClick={handleAddTable}>
            <Plus className="h-4 w-4 mr-2" />
            Create Table Schema
          </Button>
        </div>
      ) : (
        <>
          {tables.map((table) => {
            const isExpanded = expandedTables.has(table.id)
            const isEditing = editingTable === table.id

            return (
              <div
                key={table.id}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                {/* Table Header */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 p-4 border-b">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTableExpanded(table.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    {isEditing ? (
                      <>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editingTableName}
                            onChange={(e) => setEditingTableName(e.target.value)}
                            placeholder="Table name"
                            className="font-semibold"
                          />
                          <Input
                            value={editingTableDesc}
                            onChange={(e) => setEditingTableDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveTableEdit(table.id)}
                          className="hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelTableEdit}
                          className="hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{table.name}</div>
                          {table.description && (
                            <div className="text-sm text-muted-foreground">{table.description}</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground bg-white px-2 py-1 rounded">
                          {table.columns.length} column{table.columns.length === 1 ? '' : 's'}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingTable(table)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteTable(table.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && !isEditing && (
                  <div className="p-4 bg-white space-y-4">
                    {/* Columns List */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">Columns</Label>
                        <Button
                          onClick={() => handleAddColumn(table.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Column
                        </Button>
                      </div>

                      {table.columns.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">
                          No columns defined yet. Add columns to define this table structure.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 rounded font-semibold text-xs text-muted-foreground">
                            <div className="col-span-3">Name</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-2">Nullable</div>
                            <div className="col-span-2">Primary Key</div>
                            <div className="col-span-2">Default</div>
                            <div className="col-span-1">Action</div>
                          </div>

                          {table.columns.map((column) => (
                            <div
                              key={column.id}
                              className="grid grid-cols-12 gap-2 p-2 bg-gray-50 rounded items-center hover:bg-gray-100 transition-colors"
                            >
                              <div className="col-span-3">
                                <Input
                                  value={column.name}
                                  onChange={(e) =>
                                    handleUpdateColumn(table.id, column.id, { name: e.target.value })
                                  }
                                  placeholder="Column name"
                                  className="text-sm uppercase"
                                />
                              </div>
                              <div className="col-span-2">
                                <Select
                                  value={column.dataType}
                                  onChange={(e) =>
                                    handleUpdateColumn(table.id, column.id, {
                                      dataType: e.target.value as UserDefinedColumn['dataType'],
                                    })
                                  }
                                  className="text-sm"
                                >
                                  {DATA_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="checkbox"
                                  checked={column.nullable}
                                  onChange={(e) =>
                                    handleUpdateColumn(table.id, column.id, { nullable: e.target.checked })
                                  }
                                  className="rounded border-gray-300 h-4 w-4"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="checkbox"
                                  checked={column.isPrimaryKey}
                                  onChange={(e) =>
                                    handleUpdateColumn(table.id, column.id, {
                                      isPrimaryKey: e.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300 h-4 w-4"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={column.defaultValue || ''}
                                  onChange={(e) =>
                                    handleUpdateColumn(table.id, column.id, {
                                      defaultValue: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="NULL"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button
                                  onClick={() => handleDeleteColumn(table.id, column.id)}
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

                    {/* Column Description */}
                    {table.columns.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground">
                          <strong>Tip:</strong> Columns defined here will be available when mapping questions
                          to database columns in your SQL operations.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <Button onClick={handleAddTable} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Table
          </Button>
        </>
      )}
    </div>
  )
}

// Icon component (using the Database icon pattern from lucide-react)
function Database({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  )
}
