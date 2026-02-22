import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dbRouter from './routes/db'
import authRouter from './routes/auth'
import flowsRouter from './routes/flows'
import submissionsRouter from './routes/submissions'
import usersRouter from './routes/users'
import { initSchema, seedAdminIfNeeded } from './lib/app-db'
import { hashPassword } from './lib/auth'

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean) as string[]

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '4mb' }))
app.use(cookieParser())

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
