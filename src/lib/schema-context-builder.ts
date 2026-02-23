/**
 * schema-context-builder.ts
 * Builds a unified schema context for AI consumption by merging:
 * - Live database schema (if connected)
 * - User-defined tables
 */

import type { UserDefinedTable } from '../types'
import { getSchema, getDBStatus } from './db-api'

export interface SchemaContextTable {
  name: string
  description?: string
  columns: SchemaContextColumn[]
  source: 'database' | 'user-defined'
}

export interface SchemaContextColumn {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue?: string
  description?: string
  checkValues?: string[] // For single-select columns
}

export interface SchemaContext {
  tables: SchemaContextTable[]
  hasLiveConnection: boolean
}

/**
 * Build a unified schema context from all available sources
 */
export async function buildSchemaContext(
  userDefinedTables?: UserDefinedTable[]
): Promise<SchemaContext> {
  const tables: SchemaContextTable[] = []
  let hasLiveConnection = false

  // Try to get live DB schema
  try {
    const status = await getDBStatus()
    if (status.type) {
      hasLiveConnection = true
      const schemaResult = await getSchema()
      if (schemaResult.ok && schemaResult.tables) {
        // Convert SchemaTable to SchemaContextTable
        tables.push(
          ...schemaResult.tables.map((t) => ({
            name: t.name,
            columns: t.columns.map((c) => ({
              name: c.name,
              type: c.dataType,
              nullable: c.nullable,
              primaryKey: c.isPrimaryKey,
              checkValues: c.checkValues,
            })),
            source: 'database' as const,
          }))
        )
      }
    }
  } catch (err) {
    // No live DB connection or error fetching schema - not a fatal error
    console.warn('Could not fetch live database schema:', err)
  }

  // Add user-defined tables
  if (userDefinedTables && userDefinedTables.length > 0) {
    tables.push(
      ...userDefinedTables.map((t) => ({
        name: t.name,
        description: t.description,
        columns: t.columns.map((c) => ({
          name: c.name,
          type: c.dataType,
          nullable: c.nullable,
          primaryKey: c.isPrimaryKey,
          defaultValue: c.defaultValue,
          description: c.description,
        })),
        source: 'user-defined' as const,
      }))
    )
  }

  return {
    tables,
    hasLiveConnection,
  }
}

/**
 * Convert schema context to a JSON string for AI prompt inclusion
 */
export function schemaContextToJSON(context: SchemaContext): string {
  return JSON.stringify(context, null, 2)
}

/**
 * Generate a human-readable schema summary for display
 */
export function schemaContextToMarkdown(context: SchemaContext): string {
  if (context.tables.length === 0) {
    return '_No schema available_'
  }

  let md = `## Database Schema\n\n`
  if (context.hasLiveConnection) {
    md += `✓ Live database connection active\n\n`
  }

  context.tables.forEach((table) => {
    md += `### ${table.name}\n`
    if (table.description) {
      md += `_${table.description}_\n\n`
    }
    md += `| Column | Type | Nullable | Primary Key | Default | Check Values |\n`
    md += `|--------|------|----------|-------------|---------|-------------|\n`

    table.columns.forEach((col) => {
      const nullable = col.nullable ? 'Yes' : 'No'
      const pk = col.primaryKey ? '✓' : ''
      const def = col.defaultValue || ''
      const check = col.checkValues ? col.checkValues.join(', ') : ''
      md += `| ${col.name} | ${col.type} | ${nullable} | ${pk} | ${def} | ${check} |\n`
    })

    md += `\n`
  })

  return md
}
