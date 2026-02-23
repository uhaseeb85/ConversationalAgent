/**
 * Creates a demo SQLite database for onboarding flow demonstrations
 * Run with: npx tsx scripts/create-demo-db.ts
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'

const DEMO_DIR = join(process.cwd(), 'demo')
const DB_PATH = join(DEMO_DIR, 'company-onboarding.db')

// Ensure demo directory exists
if (!existsSync(DEMO_DIR)) {
  mkdirSync(DEMO_DIR, { recursive: true })
}

// Delete existing database if it exists
if (existsSync(DB_PATH)) {
  console.log('Removing existing database...')
  unlinkSync(DB_PATH)
}

console.log(`Creating demo database at: ${DB_PATH}`)

const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
console.log('Creating tables...')

db.exec(`
  -- Departments table
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    budget REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Employees table
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    department_id INTEGER,
    hire_date TEXT,
    salary REAL,
    is_remote INTEGER DEFAULT 0,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  );

  -- Equipment requests table
  CREATE TABLE IF NOT EXISTS equipment_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    laptop_type TEXT,
    needs_monitor INTEGER DEFAULT 0,
    needs_keyboard INTEGER DEFAULT 0,
    needs_mouse INTEGER DEFAULT 0,
    additional_notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  -- Training enrollment table
  CREATE TABLE IF NOT EXISTS training_enrollment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    scheduled_date TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  -- Benefits enrollment table
  CREATE TABLE IF NOT EXISTS benefits_enrollment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    health_insurance TEXT,
    dental_insurance INTEGER DEFAULT 0,
    vision_insurance INTEGER DEFAULT 0,
    retirement_401k_percent REAL DEFAULT 0,
    beneficiary_name TEXT,
    beneficiary_relationship TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  -- OAuth Clients table
  CREATE TABLE IF NOT EXISTS oauth_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL UNIQUE,
    client_secret TEXT NOT NULL,
    client_name TEXT NOT NULL,
    description TEXT,
    owner_email TEXT NOT NULL,
    owner_organization TEXT,
    application_type TEXT CHECK(application_type IN ('web', 'mobile', 'spa', 'native', 'service')) DEFAULT 'web',
    status TEXT CHECK(status IN ('pending', 'active', 'suspended', 'revoked')) DEFAULT 'pending',
    logo_url TEXT,
    privacy_policy_url TEXT,
    terms_of_service_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- OAuth Redirect URIs table
  CREATE TABLE IF NOT EXISTS oauth_redirect_uris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE
  );

  -- OAuth Scopes table (available permissions)
  CREATE TABLE IF NOT EXISTS oauth_scopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_sensitive INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- OAuth Client Scopes table (which scopes each client has)
  CREATE TABLE IF NOT EXISTS oauth_client_scopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    scope_name TEXT NOT NULL,
    granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (scope_name) REFERENCES oauth_scopes(scope_name) ON DELETE CASCADE,
    UNIQUE(client_id, scope_name)
  );

  -- OAuth Tokens table (for demo purposes - tracking issued tokens)
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    token_type TEXT CHECK(token_type IN ('access_token', 'refresh_token')) NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT,
    scopes TEXT,
    is_revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE
  );
`)

// Insert sample departments
console.log('Inserting sample departments...')
const insertDept = db.prepare(`
  INSERT INTO departments (name, location, budget) VALUES (?, ?, ?)
`)

const departments = [
  ['Engineering', 'San Francisco', 2500000],
  ['Product', 'San Francisco', 1500000],
  ['Marketing', 'New York', 1200000],
  ['Sales', 'Austin', 1800000],
  ['Human Resources', 'Remote', 500000],
  ['Finance', 'New York', 800000],
]

for (const dept of departments) {
  insertDept.run(...dept)
}

// Insert sample employees
console.log('Inserting sample employees...')
const insertEmp = db.prepare(`
  INSERT INTO employees (first_name, last_name, email, phone, department_id, hire_date, salary, is_remote)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const employees = [
  ['Sarah', 'Johnson', 'sarah.johnson@company.com', '555-0101', 1, '2023-01-15', 125000, 0],
  ['Michael', 'Chen', 'michael.chen@company.com', '555-0102', 1, '2023-02-20', 115000, 1],
  ['Emily', 'Rodriguez', 'emily.rodriguez@company.com', '555-0103', 2, '2023-03-10', 105000, 0],
  ['David', 'Kim', 'david.kim@company.com', '555-0104', 3, '2023-04-05', 95000, 1],
  ['Jessica', 'Taylor', 'jessica.taylor@company.com', '555-0105', 4, '2023-05-12', 88000, 0],
  ['James', 'Wilson', 'james.wilson@company.com', '555-0106', 5, '2023-06-18', 78000, 1],
  ['Ashley', 'Brown', 'ashley.brown@company.com', '555-0107', 6, '2023-07-22', 92000, 0],
  ['Christopher', 'Lee', 'christopher.lee@company.com', '555-0108', 1, '2023-08-30', 118000, 0],
]

for (const emp of employees) {
  insertEmp.run(...emp)
}

// Insert sample equipment requests
console.log('Inserting sample equipment requests...')
const insertEquip = db.prepare(`
  INSERT INTO equipment_requests (employee_id, laptop_type, needs_monitor, needs_keyboard, needs_mouse, status)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const equipmentRequests = [
  [1, 'MacBook Pro 16"', 1, 1, 1, 'approved'],
  [2, 'MacBook Pro 14"', 1, 0, 1, 'approved'],
  [3, 'MacBook Air', 1, 1, 0, 'pending'],
  [5, 'ThinkPad X1 Carbon', 0, 1, 1, 'approved'],
]

for (const eq of equipmentRequests) {
  insertEquip.run(...eq)
}

// Insert sample training enrollments
console.log('Inserting sample training enrollments...')
const insertTraining = db.prepare(`
  INSERT INTO training_enrollment (employee_id, course_name, scheduled_date, completed)
  VALUES (?, ?, ?, ?)
`)

const trainings = [
  [1, 'Security Awareness', '2023-01-20', 1],
  [1, 'Leadership Fundamentals', '2023-02-15', 1],
  [2, 'Git & GitHub Basics', '2023-03-01', 1],
  [3, 'Product Management 101', '2023-03-15', 0],
  [4, 'Content Marketing', '2023-04-10', 1],
]

for (const training of trainings) {
  insertTraining.run(...training)
}

// Insert sample benefits enrollments
console.log('Inserting sample benefits enrollments...')
const insertBenefits = db.prepare(`
  INSERT INTO benefits_enrollment (employee_id, health_insurance, dental_insurance, vision_insurance, retirement_401k_percent)
  VALUES (?, ?, ?, ?, ?)
`)

const benefits = [
  [1, 'Premium PPO', 1, 1, 6.0],
  [2, 'Standard HMO', 1, 0, 4.0],
  [3, 'Premium PPO', 1, 1, 5.0],
  [5, 'Standard HMO', 0, 1, 3.0],
]

for (const benefit of benefits) {
  insertBenefits.run(...benefit)
}

// Insert OAuth scopes
console.log('Inserting OAuth scopes...')
const insertScope = db.prepare(`
  INSERT INTO oauth_scopes (scope_name, display_name, description, is_sensitive)
  VALUES (?, ?, ?, ?)
`)

const scopes = [
  ['read:profile', 'Read Profile', 'Read user profile information', 0],
  ['write:profile', 'Write Profile', 'Update user profile information', 0],
  ['read:email', 'Read Email', 'Access user email address', 1],
  ['read:contacts', 'Read Contacts', 'Access user contacts', 1],
  ['write:contacts', 'Write Contacts', 'Create and update contacts', 1],
  ['read:calendar', 'Read Calendar', 'Read calendar events', 0],
  ['write:calendar', 'Write Calendar', 'Create and modify calendar events', 0],
  ['read:files', 'Read Files', 'Access user files', 1],
  ['write:files', 'Write Files', 'Upload and modify files', 1],
  ['admin:users', 'User Administration', 'Manage user accounts', 1],
]

for (const scope of scopes) {
  insertScope.run(...scope)
}

// Insert OAuth clients
console.log('Inserting OAuth clients...')
const insertClient = db.prepare(`
  INSERT INTO oauth_clients (client_id, client_secret, client_name, description, owner_email, owner_organization, application_type, status, logo_url, privacy_policy_url, terms_of_service_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const clients = [
  ['cli_acme_mobile_001', 'secret_acme_xyz789', 'ACME Mobile App', 'Official mobile application for ACME Services', 'dev@acme.com', 'ACME Corporation', 'mobile', 'active', 'https://acme.com/logo.png', 'https://acme.com/privacy', 'https://acme.com/terms'],
  ['cli_dashboard_web_002', 'secret_dash_abc123', 'Analytics Dashboard', 'Real-time analytics and reporting dashboard', 'admin@analytics.io', 'Analytics Inc', 'web', 'active', 'https://analytics.io/logo.png', 'https://analytics.io/privacy', 'https://analytics.io/terms'],
  ['cli_sync_service_003', 'secret_sync_def456', 'Cloud Sync Service', 'Background service for file synchronization', 'ops@cloudsync.net', 'CloudSync Technologies', 'service', 'active', null, 'https://cloudsync.net/privacy', null],
  ['cli_calendar_spa_004', 'secret_cal_ghi789', 'Calendar Plus', 'Enhanced calendar and scheduling application', 'support@calendarplus.app', 'Calendar Plus Ltd', 'spa', 'active', 'https://calendarplus.app/icon.png', 'https://calendarplus.app/privacy', 'https://calendarplus.app/tos'],
  ['cli_beta_test_005', 'secret_beta_jkl012', 'Beta Testing App', 'Application under development and testing', 'beta@testapp.dev', 'TestApp Developers', 'native', 'pending', null, null, null],
  ['cli_legacy_app_006', 'secret_legacy_mno345', 'Legacy Integration', 'Deprecated application for backward compatibility', 'legacy@oldapp.com', 'OldApp Inc', 'web', 'suspended', null, null, null],
]

for (const client of clients) {
  insertClient.run(...client)
}

// Insert redirect URIs
console.log('Inserting OAuth redirect URIs...')
const insertRedirect = db.prepare(`
  INSERT INTO oauth_redirect_uris (client_id, redirect_uri, is_primary)
  VALUES (?, ?, ?)
`)

const redirects = [
  ['cli_acme_mobile_001', 'acme://oauth/callback', 1],
  ['cli_acme_mobile_001', 'acme://auth', 0],
  ['cli_dashboard_web_002', 'https://analytics.io/oauth/callback', 1],
  ['cli_dashboard_web_002', 'https://analytics.io/auth/success', 0],
  ['cli_dashboard_web_002', 'http://localhost:3000/callback', 0],
  ['cli_sync_service_003', 'https://api.cloudsync.net/oauth/callback', 1],
  ['cli_calendar_spa_004', 'https://calendarplus.app/auth', 1],
  ['cli_calendar_spa_004', 'https://app.calendarplus.app/callback', 0],
  ['cli_beta_test_005', 'http://localhost:8080/auth/callback', 1],
  ['cli_legacy_app_006', 'https://oldapp.com/oauth', 1],
]

for (const redirect of redirects) {
  insertRedirect.run(...redirect)
}

// Insert client scopes
console.log('Inserting OAuth client scopes...')
const insertClientScope = db.prepare(`
  INSERT INTO oauth_client_scopes (client_id, scope_name)
  VALUES (?, ?)
`)

const clientScopes = [
  // ACME Mobile App - comprehensive access
  ['cli_acme_mobile_001', 'read:profile'],
  ['cli_acme_mobile_001', 'write:profile'],
  ['cli_acme_mobile_001', 'read:email'],
  ['cli_acme_mobile_001', 'read:contacts'],
  ['cli_acme_mobile_001', 'write:contacts'],
  ['cli_acme_mobile_001', 'read:calendar'],
  ['cli_acme_mobile_001', 'write:calendar'],
  // Analytics Dashboard - read-only analytics
  ['cli_dashboard_web_002', 'read:profile'],
  ['cli_dashboard_web_002', 'read:email'],
  // Cloud Sync Service - file management
  ['cli_sync_service_003', 'read:profile'],
  ['cli_sync_service_003', 'read:files'],
  ['cli_sync_service_003', 'write:files'],
  // Calendar Plus - calendar focused
  ['cli_calendar_spa_004', 'read:profile'],
  ['cli_calendar_spa_004', 'read:calendar'],
  ['cli_calendar_spa_004', 'write:calendar'],
  ['cli_calendar_spa_004', 'read:email'],
  // Beta Testing App - limited access
  ['cli_beta_test_005', 'read:profile'],
  ['cli_beta_test_005', 'read:email'],
  // Legacy App - minimal access
  ['cli_legacy_app_006', 'read:profile'],
]

for (const clientScope of clientScopes) {
  insertClientScope.run(...clientScope)
}

// Display summary
const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number }
const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
const equipCount = db.prepare('SELECT COUNT(*) as count FROM equipment_requests').get() as { count: number }
const trainingCount = db.prepare('SELECT COUNT(*) as count FROM training_enrollment').get() as { count: number }
const benefitsCount = db.prepare('SELECT COUNT(*) as count FROM benefits_enrollment').get() as { count: number }
const oauthClientsCount = db.prepare('SELECT COUNT(*) as count FROM oauth_clients').get() as { count: number }
const oauthScopesCount = db.prepare('SELECT COUNT(*) as count FROM oauth_scopes').get() as { count: number }
const oauthRedirectsCount = db.prepare('SELECT COUNT(*) as count FROM oauth_redirect_uris').get() as { count: number }
const oauthClientScopesCount = db.prepare('SELECT COUNT(*) as count FROM oauth_client_scopes').get() as { count: number }

console.log('\n✅ Demo database created successfully!')
console.log('================================================')
console.log(`Database location: ${DB_PATH}`)
console.log('------------------------------------------------')
console.log('EMPLOYEE ONBOARDING:')
console.log(`  Departments:         ${deptCount.count} records`)
console.log(`  Employees:           ${empCount.count} records`)
console.log(`  Equipment Requests:  ${equipCount.count} records`)
console.log(`  Training Enrollment: ${trainingCount.count} records`)
console.log(`  Benefits Enrollment: ${benefitsCount.count} records`)
console.log('------------------------------------------------')
console.log('OAUTH CLIENT ONBOARDING:')
console.log(`  OAuth Clients:       ${oauthClientsCount.count} records`)
console.log(`  OAuth Scopes:        ${oauthScopesCount.count} records`)
console.log(`  Redirect URIs:       ${oauthRedirectsCount.count} records`)
console.log(`  Client-Scope Links:  ${oauthClientScopesCount.count} records`)
console.log('================================================')
console.log('\nEmployee Onboarding Tables:')
console.log('  • departments (id, name, location, budget)')
console.log('  • employees (id, first_name, last_name, email, phone, department_id, hire_date, salary, is_remote)')
console.log('  • equipment_requests (id, employee_id, laptop_type, needs_monitor, needs_keyboard, needs_mouse)')
console.log('  • training_enrollment (id, employee_id, course_name, scheduled_date, completed)')
console.log('  • benefits_enrollment (id, employee_id, health_insurance, dental_insurance, vision_insurance, retirement_401k_percent)')
console.log('\nOAuth Client Onboarding Tables:')
console.log('  • oauth_clients (id, client_id, client_name, description, owner_email, application_type, status)')
console.log('  • oauth_scopes (id, scope_name, display_name, description, is_sensitive)')
console.log('  • oauth_redirect_uris (id, client_id, redirect_uri, is_primary)')
console.log('  • oauth_client_scopes (id, client_id, scope_name)')
console.log('  • oauth_tokens (id, client_id, token_type, expires_at, scopes, is_revoked)')
console.log('\nUse this database for creating onboarding flow demonstrations!')
console.log('Examples: Employee onboarding, Equipment requests, Benefits enrollment, OAuth app registration')


db.close()
