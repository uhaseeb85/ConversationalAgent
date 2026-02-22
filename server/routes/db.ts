import { Router, Response } from 'express'
import {
  connectPostgres,
  connectSQLite,
  getPostgresSchema,
  getSQLiteSchema,
  executePostgresSQL,
  executeSQLiteSQL,
  getActiveType,
} from '../lib/db-manager'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()
router.use(requireAuth)

// POST /api/db/connect
router.post('/connect', async (req: AuthRequest, res: Response) => {
  const { type, connectionString } = req.body as { type: 'postgresql' | 'sqlite'; connectionString: string }
  if (!type || !connectionString) {
    res.status(400).json({ ok: false, error: 'type and connectionString are required' })
    return
  }
  const userId = req.user!.id
  try {
    if (type === 'postgresql') {
      await connectPostgres(userId, connectionString)
    } else if (type === 'sqlite') {
      connectSQLite(userId, connectionString)
    } else {
      res.status(400).json({ ok: false, error: `Unsupported DB type: ${type}` })
      return
    }
    const schema = type === 'postgresql'
      ? await getPostgresSchema(userId)
      : getSQLiteSchema(userId)
    res.json({ ok: true, tables: schema.map((t) => t.name) })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// GET /api/db/schema
router.get('/schema', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const type = getActiveType(userId)
  if (!type) { res.status(400).json({ ok: false, error: 'Not connected to any database' }); return }
  try {
    const tables = type === 'postgresql' ? await getPostgresSchema(userId) : getSQLiteSchema(userId)
    res.json({ ok: true, tables })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// POST /api/db/execute
router.post('/execute', async (req: AuthRequest, res: Response) => {
  const { statements } = req.body as { statements: string[] }
  if (!Array.isArray(statements) || statements.length === 0) {
    res.status(400).json({ ok: false, error: 'statements array is required' })
    return
  }
  const userId = req.user!.id
  const type = getActiveType(userId)
  if (!type) { res.status(400).json({ ok: false, error: 'Not connected to any database' }); return }
  try {
    const results = type === 'postgresql'
      ? await executePostgresSQL(userId, statements)
      : executeSQLiteSQL(userId, statements)
    const allSuccess = results.every((r) => r.success)
    res.json({ ok: allSuccess, results, rolledBack: !allSuccess })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// GET /api/db/status
router.get('/status', (req: AuthRequest, res: Response) => {
  res.json({ type: getActiveType(req.user!.id) })
})

export default router
