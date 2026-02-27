# GitHub Copilot Instructions

## Project Overview

**Conversational Onboarding** is a full-stack web application that lets admins build conversational data-collection flows (think typeform-style forms) and execute the resulting SQL against a user-configured target database. Submitted answers are stored in an internal app database and the generated SQL can be previewed, executed, and reviewed.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State management | Zustand (`src/lib/store.ts`) |
| Routing | React Router v6 |
| Forms | React Hook Form |
| Drag & drop | @dnd-kit/core, @dnd-kit/sortable |
| Backend | Express 5 (TypeScript, `tsx` runtime) |
| App database | SQLite (default) **or** PostgreSQL via `APP_DB_TYPE=postgresql` |
| Auth | JWT in HttpOnly cookies + bcrypt password hashing |
| Email | Nodemailer (optional SMTP for password-reset emails) |
| AI integration | OpenAI-compatible streaming API (LM Studio / OpenRouter) |

## Repository Structure

```
/
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   │   └── ui/             # Primitive design-system components (Button, Input, …)
│   ├── contexts/           # AuthContext (useAuth hook)
│   ├── lib/                # Client-side helpers
│   │   ├── ai-client.ts    # OpenAI-compatible streaming chat completions
│   │   ├── sql-generator.ts# Generates INSERT/UPDATE/DELETE SQL from flow submissions
│   │   ├── ddl-parser.ts   # Parses CREATE TABLE DDL into column metadata
│   │   ├── store.ts        # Zustand global store
│   │   ├── flows-api.ts    # REST calls for /api/flows
│   │   ├── submissions-api.ts
│   │   ├── db-api.ts       # REST calls for /api/db (target DB proxy)
│   │   └── auth-api.ts
│   ├── pages/              # Route-level page components
│   └── types/index.ts      # All shared TypeScript interfaces
│
├── server/                 # Express backend
│   ├── index.ts            # Entry point; registers all routers
│   ├── lib/
│   │   ├── app-db.ts       # Unified SQLite/PostgreSQL adapter for app data
│   │   ├── auth.ts         # JWT sign/verify, cookie helpers, password hashing
│   │   ├── db-manager.ts   # Manages user-configured target DB connections
│   │   └── mailer.ts       # Nodemailer password-reset email helper
│   ├── middleware/
│   │   └── requireAuth.ts  # JWT auth middleware; attaches req.user
│   └── routes/             # Express routers (auth, flows, submissions, users, db)
│
└── .env                    # Environment variables (see below)
```

## Key Domain Concepts

### OnboardingFlow
The central data model. A flow has:
- `questions: Question[]` — ordered list of questions with type, validation, and `sqlColumnName`
- `sqlOperations: SQLOperation[]` — one or more INSERT/UPDATE/DELETE ops that execute on submission
- `schemaContext` — optional DDL pasted by the admin; used to drive AI suggestions
- `tableName` — legacy primary table (still used for backward compatibility)

### Question Types
`text | email | phone | number | date | single-select | multi-select | yes-no`

### SQL Operations
Each `SQLOperation` has:
- `operationType: 'INSERT' | 'UPDATE' | 'DELETE'`
- `columnMappings: ColumnMapping[]` — maps a `questionId` to a `columnName`
- `conditions: SQLCondition[]` — WHERE clauses; values can be static or reference a question answer via `${questionId}` syntax

### Conditional Logic
Questions can have a `conditionalLogic` field that hides the question unless another question's answer matches a rule (`equals`, `not-equals`, `contains`, `greater-than`, `less-than`).

### AI Integration
- Config is stored in `localStorage` (base URL, API key, model name, enabled flag)
- Defaults come from `VITE_AI_BASE_URL`, `VITE_AI_API_KEY`, `VITE_AI_MODEL` env vars
- The client is OpenAI-compatible and supports streaming via SSE
- Used in `FlowBuilderPage` and `QuestionBuilder` to suggest questions from a schema context

## Environment Variables

### Server-side (`.env`)
| Variable | Purpose | Default |
|---|---|---|
| `JWT_SECRET` | Signs JWT tokens | `dev-secret-change-in-production` |
| `PORT` | Express listen port | `3001` |
| `APP_DB_TYPE` | `sqlite` or `postgresql` | `sqlite` |
| `APP_DB_PATH` | SQLite file path | `./app.db` |
| `APP_DATABASE_URL` | PostgreSQL connection string | — |
| `FIRST_ADMIN_EMAIL` | Seeded admin email on first startup | — |
| `FIRST_ADMIN_PASSWORD` | Seeded admin plaintext password | — |
| `FIRST_ADMIN_NAME` | Seeded admin display name | `Admin` |
| `ALLOWED_ORIGIN` | CORS allowed origin | — |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Nodemailer config | — |
| `APP_URL` | Used in password-reset email links | `http://localhost:5173` |
| `NODE_ENV` | Set to `production` to enable secure cookies | — |

### Client-side (`.env`, `VITE_` prefix)
| Variable | Purpose | Default |
|---|---|---|
| `VITE_AI_BASE_URL` | AI API base URL | `http://localhost:1234/v1` |
| `VITE_AI_API_KEY` | AI API key | `lmstudio` |
| `VITE_AI_MODEL` | Model name | `local-model` |

## API Routes

All routes are prefixed `/api/`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Login, sets HttpOnly JWT cookie |
| POST | `/auth/logout` | public | Clears cookie |
| GET | `/auth/me` | required | Returns current user |
| POST | `/auth/forgot-password` | public | Sends reset email |
| POST | `/auth/reset-password` | public | Resets password via token |
| GET | `/flows` | required | List flows (admin sees all, user sees own) |
| POST | `/flows` | required | Create flow |
| GET | `/flows/:id` | required | Get flow |
| PUT | `/flows/:id` | required | Update flow |
| DELETE | `/flows/:id` | admin | Delete flow |
| GET | `/submissions` | required | List submissions |
| GET | `/submissions/:id` | required | Get submission detail |
| POST | `/submissions` | required | Create submission |
| GET | `/users` | admin | List users |
| POST | `/users` | admin | Create user |
| PUT | `/users/:id` | admin | Update user |
| DELETE | `/users/:id` | admin | Delete user |
| POST | `/db/test` | required | Test target DB connection |
| POST | `/db/query` | required | Execute query on target DB |

## Coding Conventions

- **Git workflow**: Commit and push changes manually. Avoid automatic commits or pushes.
- **TypeScript strict mode** is enabled — avoid `any`; use types from `src/types/index.ts`
- **Server DB access** always goes through the helpers in `server/lib/app-db.ts` (`query`, `queryOne`, `insert`) — never use `getSqlite()` or `getPg()` directly in routes
- **Auth middleware**: import `requireAuth` and `AuthRequest` from `server/middleware/requireAuth.ts`; access the authenticated user via `req.user`
- **Frontend API calls** use the `*-api.ts` helpers in `src/lib/` — do not call `fetch` directly in page components
- **UI primitives** live in `src/components/ui/` — always use these (Button, Input, Select, etc.) rather than raw HTML elements
- **Tailwind CSS** for all styling; no CSS modules or inline styles
- **Zustand store** (`src/lib/store.ts`) for shared client state (flows, submissions, settings)
- All IDs are 32-char hex strings generated with `crypto.randomBytes(16).toString('hex')`
- SQL for the **app database** uses `$1`-style positional parameters (the adapter maps them to `?` for SQLite automatically)

### Security Guidelines

- **Never log sensitive data**: Use `err instanceof Error ? err.message : 'Unknown error'` instead of logging full error objects
- **Validate all SQL identifiers**: Use `validateSQLIdentifier()` from `sql-generator.ts` for table/column names
- **Rate limiting**: Apply `express-rate-limit` to sensitive endpoints (login, password reset)
- **Input validation**: Always validate and sanitize user input before processing
- **Error messages**: Never expose internal details or stack traces to clients
- **Environment validation**: Critical settings like `JWT_SECRET` and `ALLOWED_ORIGIN` are validated at startup in production

## Common Patterns

### Adding a new API route
1. Create or extend a file in `server/routes/`
2. Add `router.use(requireAuth)` at the top if the route requires auth
3. Register the router in `server/index.ts` under `/api/<name>`
4. Add a corresponding helper function in `src/lib/<name>-api.ts`

### Adding a new question type
1. Add the type literal to `QuestionType` in `src/types/index.ts`
2. Handle rendering in `src/pages/OnboardPage.tsx`
3. Handle SQL value formatting in `src/lib/sql-generator.ts` → `formatSQLValue()`
4. Add UI editing support in `src/components/QuestionBuilder.tsx`

### Adding a new page
1. Create the component in `src/pages/`
2. Add the route in `src/App.tsx` (inside `<PrivateLayout>` for authenticated pages, inside `<AdminRoute>` for admin-only)
3. Add a nav link in `src/components/Layout.tsx` if needed
