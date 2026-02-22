import { Router, Response } from 'express'
import { query, queryOne } from '../lib/app-db'
import { hashPassword } from '../lib/auth'
import { requireAdmin, AuthRequest } from '../middleware/requireAuth'

const router = Router()
router.use(requireAdmin)

// ─── List all users ───────────────────────────────────────────────────────────
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await query<UserRow>(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.must_change_password, u.created_at, u.last_login_at,
       COUNT(s.id) as submission_count
       FROM users u
       LEFT JOIN submissions s ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    res.json({ users: users.map(formatUser) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// ─── Get one user ─────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<UserRow>(
      'SELECT id, email, name, role, is_active, must_change_password, created_at, last_login_at FROM users WHERE id = $1',
      [req.params.id]
    )
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user: formatUser(user) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ─── Update role / isActive ───────────────────────────────────────────────────
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user!.id && req.body.isActive === false) {
      res.status(400).json({ error: 'Cannot deactivate your own account' }); return
    }
    const { role, isActive } = req.body
    await query(
      `UPDATE users SET
       role = COALESCE($1, role),
       is_active = COALESCE($2, is_active)
       WHERE id = $3`,
      [role ?? null, isActive !== undefined ? (isActive ? 1 : 0) : null, req.params.id]
    )
    const user = await queryOne<UserRow>(
      'SELECT id, email, name, role, is_active, must_change_password, created_at, last_login_at FROM users WHERE id = $1',
      [req.params.id]
    )
    res.json({ user: formatUser(user!) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// ─── Set temporary password (admin) ────────────────────────────────────────
router.post('/:id/set-temp-password', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as { password: string }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Temporary password must be at least 8 characters' }); return
    }
    const user = await queryOne<UserRow>('SELECT id FROM users WHERE id = $1', [req.params.id])
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const newHash = await hashPassword(password)
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = 1 WHERE id = $2',
      [newHash, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('[users] set-temp-password error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to set temporary password' })
  }
})

// ─── Delete user ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' }); return
    }
    // Null-out foreign keys (submissions + flows remain but owned by nobody)
    await query('UPDATE submissions SET user_id = NULL WHERE user_id = $1', [req.params.id])
    await query('UPDATE flows SET created_by = NULL WHERE created_by = $1', [req.params.id])
    await query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// ─── Get submissions for a specific user ──────────────────────────────────────
router.get('/:id/submissions', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      'SELECT * FROM submissions WHERE user_id = $1 ORDER BY completed_at DESC',
      [req.params.id]
    )
    res.json({ submissions: rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})

// ─── Full execution history (all users) ──────────────────────────────────────
router.get('/execution-history/all', async (_req: AuthRequest, res: Response) => {
  try {
    const history = await query(
      `SELECT eh.*, u.name as user_name, u.email as user_email, s.flow_name
       FROM execution_history eh
       LEFT JOIN users u ON u.id = eh.user_id
       LEFT JOIN submissions s ON s.id = eh.submission_id
       ORDER BY eh.executed_at DESC
       LIMIT 500`
    )
    res.json({ history })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch execution history' })
  }
})

// ─── Usage metrics / stats ────────────────────────────────────────────────────
router.get('/stats/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount] = await query<{ total: number }>('SELECT COUNT(*) as total FROM users')
    const [activeUsers] = await query<{ total: number }>('SELECT COUNT(*) as total FROM users WHERE is_active = 1')
    const [flowCount] = await query<{ total: number }>('SELECT COUNT(*) as total FROM flows')
    const [subCount] = await query<{ total: number }>('SELECT COUNT(*) as total FROM submissions')
    const [execCount] = await query<{ total: number }>('SELECT COUNT(*) as total FROM execution_history')
    const [successCount] = await query<{ total: number }>('SELECT COUNT(*) as total FROM execution_history WHERE success = 1')

    // Submissions by status
    const subsByStatus = await query<{ status: string; total: number }>(
      'SELECT status, COUNT(*) as total FROM submissions GROUP BY status'
    )

    // Submissions per day (last 30 days)
    const subsPerDay = await query<{ day: string; total: number }>(
      `SELECT substr(started_at, 1, 10) as day, COUNT(*) as total
       FROM submissions
       WHERE started_at >= date('now', '-30 days')
       GROUP BY day ORDER BY day ASC`
    )

    // Executions per day (last 30 days)
    const execsPerDay = await query<{ day: string; total: number; successes: number }>(
      `SELECT substr(executed_at, 1, 10) as day,
              COUNT(*) as total,
              SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes
       FROM execution_history
       WHERE executed_at >= date('now', '-30 days')
       GROUP BY day ORDER BY day ASC`
    )

    // Top flows by submission count
    const topFlows = await query<{ flow_name: string; total: number }>(
      `SELECT flow_name, COUNT(*) as total FROM submissions
       GROUP BY flow_name ORDER BY total DESC LIMIT 5`
    )

    // Most active users by submission count
    const topUsers = await query<{ name: string; email: string; total: number }>(
      `SELECT u.name, u.email, COUNT(s.id) as total
       FROM users u LEFT JOIN submissions s ON s.user_id = u.id
       GROUP BY u.id ORDER BY total DESC LIMIT 5`
    )

    res.json({
      totals: {
        users: Number(userCount?.total ?? 0),
        activeUsers: Number(activeUsers?.total ?? 0),
        flows: Number(flowCount?.total ?? 0),
        submissions: Number(subCount?.total ?? 0),
        executions: Number(execCount?.total ?? 0),
        successRate: execCount?.total
          ? Math.round((Number(successCount?.total ?? 0) / Number(execCount.total)) * 100)
          : 0,
      },
      subsByStatus,
      subsPerDay,
      execsPerDay,
      topFlows,
      topUsers,
    })
  } catch (err) {
    console.error('[stats] error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface UserRow {
  id: string; email: string; name: string; role: string
  is_active: number | boolean; must_change_password: number | boolean
  created_at: string; last_login_at?: string
  submission_count?: number | string
}

function formatUser(u: UserRow) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    isActive: Boolean(u.is_active),
    mustChangePassword: Boolean(u.must_change_password),
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at ?? null,
    submissionCount: Number(u.submission_count ?? 0),
  }
}

export default router
