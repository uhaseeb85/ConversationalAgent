import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dbRouter from './routes/db'
import authRouter from './routes/auth'
import flowsRouter from './routes/flows'
import submissionsRouter from './routes/submissions'
import usersRouter from './routes/users'
import { initSchema, seedAdminIfNeeded } from './lib/app-db'
import { hashPassword } from './lib/auth'

// ─── Security Checks ──────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

if (isProduction && JWT_SECRET === 'dev-secret-change-in-production') {
  console.error('❌ FATAL: JWT_SECRET must be changed in production!')
  process.exit(1)
}

if (isProduction && !process.env.ALLOWED_ORIGIN) {
  console.error('❌ FATAL: ALLOWED_ORIGIN must be set in production!')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3001

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}))

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']),
].filter(Boolean) as string[]

app.use(cors({ 
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true 
}))

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', globalLimiter)

app.use('/api/auth', authRouter)
app.use('/api/flows', flowsRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api/users', usersRouter)
app.use('/api/db', dbRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

async function start() {
  await initSchema()

  // Seed first admin from env
  const adminPassword = process.env.FIRST_ADMIN_PASSWORD
  if (adminPassword) {
    const hashed = await hashPassword(adminPassword)
    await seedAdminIfNeeded(hashed)
  }

  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] Failed to start:', err)
  process.exit(1)
})
