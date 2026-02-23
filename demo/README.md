# Demo Database

This directory contains a pre-populated SQLite database for demonstrating onboarding flows.

## Database: `company-onboarding.db`

A comprehensive demo database with two main onboarding scenarios:
1. **Employee Onboarding** - HR processes for new hires
2. **OAuth Client Onboarding** - Developer application registration

### Employee Onboarding Tables

#### `departments`
- **id** (INTEGER PRIMARY KEY)
- **name** (TEXT) - Department name
- **location** (TEXT) - Office location
- **budget** (REAL) - Department budget
- **created_at** (TEXT) - Timestamp

**Sample Data:** 6 departments (Engineering, Product, Marketing, Sales, HR, Finance)

---

#### `employees`
- **id** (INTEGER PRIMARY KEY)
- **first_name** (TEXT)
- **last_name** (TEXT)
- **email** (TEXT UNIQUE)
- **phone** (TEXT)
- **department_id** (INTEGER) - Foreign key to departments
- **hire_date** (TEXT)
- **salary** (REAL)
- **is_remote** (INTEGER) - Boolean: 0=office, 1=remote
- **emergency_contact_name** (TEXT)
- **emergency_contact_phone** (TEXT)
- **created_at** (TEXT)

**Sample Data:** 8 employees across different departments

---

#### `equipment_requests`
- **id** (INTEGER PRIMARY KEY)
- **employee_id** (INTEGER) - Foreign key to employees
- **laptop_type** (TEXT) - e.g., "MacBook Pro 16"
- **needs_monitor** (INTEGER) - Boolean
- **needs_keyboard** (INTEGER) - Boolean
- **needs_mouse** (INTEGER) - Boolean
- **additional_notes** (TEXT)
- **status** (TEXT) - 'pending', 'approved', 'shipped', etc.
- **created_at** (TEXT)

**Sample Data:** 4 equipment requests

---

#### `training_enrollment`
- **id** (INTEGER PRIMARY KEY)
- **employee_id** (INTEGER) - Foreign key to employees
- **course_name** (TEXT) - Training course name
- **scheduled_date** (TEXT)
- **completed** (INTEGER) - Boolean: 0=incomplete, 1=completed
- **created_at** (TEXT)

**Sample Data:** 5 training enrollments

---

#### `benefits_enrollment`
- **id** (INTEGER PRIMARY KEY)
- **employee_id** (INTEGER) - Foreign key to employees
- **health_insurance** (TEXT) - Plan type (e.g., "Premium PPO")
- **dental_insurance** (INTEGER) - Boolean
- **vision_insurance** (INTEGER) - Boolean
- **retirement_401k_percent** (REAL) - Contribution percentage
- **beneficiary_name** (TEXT)
- **beneficiary_relationship** (TEXT)
- **created_at** (TEXT)

**Sample Data:** 4 benefits enrollments

---

### OAuth Client Onboarding Tables

#### `oauth_clients`
- **id** (INTEGER PRIMARY KEY)
- **client_id** (TEXT UNIQUE) - Unique identifier (e.g., 'cli_acme_mobile_001')
- **client_secret** (TEXT) - Secret key for authentication
- **client_name** (TEXT) - Application display name
- **description** (TEXT) - Application description
- **owner_email** (TEXT) - Developer/owner email
- **owner_organization** (TEXT) - Organization name
- **application_type** (TEXT) - 'web', 'mobile', 'spa', 'native', 'service'
- **status** (TEXT) - 'pending', 'active', 'suspended', 'revoked'
- **logo_url** (TEXT) - Application logo URL
- **privacy_policy_url** (TEXT) - Privacy policy link
- **terms_of_service_url** (TEXT) - Terms of service link
- **created_at** (TEXT) - Timestamp

**Sample Data:** 6 OAuth clients (mobile apps, web dashboards, services)

---

#### `oauth_scopes`
- **id** (INTEGER PRIMARY KEY)
- **scope_name** (TEXT UNIQUE) - Scope identifier (e.g., 'read:profile')
- **display_name** (TEXT) - Human-readable name
- **description** (TEXT) - What this scope allows
- **is_sensitive** (INTEGER) - Boolean: requires extra consent

**Sample Data:** 10 scopes (profile, email, contacts, calendar, files, admin)

---

#### `oauth_redirect_uris`
- **id** (INTEGER PRIMARY KEY)
- **client_id** (TEXT) - Foreign key to oauth_clients
- **redirect_uri** (TEXT) - Allowed callback URL
- **is_primary** (INTEGER) - Boolean: default redirect URI
- **created_at** (TEXT)

**Sample Data:** 10 redirect URIs across different clients

---

#### `oauth_client_scopes`
- **id** (INTEGER PRIMARY KEY)
- **client_id** (TEXT) - Foreign key to oauth_clients
- **scope_name** (TEXT) - Foreign key to oauth_scopes
- **granted_at** (TEXT) - When scope was granted
- UNIQUE constraint on (client_id, scope_name)

**Sample Data:** 19 scope assignments

---

#### `oauth_tokens`
- **id** (INTEGER PRIMARY KEY)
- **client_id** (TEXT) - Foreign key to oauth_clients
- **token_type** (TEXT) - 'access_token' or 'refresh_token'
- **token_hash** (TEXT) - Hashed token value
- **expires_at** (TEXT) - Expiration timestamp
- **scopes** (TEXT) - Space-separated scope list
- **is_revoked** (INTEGER) - Boolean: token revoked
- **created_at** (TEXT)

**Sample Data:** Empty (for demonstration purposes)

---

## Use Cases

This database is perfect for creating sample onboarding flows such as:

### Employee Onboarding

1. **New Employee Onboarding**
   - Collect personal information
   - INSERT into `employees` table
   - Map questions to columns: first_name, last_name, email, phone, department_id, etc.

2. **Equipment Request Flow**
   - Collect equipment preferences
   - INSERT into `equipment_requests`
   - Questions: laptop_type, needs_monitor, needs_keyboard, needs_mouse

3. **Benefits Enrollment Flow**
   - Collect insurance and retirement choices
   - INSERT into `benefits_enrollment`
   - Questions: health_insurance, dental_insurance, vision_insurance, retirement_401k_percent

### OAuth Client Onboarding

4. **OAuth Application Registration**
   - Developer registers new application
   - INSERT into `oauth_clients`, `oauth_redirect_uris`, `oauth_client_scopes`
   - Collect: client_name, description, owner_email, application_type, redirect_uri, requested scopes

5. **OAuth Scope Management**
   - Update existing client permissions
   - INSERT/DELETE from `oauth_client_scopes`
   - Allow developers to add or remove API access permissions

6. **Redirect URI Management**
   - Add callback URLs to existing OAuth applications
   - INSERT into `oauth_redirect_uris`
   - Validate and store authorized redirect destinations

4. **Training Enrollment Flow**
   - Sign up for courses
   - INSERT into `training_enrollment`
   - Questions: course_name, scheduled_date

---

## Recreating the Database

If you need to regenerate the database with fresh sample data:

```bash
npm run create-demo-db
```

This will:
- Delete the existing database (if any)
- Create all tables with proper schemas
- Populate with sample data
- Display a summary of records created

---

## Auto-loading

The demo database is automatically loaded when:
1. You open the Settings page for the first time
2. No other database connection is saved in browser storage

You can also manually load it by clicking the **"Load Demo Database"** button in Settings.

---

## Connection String

**Type:** SQLite  
**Path:** `./demo/company-onboarding.db`

The application will automatically resolve this to the correct absolute path on the server.
