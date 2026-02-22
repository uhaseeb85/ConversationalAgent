import { Pool, PoolClient } from 'pg'
import Database from 'better-sqlite3'

export type DBType = 'postgresql' | 'sqlite'

export interface SchemaColumn {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  checkValues?: string[]
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

// In-memory connection store — keyed by userId for multi-user isolation
interface UserConnection {
  type: DBType
  pgPool?: Pool
  sqliteDb?: Database.Database
}

const userConnections = new Map<string, UserConnection>()

export function getActiveType(userId: string): DBType | null {
  return userConnections.get(userId)?.type ?? null
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

export async function connectPostgres(userId: string, connectionString: string): Promise<void> {
  const existing = userConnections.get(userId)
  if (existing?.pgPool) {
    await existing.pgPool.end()
  }
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })
  const client = await pool.connect()
  await client.query('SELECT 1')
  client.release()
  userConnections.set(userId, { type: 'postgresql', pgPool: pool })
}

export async function getPostgresSchema(userId: string): Promise<SchemaTable[]> {
  const conn = userConnections.get(userId)
  if (!conn?.pgPool) throw new Error('Not connected to PostgreSQL')
  const client = await conn.pgPool.connect()
  try {
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    const tables: SchemaTable[] = []
    for (const row of tablesResult.rows) {
      const tableName: string = row.table_name
      const colsResult = await client.query(
        `
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.character_maximum_length,
          kcu.column_name AS pk_column,
          cc.check_clause
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON kcu.table_name = c.table_name
          AND kcu.column_name = c.column_name
          AND kcu.constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = c.table_name AND constraint_type = 'PRIMARY KEY'
          )
        LEFT JOIN information_schema.check_constraints cc
          ON cc.constraint_name IN (
            SELECT constraint_name FROM information_schema.constraint_column_usage
            WHERE table_name = c.table_name AND column_name = c.column_name
          )
        WHERE c.table_name = $1 AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `,
        [tableName]
      )
      const columns: SchemaColumn[] = colsResult.rows.map((col) => {
        let checkValues: string[] | undefined
        if (col.check_clause) {
          const match = /IN\s*\(([^)]+)\)/i.exec(col.check_clause)
          if (match) {
            checkValues = match[1].split(',').map((v: string) => v.trim().replace(/^'|'$/g, ''))
          }
        }
        return {
          name: col.column_name,
          dataType: col.data_type,
          nullable: col.is_nullable === 'YES',
          isPrimaryKey: !!col.pk_column,
          checkValues,
        }
      })
      tables.push({ name: tableName, columns })
    }
    return tables
  } finally {
    client.release()
  }
}

export async function executePostgresSQL(
  userId: string,
  statements: string[]
): Promise<{ statement: string; rowsAffected: number; success: boolean; error?: string }[]> {
  const conn = userConnections.get(userId)
  if (!conn?.pgPool) throw new Error('Not connected to PostgreSQL')
  const client: PoolClient = await conn.pgPool.connect()
  const results: { statement: string; rowsAffected: number; success: boolean; error?: string }[] = []
  try {
    await client.query('BEGIN')
    for (const stmt of statements) {
      const trimmed = stmt.trim()
      if (!trimmed) continue
      try {
        const result = await client.query(trimmed)
        results.push({ statement: trimmed, rowsAffected: result.rowCount ?? 0, success: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ statement: trimmed, rowsAffected: 0, success: false, error: message })
        throw err
      }
    }
    await client.query('COMMIT')
    return results
  } catch {
    await client.query('ROLLBACK')
    return results
  } finally {
    client.release()
  }
}

// ─── SQLite ───────────────────────────────────────────────────────────────────

export function connectSQLite(userId: string, filePath: string): void {
  const existing = userConnections.get(userId)
  if (existing?.sqliteDb) existing.sqliteDb.close()
  const db = new Database(filePath)
  userConnections.set(userId, { type: 'sqlite', sqliteDb: db })
}

export function getSQLiteSchema(userId: string): SchemaTable[] {
  const conn = userConnections.get(userId)
  if (!conn?.sqliteDb) throw new Error('Not connected to SQLite')
  const db = conn.sqliteDb
  const tableRows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as { name: string }[]
  const tables: SchemaTable[] = []
  for (const { name } of tableRows) {
    const pragma = db.pragma(`table_info(${name})`) as {
      name: string; type: string; notnull: number; pk: number
    }[]
    const columns: SchemaColumn[] = pragma.map((col) => ({
      name: col.name,
      dataType: col.type || 'TEXT',
      nullable: col.notnull === 0,
      isPrimaryKey: col.pk > 0,
    }))
    tables.push({ name, columns })
  }
  return tables
}

export function executeSQLiteSQL(
  userId: string,
  statements: string[]
): { statement: string; rowsAffected: number; success: boolean; error?: string }[] {
  const conn = userConnections.get(userId)
  if (!conn?.sqliteDb) throw new Error('Not connected to SQLite')
  const db = conn.sqliteDb
  const results: { statement: string; rowsAffected: number; success: boolean; error?: string }[] = []
  const transaction = db.transaction(() => {
    for (const stmt of statements) {
      const trimmed = stmt.trim()
      if (!trimmed) continue
      try {
        const info = db.prepare(trimmed).run()
        results.push({ statement: trimmed, rowsAffected: info.changes, success: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ statement: trimmed, rowsAffected: 0, success: false, error: message })
        throw err
      }
    }
  })
  try {
    transaction()
  } catch {
    // Rolled back automatically
  }
  return results
}

export async function disconnectUser(userId: string): Promise<void> {
  const conn = userConnections.get(userId)
  if (!conn) return
  if (conn.pgPool) await conn.pgPool.end()
  if (conn.sqliteDb) conn.sqliteDb.close()
  userConnections.delete(userId)
}
