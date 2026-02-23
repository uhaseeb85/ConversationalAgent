# OAuth Client Onboarding - Quick Reference

This document provides a quick reference for the OAuth client onboarding tables and sample data in the demo database.

## Sample OAuth Clients

| Client ID | Name | Type | Status | Owner Email | Description |
|-----------|------|------|--------|-------------|-------------|
| `cli_acme_mobile_001` | ACME Mobile App | mobile | active | dev@acme.com | Official mobile application for ACME Services |
| `cli_dashboard_web_002` | Analytics Dashboard | web | active | admin@analytics.io | Real-time analytics and reporting dashboard |
| `cli_sync_service_003` | Cloud Sync Service | service | active | ops@cloudsync.net | Background service for file synchronization |
| `cli_calendar_spa_004` | Calendar Plus | spa | active | support@calendarplus.app | Enhanced calendar and scheduling application |
| `cli_beta_test_005` | Beta Testing App | native | pending | beta@testapp.dev | Application under development and testing |
| `cli_legacy_app_006` | Legacy Integration | web | suspended | legacy@oldapp.com | Deprecated application for backward compatibility |

## Available OAuth Scopes

| Scope Name | Display Name | Description | Sensitive |
|------------|--------------|-------------|-----------|
| `read:profile` | Read Profile | Read user profile information | No |
| `write:profile` | Write Profile | Update user profile information | No |
| `read:email` | Read Email | Access user email address | Yes |
| `read:contacts` | Read Contacts | Access user contacts | Yes |
| `write:contacts` | Write Contacts | Create and update contacts | Yes |
| `read:calendar` | Read Calendar | Read calendar events | No |
| `write:calendar` | Write Calendar | Create and modify calendar events | No |
| `read:files` | Read Files | Access user files | Yes |
| `write:files` | Write Files | Upload and modify files | Yes |
| `admin:users` | User Administration | Manage user accounts | Yes |

## Client Permissions Matrix

| Client | Scopes Granted |
|--------|----------------|
| **ACME Mobile App** | read:profile, write:profile, read:email, read:contacts, write:contacts, read:calendar, write:calendar |
| **Analytics Dashboard** | read:profile, read:email |
| **Cloud Sync Service** | read:profile, read:files, write:files |
| **Calendar Plus** | read:profile, read:calendar, write:calendar, read:email |
| **Beta Testing App** | read:profile, read:email |
| **Legacy Integration** | read:profile |

## Sample Redirect URIs

### ACME Mobile App
- `acme://oauth/callback` (primary)
- `acme://auth`

### Analytics Dashboard
- `https://analytics.io/oauth/callback` (primary)
- `https://analytics.io/auth/success`
- `http://localhost:3000/callback` (development)

### Cloud Sync Service
- `https://api.cloudsync.net/oauth/callback` (primary)

### Calendar Plus
- `https://calendarplus.app/auth` (primary)
- `https://app.calendarplus.app/callback`

### Beta Testing App
- `http://localhost:8080/auth/callback` (primary)

### Legacy Integration
- `https://oldapp.com/oauth` (primary)

## Common OAuth Flow Examples

### 1. Register New OAuth Application

**Minimum Required Fields:**
- Application Name
- Description
- Owner Email
- Application Type (web/mobile/spa/native/service)
- At least one Redirect URI

**Generated Automatically:**
- Unique `client_id` (e.g., "cli_" + random string)
- Secure `client_secret`
- Status = 'pending' (awaiting approval)

### 2. Request API Scopes

**Process:**
1. Select existing client
2. Choose required scopes
3. Insert into `oauth_client_scopes` table
4. Each scope requires justification for sensitive permissions

### 3. Add Redirect URI

**Validation Rules:**
- Must be HTTPS (except localhost and custom schemes)
- Mobile apps can use custom schemes (e.g., `myapp://`)
- Only one primary redirect URI per client

### 4. Approve/Reject Application

**Admin Actions:**
- Pending → Active (approve)
- Active → Suspended (temporary ban)
- Any status → Revoked (permanent)

### 5. Token Management

**Token Types:**
- `access_token` - Short-lived access (1 hour typical)
- `refresh_token` - Long-lived renewal (30 days typical)

**Revocation:**
- Set `is_revoked = 1` in `oauth_tokens`
- Happens when: client revoked, user revokes access, suspicious activity

## Application Type Guidelines

### Web Application
- Traditional server-side web app
- Can securely store client_secret
- Uses authorization_code flow
- Redirect to HTTPS URLs

### Mobile App
- Native iOS/Android application
- Cannot securely store secrets
- Uses PKCE (Proof Key for Code Exchange)
- Custom URI schemes (e.g., `myapp://oauth`)

### Single Page App (SPA)
- JavaScript frontend application
- Runs entirely in browser
- Cannot store secrets securely
- Uses implicit flow or authorization_code with PKCE

### Native App
- Desktop applications
- Similar to mobile apps
- Can use localhost redirects or custom schemes

### Service/Backend
- Server-to-server communication
- Machine-to-machine authentication
- Uses client_credentials flow
- Can securely store secrets

## Security Best Practices

### Client Secrets
- Generate strong random secrets (32+ characters)
- Never expose in client-side code
- Rotate periodically (every 90 days)
- Hash before storing in database (demo uses plaintext for simplicity)

### Redirect URIs
- Whitelist exact matches only
- No wildcards in production
- Reject open redirects
- Localhost only for development

### Scopes
- Principle of least privilege
- Request only necessary permissions
- Sensitive scopes require manual approval
- Document what each scope allows

### Status Management
- Default to 'pending' for new registrations
- Regularly audit 'active' applications
- Suspend suspicious activity
- Permanent revocation for abuse

## SQL Query Examples

### Find all active applications with write permissions
```sql
SELECT DISTINCT 
  c.client_id,
  c.client_name,
  c.owner_email
FROM oauth_clients c
JOIN oauth_client_scopes cs ON c.client_id = cs.client_id
WHERE c.status = 'active'
  AND cs.scope_name LIKE 'write:%';
```

### Applications pending approval
```sql
SELECT 
  client_id,
  client_name,
  owner_email,
  created_at
FROM oauth_clients
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Audit sensitive scope assignments
```sql
SELECT 
  c.client_name,
  c.owner_email,
  s.scope_name,
  s.display_name,
  cs.granted_at
FROM oauth_client_scopes cs
JOIN oauth_clients c ON cs.client_id = c.client_id
JOIN oauth_scopes s ON cs.scope_name = s.scope_name
WHERE s.is_sensitive = 1
  AND c.status = 'active'
ORDER BY cs.granted_at DESC;
```

### Applications with most permissions
```sql
SELECT 
  c.client_id,
  c.client_name,
  COUNT(cs.scope_name) as scope_count
FROM oauth_clients c
LEFT JOIN oauth_client_scopes cs ON c.client_id = cs.client_id
WHERE c.status = 'active'
GROUP BY c.client_id, c.client_name
ORDER BY scope_count DESC;
```

## Demo Flow Ideas

1. **Developer Application Registration**
   - Multi-step wizard
   - Collect app details, redirect URIs, request scopes
   - Generate client_id/secret
   - Email confirmation

2. **Scope Request Workflow**
   - Existing client requests additional permissions
   - Admin review and approval process
   - Automatic notification on approval

3. **Redirect URI Management**
   - Add/remove callback URLs
   - Set primary redirect
   - Validate URL format and protocol

4. **Application Lifecycle**
   - Submit → Review → Approve → Active
   - Monitoring and compliance checks
   - Suspension and revocation workflows

5. **Self-Service Developer Portal**
   - View application status
   - Manage redirect URIs
   - Request scope changes
   - View usage statistics

## Integration with Onboarding System

The OAuth client onboarding tables integrate seamlessly with the conversational onboarding flow builder:

1. **Schema Import**: Use "Import from Database" to see OAuth table structures
2. **AI Suggestions**: AI can suggest appropriate questions based on table schemas
3. **Conditional Logic**: Show/hide questions based on application type or requested scopes
4. **Multi-table Operations**: Single flow can insert into multiple tables (client + redirects + scopes)
5. **Validation**: Use question validation to enforce redirect URI formats, email verification, etc.

---

**Ready to build OAuth flows?** Check [DEMO_FLOWS.md](../DEMO_FLOWS.md) for complete examples!
