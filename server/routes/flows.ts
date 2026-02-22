import { Router, Response } from 'express'
import { query, queryOne, insert } from '../lib/app-db'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import crypto from 'crypto'

const router = Router()
router.use(requireAuth)

// ─── List ──────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin'
    const rows = isAdmin
      ? await query<FlowRow>('SELECT * FROM flows ORDER BY created_at DESC')
      : await query<FlowRow>(
          'SELECT * FROM flows WHERE created_by = $1 ORDER BY created_at DESC',
          [req.user!.id]
        )
    res.json({ flows: rows.map(formatFlow) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flows' })
  }
})

// ─── Get one ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await queryOne<FlowRow>('SELECT * FROM flows WHERE id = $1', [req.params.id])
    if (!row) { res.status(404).json({ error: 'Flow not found' }); return }
    if (req.user!.role !== 'admin' && row.created_by !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    res.json({ flow: formatFlow(row) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flow' })
  }
})

// ─── Create ────────────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, tableName, welcomeMessage, completionMessage, isActive, questions, sqlOperations, schemaContext } = req.body
    const id = crypto.randomBytes(16).toString('hex')
    const now = new Date().toISOString()
    await query(
      `INSERT INTO flows (id, name, description, table_name, welcome_message, completion_message, is_active, questions, sql_operations, schema_context, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id, name, description ?? '', tableName ?? '', welcomeMessage ?? null,
        completionMessage ?? null, isActive !== false ? 1 : 0,
        JSON.stringify(questions ?? []), JSON.stringify(sqlOperations ?? []),
        schemaContext ?? null, req.user!.id, now, now,
      ]
    )
    const row = await queryOne<FlowRow>('SELECT * FROM flows WHERE id = $1', [id])
    res.status(201).json({ flow: formatFlow(row!) })
  } catch (err) {
    console.error('[flows] create error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to create flow' })
  }
})

// ─── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await queryOne<FlowRow>('SELECT * FROM flows WHERE id = $1', [req.params.id])
    if (!existing) { res.status(404).json({ error: 'Flow not found' }); return }
    if (req.user!.role !== 'admin' && existing.created_by !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    const { name, description, tableName, welcomeMessage, completionMessage, isActive, questions, sqlOperations, schemaContext } = req.body
    const now = new Date().toISOString()
    await query(
      `UPDATE flows SET name=$1, description=$2, table_name=$3, welcome_message=$4, completion_message=$5,
       is_active=$6, questions=$7, sql_operations=$8, schema_context=$9, updated_at=$10 WHERE id=$11`,
      [
        name ?? existing.name, description ?? existing.description, tableName ?? existing.table_name,
        welcomeMessage ?? existing.welcome_message, completionMessage ?? existing.completion_message,
        isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
        JSON.stringify(questions ?? JSON.parse(existing.questions)),
        JSON.stringify(sqlOperations ?? JSON.parse(existing.sql_operations ?? '[]')),
        schemaContext ?? existing.schema_context, now, req.params.id,
      ]
    )
    const row = await queryOne<FlowRow>('SELECT * FROM flows WHERE id = $1', [req.params.id])
    res.json({ flow: formatFlow(row!) })
  } catch (err) {
    console.error('[flows] update error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to update flow' })
  }
})

// ─── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await queryOne<FlowRow>('SELECT id, created_by FROM flows WHERE id = $1', [req.params.id])
    if (!existing) { res.status(404).json({ error: 'Flow not found' }); return }
    if (req.user!.role !== 'admin' && existing.created_by !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    await query('DELETE FROM flows WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete flow' })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface FlowRow {
  id: string; name: string; description: string; table_name: string
  welcome_message: string | null; completion_message: string | null
  is_active: number | boolean; questions: string; sql_operations: string
  schema_context: string | null; created_by: string | null
  created_at: string; updated_at: string
}

function formatFlow(r: FlowRow) {
  return {
    id: r.id, name: r.name, description: r.description, tableName: r.table_name,
    welcomeMessage: r.welcome_message, completionMessage: r.completion_message,
    isActive: Boolean(r.is_active),
    questions: JSON.parse(r.questions || '[]'),
    sqlOperations: JSON.parse(r.sql_operations || '[]'),
    schemaContext: r.schema_context,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export default router
