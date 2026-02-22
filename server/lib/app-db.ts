/**
 * app-db.ts — Application database adapter
 * Supports SQLite (default) or PostgreSQL via APP_DB_TYPE env var.
 * This stores USERS, FLOWS, SUBMISSIONS, EXECUTION_HISTORY — NOT the user's target DB.
 */

import Database from 'better-sqlite3'
import { Pool } from 'pg'
import path from 'path'
import crypto from 'crypto'

const DB_TYPE = (process.env.APP_DB_TYPE || 'sqlite') as 'sqlite' | 'postgresql'

// ─── SQLite adapter ──────────────────────────────────────────────────────────
let sqliteDb: Database.Database | null = null

function getSqlite(): Database.Database {
  if (!sqliteDb) {
    const dbPath = process.env.APP_DB_PATH
      ? path.resolve(process.env.APP_DB_PATH)
      : path.resolve('./app.db')
    sqliteDb = new Database(dbPath)
    sqliteDb.pragma('journal_mode = WAL')
    sqliteDb.pragma('busy_timeout = 5000')   // wait up to 5s on a locked write before erroring
    sqliteDb.pragma('foreign_keys = ON')
  }
  return sqliteDb
}

// ─── PostgreSQL adapter ───────────────────────────────────────────────────────
let pgPool: Pool | null = null

function getPg(): Pool {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: process.env.APP_DATABASE_URL })
  }
  return pgPool
}

// ─── Unified query interface ─────────────────────────────────────────────────
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (DB_TYPE === 'postgresql') {
    const result = await getPg().query(sql, params)
    return result.rows as T[]
  } else {
    const db = getSqlite()
    const trimmed = sql.trim().toUpperCase()
    if (
      trimmed.startsWith('INSERT') ||
      trimmed.startsWith('UPDATE') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('CREATE') ||
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('ALTER')
    ) {
      // For SQLite, convert $1 style params to ? style
      const converted = sql.replace(/\$\d+/g, '?')
      db.prepare(converted).run(...params)
      return []
    } else {
      const converted = sql.replace(/\$\d+/g, '?')
      return db.prepare(converted).all(...params) as T[]
    }
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

// ─── INSERT with RETURNING id support ────────────────────────────────────────
export async function insert(sql: string, params: unknown[] = []): Promise<string> {
  if (DB_TYPE === 'postgresql') {
    const sqlWithReturning = sql.includes('RETURNING') ? sql : sql + ' RETURNING id'
    const result = await getPg().query(sqlWithReturning, params)
    return String(result.rows[0]?.id ?? '')
  } else {
    const db = getSqlite()
    const converted = sql.replace(/\$\d+/g, '?')
    // Remove RETURNING clause for SQLite
    const cleanSql = converted.replace(/\s+RETURNING\s+\S+/i, '')
    const info = db.prepare(cleanSql).run(...params)
    return String(info.lastInsertRowid)
  }
}

// ─── Schema initialisation ───────────────────────────────────────────────────
export async function initSchema(): Promise<void> {
  const isPostgres = DB_TYPE === 'postgresql'

  const autoId = isPostgres
    ? 'id TEXT PRIMARY KEY DEFAULT gen_random_uuid()'
    : "id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))"

  const now = isPostgres ? 'NOW()' : "datetime('now')"
  const textDefault = (val: string) =>
    isPostgres ? `TEXT NOT NULL DEFAULT '${val}'` : `TEXT NOT NULL DEFAULT '${val}'`

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      ${autoId},
      email       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name        TEXT NOT NULL DEFAULT '',
      role        ${textDefault('user')},
      is_active   INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (${now}),
      last_login_at TEXT
    )
  `)

  // Migration: add must_change_password for existing databases
  try {
    await query('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0')
  } catch { /* column already exists — safe to ignore */ }

  await query(`
    CREATE TABLE IF NOT EXISTS flows (
      ${autoId},
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      table_name    TEXT NOT NULL DEFAULT '',
      welcome_message TEXT,
      completion_message TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      questions     TEXT NOT NULL DEFAULT '[]',
      sql_operations TEXT NOT NULL DEFAULT '[]',
      schema_context TEXT,
      created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at    TEXT NOT NULL DEFAULT (${now}),
      updated_at    TEXT NOT NULL DEFAULT (${now})
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS submissions (
      ${autoId},
      flow_id       TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
      flow_name     TEXT NOT NULL,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      responses     TEXT NOT NULL DEFAULT '[]',
      generated_sql TEXT,
      status        ${textDefault('pending')},
      started_at    TEXT NOT NULL,
      completed_at  TEXT NOT NULL,
      executed_at   TEXT
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS execution_history (
      ${autoId},
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      statement     TEXT NOT NULL,
      success       INTEGER NOT NULL DEFAULT 0,
      rows_affected INTEGER,
      error_message TEXT,
      executed_at   TEXT NOT NULL DEFAULT (${now})
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      ${autoId},
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (${now})
    )
  `)

  console.log(`[app-db] Schema initialised (${DB_TYPE})`)
}

// ─── Seed first admin ────────────────────────────────────────────────────────
export async function seedAdminIfNeeded(hashedPassword: string): Promise<void> {
  const email = process.env.FIRST_ADMIN_EMAIL
  if (!email) return

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) return

  const name = process.env.FIRST_ADMIN_NAME || 'Admin'

  if (DB_TYPE === 'postgresql') {
    await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')`,
      [email, hashedPassword, name]
    )
  } else {
    const db = getSqlite()
    const id = crypto.randomBytes(16).toString('hex')
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, 'admin')`
    ).run(id, email, hashedPassword, name)
  }

  console.log(`[app-db] Seeded admin: ${email}`)
}
