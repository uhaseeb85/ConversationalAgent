import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { query, queryOne } from '../lib/app-db'
import { hashPassword, verifyPassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '../lib/auth'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { sendPasswordResetEmail } from '../lib/mailer'
import crypto from 'node:crypto'

const router = Router()

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as { email: string; password: string; name: string }

    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password and name are required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await hashPassword(password)
    const id = crypto.randomBytes(16).toString('hex')

    await query(
      `INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, 'user', 1)`,
      [id, email.toLowerCase(), passwordHash, name]
    )

    const user = await queryOne<UserRow>('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1', [id])
    const token = signToken({ id, role: 'user' })
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    res.status(201).json({ user: formatUser(user!) })
  } catch (err) {
    console.error('[auth] register error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated' })
      return
    }

    await query('UPDATE users SET last_login_at = $1 WHERE id = $2', [new Date().toISOString(), user.id])

    const token = signToken({ id: user.id, role: user.role as 'admin' | 'user' })
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    res.json({ user: formatUser(user) })
  } catch (err) {
    console.error('[auth] login error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Login failed' })
  }
})

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<UserRow>(
      'SELECT id, email, name, role, is_active, must_change_password, created_at, last_login_at FROM users WHERE id = $1',
      [req.user!.id]
    )
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ user: formatUser(user) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ─── Change Password (authenticated) ─────────────────────────────────────────
router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'currentPassword and newPassword are required' })
      return
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' })
      return
    }

    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.id])
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      res.status(401).json({ error: 'Current password is incorrect' })
      return
    }

    const newHash2 = await hashPassword(newPassword)
    await query('UPDATE users SET password_hash = $1, must_change_password = 0 WHERE id = $2', [newHash2, user.id])

    res.json({ ok: true })
  } catch (err) {
    console.error('[auth] change-password error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string }
    if (!email) {
      res.status(400).json({ error: 'email is required' })
      return
    }

    // Always respond 200 — never reveal whether email exists
    const user = await queryOne<UserRow>('SELECT id, email, is_active FROM users WHERE email = $1', [email.toLowerCase()])
    if (!user || !user.is_active) {
      res.json({ ok: true })
      return
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    const tokenId = crypto.randomBytes(16).toString('hex')

    // Invalidate any existing unused tokens for this user
    await query('UPDATE password_reset_tokens SET used = 1 WHERE user_id = $1 AND used = 0', [user.id])

    await query(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [tokenId, user.id, tokenHash, expiresAt]
    )

    await sendPasswordResetEmail(user.email, rawToken)

    res.json({ ok: true })
  } catch (err) {
    console.error('[auth] forgot-password error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// ─── Reset Password ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token: string; password: string }
    if (!token || !password) {
      res.status(400).json({ error: 'token and password are required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const record = await queryOne<{ id: string; user_id: string; expires_at: string; used: number }>(
      'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    )

    if (!record || record.used || new Date(record.expires_at) < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset link' })
      return
    }

    const user = await queryOne<UserRow>('SELECT id, is_active FROM users WHERE id = $1', [record.user_id])
    if (!user || !user.is_active) {
      res.status(400).json({ error: 'Account not found or deactivated' })
      return
    }

    const newHash = await hashPassword(password)
    await query('UPDATE users SET password_hash = $1, must_change_password = 0 WHERE id = $2', [newHash, user.id])
    await query('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [record.id])

    res.json({ ok: true })
  } catch (err) {
    console.error('[auth] reset-password error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  role: string
  is_active: number | boolean
  must_change_password: number | boolean
  created_at: string
  last_login_at?: string
}

function formatUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: Boolean(u.is_active),
    mustChangePassword: Boolean(u.must_change_password),
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at ?? null,
  }
}

export default router
