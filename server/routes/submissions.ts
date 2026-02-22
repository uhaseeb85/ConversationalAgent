import { Router, Response } from 'express'
import { query, queryOne } from '../lib/app-db'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import crypto from 'crypto'

const router = Router()
router.use(requireAuth)

// ─── List ──────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { flowId } = req.query
    const isAdmin = req.user!.role === 'admin'
    let sql: string
    let params: unknown[]

    if (isAdmin) {
      sql = flowId
        ? 'SELECT * FROM submissions WHERE flow_id = $1 ORDER BY completed_at DESC'
        : 'SELECT * FROM submissions ORDER BY completed_at DESC'
      params = flowId ? [flowId] : []
    } else {
      sql = flowId
        ? 'SELECT * FROM submissions WHERE user_id = $1 AND flow_id = $2 ORDER BY completed_at DESC'
        : 'SELECT * FROM submissions WHERE user_id = $1 ORDER BY completed_at DESC'
      params = flowId ? [req.user!.id, flowId] : [req.user!.id]
    }

    const rows = await query<SubRow>(sql, params)
    res.json({ submissions: rows.map(formatSub) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

// ─── Get one ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await queryOne<SubRow>('SELECT * FROM submissions WHERE id = $1', [req.params.id])
    if (!row) { res.status(404).json({ error: 'Submission not found' }); return }
    if (req.user!.role !== 'admin' && row.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    res.json({ submission: formatSub(row) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission' })
  }
})

// ─── Create ────────────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { flowId, flowName, responses, generatedSQL, status, startedAt, completedAt } = req.body
    const id = crypto.randomBytes(16).toString('hex')
    await query(
      `INSERT INTO submissions (id, flow_id, flow_name, user_id, responses, generated_sql, status, started_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id, flowId, flowName, req.user!.id,
        JSON.stringify(responses ?? []),
        generatedSQL ?? null,
        status ?? 'pending',
        startedAt ?? new Date().toISOString(),
        completedAt ?? new Date().toISOString(),
      ]
    )
    const row = await queryOne<SubRow>('SELECT * FROM submissions WHERE id = $1', [id])
    res.status(201).json({ submission: formatSub(row!) })
  } catch (err) {
    // Don't log full error (may contain sensitive data)
    console.error('[submissions] create error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to create submission' })
  }
})

// ─── Update (status, generatedSQL, executedAt) ────────────────────────────────
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await queryOne<SubRow>('SELECT * FROM submissions WHERE id = $1', [req.params.id])
    if (!existing) { res.status(404).json({ error: 'Submission not found' }); return }
    if (req.user!.role !== 'admin' && existing.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    const { status, generatedSQL, executedAt } = req.body
    await query(
      `UPDATE submissions SET status=COALESCE($1, status), generated_sql=COALESCE($2, generated_sql), executed_at=COALESCE($3, executed_at) WHERE id=$4`,
      [status ?? null, generatedSQL ?? null, executedAt ?? null, req.params.id]
    )
    const row = await queryOne<SubRow>('SELECT * FROM submissions WHERE id = $1', [req.params.id])
    res.json({ submission: formatSub(row!) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update submission' })
  }
})

// ─── Execution history for a submission ──────────────────────────────────────
router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const sub = await queryOne<SubRow>('SELECT * FROM submissions WHERE id = $1', [req.params.id])
    if (!sub) { res.status(404).json({ error: 'Submission not found' }); return }
    if (req.user!.role !== 'admin' && sub.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    const history = await query(
      'SELECT * FROM execution_history WHERE submission_id = $1 ORDER BY executed_at ASC',
      [req.params.id]
    )
    res.json({ history })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ─── Record execution history (called after /api/db/execute succeeds) ─────────
router.post('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const { results } = req.body as { results: Array<{ statement: string; success: boolean; rowsAffected?: number; error?: string }> }
    const sub = await queryOne<SubRow>('SELECT user_id FROM submissions WHERE id = $1', [req.params.id])
    if (!sub) { res.status(404).json({ error: 'Submission not found' }); return }

    for (const r of results) {
      const id = crypto.randomBytes(16).toString('hex')
      await query(
        `INSERT INTO execution_history (id, submission_id, user_id, statement, success, rows_affected, error_message) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, req.params.id, req.user!.id, r.statement, r.success ? 1 : 0, r.rowsAffected ?? null, r.error ?? null]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to record history' })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface SubRow {
  id: string; flow_id: string; flow_name: string; user_id: string | null
  responses: string; generated_sql: string | null; status: string
  started_at: string; completed_at: string; executed_at: string | null
}

function formatSub(r: SubRow) {
  return {
    id: r.id, flowId: r.flow_id, flowName: r.flow_name, userId: r.user_id,
    responses: JSON.parse(r.responses || '[]'),
    generatedSQL: r.generated_sql,
    status: r.status as 'pending' | 'executed' | 'failed',
    startedAt: r.started_at, completedAt: r.completed_at, executedAt: r.executed_at,
  }
}

export default router
