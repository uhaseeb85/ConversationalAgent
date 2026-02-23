/**
 * Creates a sample OAuth Client Registration flow with proper questions and SQL mappings
 * Run with: npx tsx scripts/create-oauth-sample-flow.ts
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

const APP_DB_PATH = join(process.cwd(), 'app.db')

if (!existsSync(APP_DB_PATH)) {
  console.error('❌ app.db not found. Please start the server first to create the database.')
  process.exit(1)
}

console.log('📝 Creating OAuth Client Registration sample flow...')

const db = new Database(APP_DB_PATH)

// Generate unique IDs
const generateId = () => crypto.randomBytes(16).toString('hex')

const flowId = generateId()
const now = new Date().toISOString()

// Define questions
const questions = [
  {
    id: generateId(),
    type: 'text',
    label: 'Application Name',
    placeholder: 'My Awesome App',
    helpText: 'What is the name of your application?',
    required: true,
    sqlColumnName: 'client_name',
    order: 0
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Client ID',
    placeholder: 'my-app-client-id',
    helpText: 'Unique identifier for your OAuth client (lowercase, no spaces)',
    required: true,
    sqlColumnName: 'client_id',
    order: 1
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Client Secret',
    placeholder: 'Generate a secure random string',
    helpText: 'Your application\'s secret key (keep this secure!)',
    required: true,
    sqlColumnName: 'client_secret',
    order: 2
  },
  {
    id: generateId(),
    type: 'email',
    label: 'Owner Email',
    placeholder: 'owner@company.com',
    helpText: 'Email address of the application owner',
    required: true,
    sqlColumnName: 'owner_email',
    order: 3
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Organization Name',
    placeholder: 'Acme Corporation',
    helpText: 'Name of your organization (optional)',
    required: false,
    sqlColumnName: 'owner_organization',
    order: 4
  },
  {
    id: generateId(),
    type: 'single-select',
    label: 'Application Type',
    helpText: 'What type of application is this?',
    options: ['web', 'mobile', 'spa', 'native', 'service'],
    required: true,
    sqlColumnName: 'application_type',
    order: 5
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Application Description',
    placeholder: 'A brief description of what your app does...',
    helpText: 'Describe your application\'s purpose',
    required: false,
    sqlColumnName: 'description',
    order: 6
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Logo URL',
    placeholder: 'https://example.com/logo.png',
    helpText: 'URL to your application logo (optional)',
    required: false,
    sqlColumnName: 'logo_url',
    order: 7
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Privacy Policy URL',
    placeholder: 'https://example.com/privacy',
    helpText: 'Link to your privacy policy (optional)',
    required: false,
    sqlColumnName: 'privacy_policy_url',
    order: 8
  },
  {
    id: generateId(),
    type: 'text',
    label: 'Terms of Service URL',
    placeholder: 'https://example.com/terms',
    helpText: 'Link to your terms of service (optional)',
    required: false,
    sqlColumnName: 'terms_of_service_url',
    order: 9
  }
]

// Define SQL operation
const sqlOperationId = generateId()
const sqlOperations = [
  {
    id: sqlOperationId,
    operationType: 'INSERT',
    tableName: 'oauth_clients',
    label: 'Create OAuth Client',
    order: 0,
    columnMappings: [
      { questionId: questions[0].id, columnName: 'client_name' },      // Application Name
      { questionId: questions[1].id, columnName: 'client_id' },        // Client ID
      { questionId: questions[2].id, columnName: 'client_secret' },    // Client Secret
      { questionId: questions[3].id, columnName: 'owner_email' },      // Owner Email
      { questionId: questions[4].id, columnName: 'owner_organization' }, // Organization
      { questionId: questions[5].id, columnName: 'application_type' }, // App Type
      { questionId: questions[6].id, columnName: 'description' },      // Description
      { questionId: questions[7].id, columnName: 'logo_url' },         // Logo URL
      { questionId: questions[8].id, columnName: 'privacy_policy_url' }, // Privacy Policy
      { questionId: questions[9].id, columnName: 'terms_of_service_url' } // Terms of Service
    ],
    conditions: []
  }
]

// Create the flow
const flowData = {
  id: flowId,
  name: 'OAuth Client Registration',
  description: 'Register a new OAuth 2.0 client application with proper credentials and metadata',
  welcomeMessage: '🔐 Welcome to OAuth Client Registration!\n\nThis form will help you register your application to use our OAuth 2.0 authentication service.\n\nPlease provide accurate information about your application.',
  completionMessage: '✅ Success! Your OAuth client has been registered.\n\nYour application is now set up for OAuth authentication. Please save your Client ID and Client Secret securely - you\'ll need them to authenticate.',
  tableName: 'oauth_clients',
  isActive: true,
  createdAt: now,
  updatedAt: now
}

try {
  // Insert the flow
  const insertFlow = db.prepare(`
    INSERT INTO flows (id, name, description, welcome_message, completion_message, table_name, questions, sql_operations, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertFlow.run(
    flowData.id,
    flowData.name,
    flowData.description,
    flowData.welcomeMessage,
    flowData.completionMessage,
    flowData.tableName,
    JSON.stringify(questions),
    JSON.stringify(sqlOperations),
    flowData.isActive ? 1 : 0,
    flowData.createdAt,
    flowData.updatedAt
  )

  console.log('✅ Sample flow created successfully!')
  console.log('')
  console.log('📋 Flow Details:')
  console.log(`   Name: ${flowData.name}`)
  console.log(`   Questions: ${questions.length}`)
  console.log(`   SQL Operations: ${sqlOperations.length}`)
  console.log(`   Target Table: ${flowData.tableName}`)
  console.log('')
  console.log('🎯 Column Mappings:')
  sqlOperations[0].columnMappings.forEach((mapping, idx) => {
    const question = questions.find(q => q.id === mapping.questionId)
    console.log(`   ${idx + 1}. ${question?.label} → ${mapping.columnName}`)
  })
  console.log('')
  console.log('💡 You can now:')
  console.log('   1. View the flow in the admin dashboard')
  console.log('   2. Edit it in the Flow Builder')
  console.log('   3. Test it by submitting a sample OAuth client registration')
  console.log('')

} catch (error) {
  console.error('❌ Error creating flow:', error)
  process.exit(1)
} finally {
  db.close()
}
