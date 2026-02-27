import { generateId } from './utils'
import type { OnboardingFlow, Question, SQLOperation, UserDefinedTable, UserDefinedColumn } from '../types'

/**
 * Creates a sample OAuth Client Registration demo flow
 * that users can explore to understand how the app works.
 */
export function createDemoFlow(): OnboardingFlow {
  const flowId = generateId()

  // Question IDs
  const qAppName = generateId()
  const qClientType = generateId()
  const qRedirectUris = generateId()
  const qGrantTypes = generateId()
  const qScopes = generateId()
  const qContactEmail = generateId()
  const qDescription = generateId()
  const qLogoUrl = generateId()

  const questions: Question[] = [
    {
      id: qAppName,
      type: 'text',
      label: 'Application Name',
      placeholder: 'e.g. My SaaS App',
      helpText: 'A display name for your OAuth application.',
      required: true,
      validationRules: [{ type: 'required', message: 'Application name is required' }],
      sqlColumnName: 'app_name',
      tableName: 'oauth_clients',
      order: 0,
    },
    {
      id: qClientType,
      type: 'single-select',
      label: 'Client Type',
      helpText: 'Confidential clients can keep secrets secure (server-side). Public clients cannot (SPAs, mobile).',
      options: ['confidential', 'public'],
      required: true,
      validationRules: [{ type: 'required', message: 'Please select a client type' }],
      sqlColumnName: 'client_type',
      tableName: 'oauth_clients',
      order: 1,
    },
    {
      id: qRedirectUris,
      type: 'text',
      label: 'Redirect URIs',
      placeholder: 'https://myapp.example.com/callback',
      helpText: 'Comma-separated list of allowed redirect URIs.',
      required: true,
      validationRules: [{ type: 'required', message: 'At least one redirect URI is required' }],
      sqlColumnName: 'redirect_uris',
      tableName: 'oauth_clients',
      order: 2,
    },
    {
      id: qGrantTypes,
      type: 'multi-select',
      label: 'Grant Types',
      helpText: 'Select the OAuth grant types your application requires.',
      options: ['authorization_code', 'client_credentials', 'refresh_token', 'implicit'],
      required: true,
      validationRules: [{ type: 'required', message: 'Select at least one grant type' }],
      sqlColumnName: 'grant_types',
      tableName: 'oauth_clients',
      order: 3,
    },
    {
      id: qScopes,
      type: 'multi-select',
      label: 'Requested Scopes',
      helpText: 'Scopes define the level of access your application is requesting.',
      options: ['openid', 'profile', 'email', 'read', 'write', 'admin'],
      required: true,
      validationRules: [{ type: 'required', message: 'Select at least one scope' }],
      sqlColumnName: 'scopes',
      tableName: 'oauth_clients',
      order: 4,
    },
    {
      id: qContactEmail,
      type: 'email',
      label: 'Contact Email',
      placeholder: 'developer@example.com',
      helpText: 'We\'ll use this to notify you about breaking API changes.',
      required: true,
      validationRules: [{ type: 'required', message: 'Contact email is required' }],
      sqlColumnName: 'contact_email',
      tableName: 'oauth_clients',
      order: 5,
    },
    {
      id: qDescription,
      type: 'text',
      label: 'Application Description',
      placeholder: 'A brief description of what your app does...',
      helpText: 'Shown to users on the consent screen.',
      required: false,
      validationRules: [],
      sqlColumnName: 'description',
      tableName: 'oauth_clients',
      order: 6,
    },
    {
      id: qLogoUrl,
      type: 'text',
      label: 'Logo URL',
      placeholder: 'https://myapp.example.com/logo.png',
      helpText: 'Optional logo displayed on the OAuth consent screen.',
      required: false,
      validationRules: [],
      sqlColumnName: 'logo_url',
      tableName: 'oauth_clients',
      order: 7,
    },
  ]

  const tableId = generateId()
  const columns: UserDefinedColumn[] = [
    { id: generateId(), name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true, description: 'Auto-increment primary key' },
    { id: generateId(), name: 'app_name', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Display name' },
    { id: generateId(), name: 'client_type', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'confidential or public' },
    { id: generateId(), name: 'redirect_uris', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated URIs' },
    { id: generateId(), name: 'grant_types', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated grant types' },
    { id: generateId(), name: 'scopes', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Comma-separated scopes' },
    { id: generateId(), name: 'contact_email', dataType: 'text', nullable: false, isPrimaryKey: false, description: 'Developer contact' },
    { id: generateId(), name: 'description', dataType: 'text', nullable: true, isPrimaryKey: false, description: 'App description' },
    { id: generateId(), name: 'logo_url', dataType: 'text', nullable: true, isPrimaryKey: false, description: 'Logo URL for consent screen' },
  ]

  const table: UserDefinedTable = {
    id: tableId,
    name: 'oauth_clients',
    description: 'OAuth 2.0 client registrations',
    columns,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const sqlOp: SQLOperation = {
    id: generateId(),
    operationType: 'INSERT',
    tableName: 'oauth_clients',
    label: 'Register OAuth Client',
    columnMappings: [
      { questionId: qAppName, columnName: 'app_name' },
      { questionId: qClientType, columnName: 'client_type' },
      { questionId: qRedirectUris, columnName: 'redirect_uris' },
      { questionId: qGrantTypes, columnName: 'grant_types' },
      { questionId: qScopes, columnName: 'scopes' },
      { questionId: qContactEmail, columnName: 'contact_email' },
      { questionId: qDescription, columnName: 'description' },
      { questionId: qLogoUrl, columnName: 'logo_url' },
    ],
    conditions: [],
    order: 0,
  }

  return {
    id: flowId,
    name: 'OAuth Client Registration (Demo)',
    description:
      'Sample flow demonstrating how to collect information for registering an OAuth 2.0 client application. Explore this to understand questions, SQL mappings, and the conversational UI.',
    welcomeMessage:
      'Welcome! This demo walks you through registering a new OAuth client. Answer each question to see how the conversational onboarding works.',
    completionMessage:
      'Registration complete! You can view the generated SQL on the Submissions page.',
    tableName: 'oauth_clients',
    sqlOperations: [sqlOp],
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
