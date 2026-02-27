import type { OnboardingFlow, Question, SQLOperation, UserDefinedTable, UserDefinedColumn } from '../types'

/**
 * Fixed ID for the demo flow — prevents duplicate seeding in IndexedDB.
 */
export const DEMO_FLOW_ID = '00000000demo0000oauth0client0reg'

// Fixed question IDs so column-mappings and conditions stay stable
const qOperation = 'demo-q-operation-type'
const qClientId = 'demo-q-client-id'
const qAppName = 'demo-q-app-name'
const qClientType = 'demo-q-client-type'
const qRedirectUris = 'demo-q-redirect-uris'
const qGrantTypes = 'demo-q-grant-types'
const qScopes = 'demo-q-scopes'
const qContactEmail = 'demo-q-contact-email'
const qDescription = 'demo-q-description'
const qLogoUrl = 'demo-q-logo-url'

/**
 * Creates the demo OAuth Client Registration flow.
 * Uses fixed IDs so re-seeding overwrites instead of duplicating.
 * Demonstrates INSERT + UPDATE (with WHERE), conditional logic, and validation rules.
 */
export function createDemoFlow(): OnboardingFlow {
  const questions: Question[] = [
    {
      id: qOperation,
      type: 'single-select',
      label: 'What would you like to do?',
      helpText: 'Register a brand-new client or update an existing one.',
      options: ['Register new client', 'Update existing client'],
      required: true,
      validationRules: [{ type: 'required', message: 'Please choose an operation' }],
      sqlColumnName: '_operation',
      tableName: 'oauth_clients',
      order: 0,
    },
    {
      id: qClientId,
      type: 'number',
      label: 'What is the existing Client ID you want to update?',
      placeholder: 'e.g. 42',
      helpText: 'The numeric ID of the client you want to update.',
      required: true,
      validationRules: [
        { type: 'required', message: 'Client ID is required for updates' },
        { type: 'min', value: 1, message: 'Client ID must be at least 1' },
      ],
      sqlColumnName: 'id',
      tableName: 'oauth_clients',
      order: 1,
      conditionalLogic: {
        questionId: qOperation,
        operator: 'equals',
        value: 'Update existing client',
      },
    },
    {
      id: qAppName,
      type: 'text',
      label: 'What is the name of your application?',
      placeholder: 'e.g. My SaaS App',
      helpText: 'A display name for your OAuth application.',
      required: true,
      validationRules: [
        { type: 'required', message: 'Application name is required' },
        { type: 'min-length', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'max-length', value: 100, message: 'Name must be at most 100 characters' },
      ],
      sqlColumnName: 'app_name',
      tableName: 'oauth_clients',
      order: 2,
    },
    {
      id: qClientType,
      type: 'single-select',
      label: 'What type of client is your application?',
      helpText: 'Confidential clients can keep secrets secure (server-side). Public clients cannot (SPAs, mobile).',
      options: ['confidential', 'public'],
      required: true,
      validationRules: [{ type: 'required', message: 'Please select a client type' }],
      sqlColumnName: 'client_type',
      tableName: 'oauth_clients',
      order: 3,
    },
    {
      id: qRedirectUris,
      type: 'text',
      label: 'What are the redirect URIs for your application?',
      placeholder: 'https://myapp.example.com/callback',
      helpText: 'Comma-separated list of allowed redirect URIs.',
      required: true,
      validationRules: [
        { type: 'required', message: 'At least one redirect URI is required' },
        { type: 'pattern', value: 'https?://', message: 'Must start with http:// or https://' },
      ],
      sqlColumnName: 'redirect_uris',
      tableName: 'oauth_clients',
      order: 4,
    },
    {
      id: qGrantTypes,
      type: 'multi-select',
      label: 'Which OAuth grant types does your application need?',
      helpText: 'Select the OAuth grant types your application requires.',
      options: ['authorization_code', 'client_credentials', 'refresh_token', 'implicit'],
      required: true,
      validationRules: [{ type: 'required', message: 'Select at least one grant type' }],
      sqlColumnName: 'grant_types',
      tableName: 'oauth_clients',
      order: 5,
    },
    {
      id: qScopes,
      type: 'multi-select',
      label: 'Which access scopes should your application request?',
      helpText: 'Scopes define the level of access your application is requesting.',
      options: ['openid', 'profile', 'email', 'read', 'write', 'admin'],
      required: true,
      validationRules: [{ type: 'required', message: 'Select at least one scope' }],
      sqlColumnName: 'scopes',
      tableName: 'oauth_clients',
      order: 6,
    },
    {
      id: qContactEmail,
      type: 'email',
      label: 'What is your developer contact email?',
      placeholder: 'developer@example.com',
      helpText: "We'll use this to notify you about breaking API changes.",
      required: true,
      validationRules: [
        { type: 'required', message: 'Contact email is required' },
        { type: 'pattern', value: '^[^@]+@[^@]+\\.[^@]+$', message: 'Enter a valid email address' },
      ],
      sqlColumnName: 'contact_email',
      tableName: 'oauth_clients',
      order: 7,
    },
    {
      id: qDescription,
      type: 'text',
      label: 'How would you describe your application?',
      placeholder: 'A brief description of what your app does...',
      helpText: 'Shown to users on the consent screen.',
      required: false,
      validationRules: [
        { type: 'max-length', value: 500, message: 'Description must be under 500 characters' },
      ],
      sqlColumnName: 'description',
      tableName: 'oauth_clients',
      order: 8,
    },
    {
      id: qLogoUrl,
      type: 'text',
      label: 'What is the URL of your application logo?',
      placeholder: 'https://myapp.example.com/logo.png',
      helpText: 'Optional logo displayed on the OAuth consent screen.',
      required: false,
      validationRules: [
        { type: 'pattern', value: 'https?://', message: 'Must be a valid URL starting with http(s)://' },
      ],
      sqlColumnName: 'logo_url',
      tableName: 'oauth_clients',
      order: 9,
    },
  ]

  const columns: UserDefinedColumn[] = [
    { id: 'demo-col-id', name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true, description: 'Auto-increment primary key' },
    { id: 'demo-col-app-name', name: 'app_name', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Display name' },
    { id: 'demo-col-client-type', name: 'client_type', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'confidential or public' },
    { id: 'demo-col-redirect-uris', name: 'redirect_uris', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated URIs' },
    { id: 'demo-col-grant-types', name: 'grant_types', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated grant types' },
    { id: 'demo-col-scopes', name: 'scopes', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated scopes' },
    { id: 'demo-col-contact-email', name: 'contact_email', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Developer contact' },
    { id: 'demo-col-description', name: 'description', dataType: 'text', nullable: true, isPrimaryKey: false, description: 'App description' },
    { id: 'demo-col-logo-url', name: 'logo_url', dataType: 'text', nullable: true, isPrimaryKey: false, description: 'Logo URL for consent screen' },
  ]

  const table: UserDefinedTable = {
    id: 'demo-table-oauth-clients',
    name: 'oauth_clients',
    description: 'OAuth 2.0 client registrations',
    columns,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Shared column mappings (used by both INSERT and UPDATE)
  const sharedMappings = [
    { questionId: qAppName, columnName: 'app_name' },
    { questionId: qClientType, columnName: 'client_type' },
    { questionId: qRedirectUris, columnName: 'redirect_uris' },
    { questionId: qGrantTypes, columnName: 'grant_types' },
    { questionId: qScopes, columnName: 'scopes' },
    { questionId: qContactEmail, columnName: 'contact_email' },
    { questionId: qDescription, columnName: 'description' },
    { questionId: qLogoUrl, columnName: 'logo_url' },
  ]

  const insertOp: SQLOperation = {
    id: 'demo-op-insert',
    operationType: 'INSERT',
    tableName: 'oauth_clients',
    label: 'Register New OAuth Client',
    columnMappings: sharedMappings,
    conditions: [],
    order: 0,
  }

  const updateOp: SQLOperation = {
    id: 'demo-op-update',
    operationType: 'UPDATE',
    tableName: 'oauth_clients',
    label: 'Update Existing OAuth Client',
    columnMappings: sharedMappings,
    conditions: [
      {
        id: 'demo-cond-client-id',
        columnName: 'id',
        operator: 'equals',
        value: `\${${qClientId}}`,
        valueType: 'question',
      },
    ],
    order: 1,
  }

  return {
    id: DEMO_FLOW_ID,
    name: 'OAuth Client Registration (Demo)',
    description:
      'Sample flow demonstrating INSERT & UPDATE operations, conditional logic, and validation rules for registering / updating an OAuth 2.0 client.',
    welcomeMessage:
      'Welcome! This demo walks you through registering or updating an OAuth client. Answer each question to see how the conversational onboarding works.',
    completionMessage:
      'Done! You can view the generated SQL on the Submissions page.',
    tableName: 'oauth_clients',
    sqlOperations: [insertOp, updateOp],
    userDefinedTables: [table],
    questions,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isPublic: false,
    schemaContext: `CREATE TABLE oauth_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('confidential', 'public')),
  redirect_uris TEXT NOT NULL,
  grant_types TEXT NOT NULL,
  scopes TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  description TEXT,
  logo_url TEXT
);`,
  }
}
