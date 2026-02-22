# Security Documentation

## Overview

This document outlines the security measures implemented in the Conversational Onboarding application and provides guidance for secure deployment and operation.

## Implemented Security Controls

### 1. Authentication & Authorization

#### JWT-Based Authentication
- **Secure token generation**: Uses `jsonwebtoken` with configurable secret
- **HttpOnly cookies**: Tokens stored in HttpOnly cookies to prevent XSS theft
- **Secure flag in production**: Cookies marked secure when `NODE_ENV=production`
- **7-day expiry**: Automatic token expiration
- **Bcrypt password hashing**: 12 rounds (configurable via `BCRYPT_ROUNDS`)

#### Role-Based Access Control (RBAC)
- **Admin role**: Full access to all resources, user management, flow deletion
- **User role**: Access to own resources only
- **Middleware enforcement**: `requireAuth` middleware validates JWT and attaches `req.user`

### 2. SQL Injection Prevention

#### Input Validation
- **Strict identifier validation**: Table and column names validated with regex (`/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/`)
- **SQL keyword blocking**: Prevents using reserved SQL keywords as identifiers
- **Type-specific value formatting**: Numbers validated, dates parsed, strings escaped
- **Parameterized queries for app DB**: All app database operations use `$1`-style parameters

#### Statement Whitelisting
- **Limited operations**: `/api/db/execute` only allows INSERT, UPDATE, DELETE
- **Regex validation**: `^\s*(INSERT|UPDATE|DELETE)\s+` pattern enforced
- **Admin-controlled schemas**: Table/column names come from flow configuration (admin-created)

### 3. Rate Limiting

#### Endpoint-Specific Limits
- **Global API limit**: 100 requests per 15 minutes per IP
- **Login endpoint**: 5 attempts per 15 minutes
- **Password reset**: 3 requests per hour
- **Standard headers**: Uses RFC 6585 RateLimit headers

### 4. Security Headers (Helmet)

Automatic headers applied:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (modern browsers rely on CSP)
- `Strict-Transport-Security` (when HTTPS)
- `Content-Security-Policy` with restrictive defaults

### 5. CORS Policy

- **Origin validation**: Whitelisted origins only
- **Credentials support**: `credentials: true` for cookie auth
- **Production enforcement**: Fails to start if `ALLOWED_ORIGIN` not set in production

### 6. Password Security

#### Password Reset Flow
- **Cryptographically secure tokens**: 32-byte random via `crypto.randomBytes`
- **SHA-256 hashed tokens**: Tokens hashed before database storage
- **Single-use tokens**: Marked as used after successful reset
- **1-hour expiration**: Tokens expire automatically
- **Email enumeration protection**: Generic response regardless of email existence

#### Password Requirements
- **Minimum 8 characters**
- **Must change temporary passwords**: Flag forces password change on first login

### 7. Environment Variable Validation

#### Startup Checks
```typescript
if (isProduction && JWT_SECRET === 'dev-secret-change-in-production') {
  console.error('❌ FATAL: JWT_SECRET must be changed in production!')
  process.exit(1)
}

if (isProduction && !process.env.ALLOWED_ORIGIN) {
  console.error('❌ FATAL: ALLOWED_ORIGIN must be set in production!')
  process.exit(1)
}
```

### 8. Logging & Error Handling

#### Secure Logging
- **No sensitive data in logs**: Passwords, tokens, credentials never logged
- **Error message sanitization**: Only `err.message` logged, not full stack traces with data
- **Structured logging**: Prefixed with context (`[auth]`, `[flows]`, etc.)

#### Error Responses
- **Generic error messages**: API errors don't reveal internal details
- **No stack traces in production**: Detailed errors only in development

### 9. Input Validation & Sanitization

#### Request Body Limits
- **1MB JSON limit**: Prevents memory exhaustion attacks
- **Type validation**: TypeScript interfaces enforce structure

#### Data Validation
- **Email format validation**: Normalized to lowercase
- **Required field checks**: Enforced at API level
- **Length constraints**: Password minimum 8 characters

## Known Limitations & Risks

### 🟡 Medium Risk

#### 1. Target Database Credentials Storage
**Issue**: User-configured database credentials stored in app database are not encrypted at rest.

**Mitigation**:
- Credentials only accessible to the authenticated user
- App database access requires authentication
- Consider encrypting with AES-256-GCM using `ENCRYPTION_KEY` env var

**Future Fix**:
```typescript
import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32)

function encrypt(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), tag: tag.toString('hex') }
}
```

#### 2. No CSRF Protection
**Issue**: Cookie-based auth without CSRF tokens is vulnerable to CSRF attacks.

**Mitigation**:
- SameSite cookie attribute (consider adding `sameSite: 'strict'`)
- Origins are whitelisted via CORS

**Future Fix**: Add `csurf` middleware
```typescript
import csrf from 'csurf'
app.use(csrf({ cookie: true }))
```

#### 3. SQL Generation Still String-Based
**Issue**: While identifiers are validated, the SQL is still generated as strings rather than fully parameterized.

**Reason**: Dynamic table/column names cannot be parameterized in standard SQL.

**Mitigation**:
- Strict identifier validation (alphanumeric + underscore only)
- SQL keyword blocking
- Admin-only control of schema mappings
- Values are properly escaped

### 🟢 Low Risk

#### 1. No Session Management
**Issue**: JWTs cannot be invalidated before expiry.

**Mitigation**:
- Short 7-day expiry
- Consider implementing token blacklist for logout

#### 2. No Account Lockout
**Issue**: No automatic account lockout after failed login attempts.

**Mitigation**:
- Rate limiting prevents brute force
- Consider tracking failed attempts per user

## Production Deployment Checklist

### Critical (Must Do)

- [ ] Change `JWT_SECRET` to a strong random string (use `openssl rand -base64 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGIN` to your frontend domain
- [ ] Use PostgreSQL (`APP_DB_TYPE=postgresql`) instead of SQLite
- [ ] Configure SMTP for password reset emails
- [ ] Change `FIRST_ADMIN_PASSWORD` immediately after first login
- [ ] Enable HTTPS/TLS for all connections
- [ ] Use database SSL/TLS encryption

### Recommended

- [ ] Set up regular backups of app database
- [ ] Configure firewall rules to restrict database access
- [ ] Use restricted database user accounts (not admin/root)
- [ ] Set up monitoring for execution_history table
- [ ] Configure log aggregation (Winston, DataDog, etc.)
- [ ] Enable database query logging
- [ ] Set up security scanning in CI/CD
- [ ] Implement CSRF tokens (future enhancement)
- [ ] Encrypt target DB credentials (future enhancement)

### Environment Variables

Required in production:
```bash
NODE_ENV=production
JWT_SECRET=<strong-random-string>
ALLOWED_ORIGIN=https://app.yourdomain.com
APP_DB_TYPE=postgresql
APP_DATABASE_URL=postgresql://user:pass@host:5432/dbname
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=<smtp-password>
APP_URL=https://app.yourdomain.com
```

## Security Incident Response

### If credentials are compromised:

1. **Rotate JWT_SECRET immediately**
   - All existing sessions will be invalidated
   - Users must re-login

2. **Reset admin password**
   ```sql
   UPDATE users SET password_hash = '$2b$12$...' WHERE role = 'admin';
   ```

3. **Review execution_history table**
   ```sql
   SELECT * FROM execution_history WHERE executed_at > NOW() - INTERVAL '24 hours';
   ```

4. **Check for unauthorized SQL operations**
   - Look for DROP, TRUNCATE, ALTER statements
   - Review failed executions

### If database is compromised:

1. **Disconnect all target databases**
   ```sql
   -- Clear connection configs
   UPDATE users SET db_type = NULL, db_connection_string = NULL;
   ```

2. **Rotate all database credentials**
3. **Review all flows and SQL operations**
4. **Check submission history for malicious input**

## Reporting Security Issues

To report a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email: security@example.com (replace with your contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We aim to respond within 48 hours and provide a fix within 7 days for critical issues.

## Security Audit History

| Date | Version | Auditor | Findings | Status |
|------|---------|---------|----------|--------|
| 2026-02-21 | 1.0.0 | Internal | SQL injection risks, rate limiting needed | ✅ Fixed |

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
