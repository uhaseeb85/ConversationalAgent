# Example Onboarding Flows Using the Demo Database

This guide shows you how to create sample onboarding flows using the pre-populated demo database.

## Getting Started

1. **Ensure the demo database is loaded:**
   - Open Settings page
   - The demo database should auto-load on first visit
   - Or click "Load Demo Database" button
   - Click "Connect & Test" - you should see 10 tables

2. **Available Tables:**
   
   **Employee Onboarding:**
   - `departments`
   - `employees`
   - `equipment_requests`
   - `training_enrollment`
   - `benefits_enrollment`
   
   **OAuth Client Onboarding:**
   - `oauth_clients`
   - `oauth_scopes`
   - `oauth_redirect_uris`
   - `oauth_client_scopes`
   - `oauth_tokens`

---

## Part A: Employee Onboarding Flows

## Example 1: New Employee Onboarding

**Goal:** Collect new employee information and add them to the database

### Flow Configuration

**Flow Name:** "New Employee Onboarding"  
**Description:** "Welcome! Let's get you set up in our system."

### Questions:

1. **First Name**
   - Type: Text
   - Required: Yes
   - SQL Column: `employees.first_name`

2. **Last Name**
   - Type: Text
   - Required: Yes
   - SQL Column: `employees.last_name`

3. **Email Address**
   - Type: Email
   - Required: Yes
   - SQL Column: `employees.email`

4. **Phone Number**
   - Type: Phone
   - SQL Column: `employees.phone`

5. **Department**
   - Type: Single Select
   - Options: Engineering, Product, Marketing, Sales, Human Resources, Finance
   - SQL Column: `employees.department_id`
   - Note: Map option names to department IDs (1-6)

6. **Hire Date**
   - Type: Date
   - SQL Column: `employees.hire_date`

7. **Working Remotely?**
   - Type: Yes/No
   - SQL Column: `employees.is_remote`

### SQL Operation:

**Operation Type:** INSERT  
**Table:** `employees`  
**Column Mappings:**
- Q1 → `first_name`
- Q2 → `last_name`
- Q3 → `email`
- Q4 → `phone`
- Q5 → `department_id`
- Q6 → `hire_date`
- Q7 → `is_remote`

---

## Example 2: Equipment Request

**Goal:** Let employees request equipment for their workspace

### Flow Configuration

**Flow Name:** "Equipment Request"  
**Description:** "Request the equipment you need to be productive"

### Questions:

1. **Employee Email**
   - Type: Email
   - Required: Yes
   - Used to lookup employee ID

2. **Laptop Type**
   - Type: Single Select
   - Options: MacBook Pro 16", MacBook Pro 14", MacBook Air, ThinkPad X1 Carbon, Dell XPS 15
   - SQL Column: `equipment_requests.laptop_type`

3. **Need External Monitor?**
   - Type: Yes/No
   - SQL Column: `equipment_requests.needs_monitor`

4. **Need Keyboard?**
   - Type: Yes/No
   - SQL Column: `equipment_requests.needs_keyboard`

5. **Need Mouse?**
   - Type: Yes/No
   - SQL Column: `equipment_requests.needs_mouse`

6. **Additional Notes**
   - Type: Text
   - SQL Column: `equipment_requests.additional_notes`

### SQL Operations:

**Operation Type:** INSERT  
**Table:** `equipment_requests`  
**Column Mappings:**
- Lookup employee_id from Q1 (email)
- Q2 → `laptop_type`
- Q3 → `needs_monitor`
- Q4 → `needs_keyboard`
- Q5 → `needs_mouse`
- Q6 → `additional_notes`

**Default Values:**
- `status` = 'pending'

---

## Example 3: Benefits Enrollment

**Goal:** Enroll employees in health and retirement benefits

### Flow Configuration

**Flow Name:** "Benefits Enrollment 2024"  
**Description:** "Select your health insurance and retirement options"

### Questions:

1. **Employee Email**
   - Type: Email
   - Required: Yes

2. **Health Insurance Plan**
   - Type: Single Select
   - Options: Premium PPO, Standard HMO, High Deductible, Opt Out
   - SQL Column: `benefits_enrollment.health_insurance`

3. **Add Dental Insurance?**
   - Type: Yes/No
   - SQL Column: `benefits_enrollment.dental_insurance`

4. **Add Vision Insurance?**
   - Type: Yes/No
   - SQL Column: `benefits_enrollment.vision_insurance`

5. **401(k) Contribution Percentage**
   - Type: Number
   - Min: 0, Max: 100
   - SQL Column: `benefits_enrollment.retirement_401k_percent`

6. **Beneficiary Name**
   - Type: Text
   - SQL Column: `benefits_enrollment.beneficiary_name`
   - Conditional: Only show if Q5 > 0

7. **Beneficiary Relationship**
   - Type: Single Select
   - Options: Spouse, Child, Parent, Sibling, Other
   - SQL Column: `benefits_enrollment.beneficiary_relationship`
   - Conditional: Only show if Q5 > 0

### SQL Operations:

**Operation Type:** INSERT  
**Table:** `benefits_enrollment`  
**Column Mappings:**
- Lookup employee_id from Q1
- Q2 → `health_insurance`
- Q3 → `dental_insurance`
- Q4 → `vision_insurance`
- Q5 → `retirement_401k_percent`
- Q6 → `beneficiary_name`
- Q7 → `beneficiary_relationship`

---

## Example 4: Training Enrollment

**Goal:** Let employees sign up for training courses

### Flow Configuration

**Flow Name:** "Training Course Enrollment"  
**Description:** "Choose from available training courses"

### Questions:

1. **Employee Email**
   - Type: Email
   - Required: Yes

2. **Training Course**
   - Type: Single Select
   - Options:
     - Security Awareness
     - Leadership Fundamentals
     - Git & GitHub Basics
     - Product Management 101
     - Content Marketing
     - Public Speaking
     - Project Management Professional (PMP)
   - SQL Column: `training_enrollment.course_name`

3. **Preferred Date**
   - Type: Date
   - SQL Column: `training_enrollment.scheduled_date`

### SQL Operations:

**Operation Type:** INSERT  
**Table:** `training_enrollment`  
**Column Mappings:**
- Lookup employee_id from Q1
- Q2 → `course_name`
- Q3 → `scheduled_date`

**Default Values:**
- `completed` = 0

---

## Example 5: Update Employee Information

**Goal:** Allow employees to update their contact information

### Flow Configuration

**Flow Name:** "Update Contact Information"  
**Description:** "Keep your contact details current"

### Questions:

1. **Your Email**
   - Type: Email
   - Required: Yes

2. **New Phone Number**
   - Type: Phone
   - SQL Column: `employees.phone`

3. **Emergency Contact Name**
   - Type: Text
   - SQL Column: `employees.emergency_contact_name`

4. **Emergency Contact Phone**
   - Type: Phone
   - SQL Column: `employees.emergency_contact_phone`

### SQL Operations:

**Operation Type:** UPDATE  
**Table:** `employees`  
**Column Mappings:**
- Q2 → `phone`
- Q3 → `emergency_contact_name`
- Q4 → `emergency_contact_phone`

**Conditions:**
- WHERE `email` = ${Q1}

---

## Tips for Creating Flows

### Using Schema Import
1. Go to Flow Builder
2. Click "Schema" tab
3. Click "Import from Database"
4. Select a table to see its structure
5. Use "Suggest Questions" to auto-generate questions

### Testing Your Flows
1. Build your flow with questions and SQL operations
2. Use the "Simulator" tab to preview the user experience
3. Submit test data
4. Check the "Submissions" page to see results
5. Verify data was inserted correctly in the database

### SQL Mapping Strategies
- **INSERT operations:** Map each question to a column
- **UPDATE operations:** Use WHERE conditions with employee email or ID
- **Lookups:** Use subqueries to convert emails to employee IDs
- **Conditional inserts:** Use conditional logic on questions to control which data is collected

### Common Patterns
1. **Email as identifier:** Always ask for email first to identify the employee
2. **Yes/No to Boolean:** Map Yes/No questions to INTEGER columns (0/1)
3. **Dropdowns to IDs:** Map department/reference names to their IDs
4. **Default values:** Set status fields to "pending" or timestamps to CURRENT_TIMESTAMP

---

## Viewing Results

After submitting test flows:

1. **Check Submissions Page:**
   - See all form submissions
   - View generated SQL
   - Check execution status

2. **Query the Database:**
   - Go to Settings → Database Connection
   - Use the query interface (if available)
   - Or use SQLite browser to inspect `demo/company-onboarding.db`

3. **Verify Data:**
   ```sql
   SELECT * FROM employees ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM equipment_requests WHERE status = 'pending';
   SELECT * FROM benefits_enrollment;
   ```

---

## Advanced Examples

### Multi-table Insert (Equipment + Employee)
Create a flow that inserts a new employee AND their equipment request:

**SQL Operations:**
1. INSERT into `employees` (Operation 1)
2. INSERT into `equipment_requests` using the new employee's data (Operation 2)

### Conditional Updates
Update employee salary only if they're in a specific department:

**Conditions:**
- WHERE `email` = ${Q1}
- AND `department_id` = 1 (Engineering)

### Batch Training Enrollment
Enroll employees in multiple required courses:

**SQL Operations:**
1. INSERT Security Awareness course
2. INSERT Git Basics course
3. INSERT Company Culture course

All three operations use the same employee_id from Q1.

---

## Need Help?

- Check the demo database README in `/demo/README.md`
- Review table schemas using "Import from Database" feature
- Use AI suggestions for question generation
- Test with the Simulator before submitting real data

Happy onboarding! 🎉

---

## Part B: OAuth Client Onboarding Flows

### Example 6: OAuth Application Registration

**Goal:** Allow developers to register new OAuth applications

#### Flow Configuration

**Flow Name:** "Register OAuth Application"  
**Description:** "Register your application to access our API"

#### Questions:

1. **Application Name**
   - Type: Text
   - Required: Yes
   - SQL Column: `oauth_clients.client_name`
   - Example: "ACME Mobile App"

2. **Application Description**
   - Type: Text
   - Required: Yes
   - SQL Column: `oauth_clients.description`
   - Example: "Official mobile application for ACME Services"

3. **Your Email Address**
   - Type: Email
   - Required: Yes
   - SQL Column: `oauth_clients.owner_email`

4. **Organization Name**
   - Type: Text
   - SQL Column: `oauth_clients.owner_organization`
   - Example: "ACME Corporation"

5. **Application Type**
   - Type: Single Select
   - Required: Yes
   - Options: Web Application, Mobile App, Single Page App, Native App, Service/Backend
   - SQL Column: `oauth_clients.application_type`
   - Map: "Web Application" → "web", "Mobile App" → "mobile", etc.

6. **Primary Redirect URI**
   - Type: Text
   - Required: Yes
   - SQL Column: `oauth_redirect_uris.redirect_uri`
   - Example: "https://myapp.com/oauth/callback"

7. **Additional Redirect URIs** (optional)
   - Type: Text
   - SQL Column: `oauth_redirect_uris.redirect_uri`
   - Example: "https://app.myapp.com/auth"

8. **Logo URL** (optional)
   - Type: Text
   - SQL Column: `oauth_clients.logo_url`

9. **Privacy Policy URL**
   - Type: Text
   - SQL Column: `oauth_clients.privacy_policy_url`

10. **Terms of Service URL** (optional)
    - Type: Text
    - SQL Column: `oauth_clients.terms_of_service_url`

#### SQL Operations:

**Operation 1: Create OAuth Client**
- **Type:** INSERT
- **Table:** `oauth_clients`
- **Column Mappings:**
  - Generate unique `client_id` (e.g., "cli_" + random)
  - Generate random `client_secret`
  - Q1 → `client_name`
  - Q2 → `description`
  - Q3 → `owner_email`
  - Q4 → `owner_organization`
  - Q5 → `application_type`
  - Q8 → `logo_url`
  - Q9 → `privacy_policy_url`
  - Q10 → `terms_of_service_url`
- **Default Values:**
  - `status` = 'pending'

**Operation 2: Add Primary Redirect URI**
- **Type:** INSERT
- **Table:** `oauth_redirect_uris`
- **Column Mappings:**
  - Use generated `client_id` from Operation 1
  - Q6 → `redirect_uri`
  - Set `is_primary` = 1

**Operation 3: Add Additional Redirect URI** (conditional on Q7)
- **Type:** INSERT
- **Table:** `oauth_redirect_uris`
- **Column Mappings:**
  - Use generated `client_id` from Operation 1
  - Q7 → `redirect_uri`
  - Set `is_primary` = 0

---

### Example 7: Request API Scopes

**Goal:** Let developers request specific API permissions for their OAuth application

#### Flow Configuration

**Flow Name:** "Request API Access Scopes"  
**Description:** "Select the permissions your application needs"

#### Questions:

1. **Your Application**
   - Type: Single Select
   - Required: Yes
   - Options: Load from `oauth_clients` table where status='active'
   - Display: `client_name`
   - Value: `client_id`

2. **Do you need to read user profiles?**
   - Type: Yes/No
   - Maps to scope: `read:profile`

3. **Do you need to update user profiles?**
   - Type: Yes/No
   - Maps to scope: `write:profile`
   - Conditional: Only show if Q2 = Yes

4. **Do you need access to user email addresses?**
   - Type: Yes/No
   - Maps to scope: `read:email`

5. **Do you need to access user contacts?**
   - Type: Yes/No
   - Maps to scope: `read:contacts`

6. **Do you need to modify user contacts?**
   - Type: Yes/No
   - Maps to scope: `write:contacts`
   - Conditional: Only show if Q5 = Yes

7. **Do you need to read user calendars?**
   - Type: Yes/No
   - Maps to scope: `read:calendar`

8. **Do you need to modify user calendars?**
   - Type: Yes/No
   - Maps to scope: `write:calendar`
   - Conditional: Only show if Q7 = Yes

9. **Do you need to access user files?**
   - Type: Yes/No
   - Maps to scope: `read:files`

10. **Do you need to upload/modify user files?**
    - Type: Yes/No
    - Maps to scope: `write:files`
    - Conditional: Only show if Q9 = Yes

#### SQL Operations:

Multiple INSERT operations into `oauth_client_scopes` based on Yes answers:

**For each "Yes" answer:**
- **Type:** INSERT
- **Table:** `oauth_client_scopes`
- **Column Mappings:**
  - Q1 → `client_id`
  - Corresponding scope → `scope_name`

Example:
- If Q2 = Yes: INSERT (client_id, 'read:profile')
- If Q3 = Yes: INSERT (client_id, 'write:profile')
- etc.

---

### Example 8: Add Redirect URI to Existing App

**Goal:** Allow developers to add additional callback URLs to their OAuth application

#### Flow Configuration

**Flow Name:** "Add Redirect URI"  
**Description:** "Add an authorized redirect URI to your application"

#### Questions:

1. **Select Your Application**
   - Type: Single Select
   - Required: Yes
   - Load from: `oauth_clients` where owner_email = [authenticated user]
   - Display: `client_name`
   - Value: `client_id`

2. **New Redirect URI**
   - Type: Text
   - Required: Yes
   - Validation: Must start with https:// (or custom scheme for mobile)
   - SQL Column: `oauth_redirect_uris.redirect_uri`

3. **Set as Primary?**
   - Type: Yes/No
   - SQL Column: `oauth_redirect_uris.is_primary`

#### SQL Operations:

**Operation 1: Insert New Redirect URI**
- **Type:** INSERT
- **Table:** `oauth_redirect_uris`
- **Column Mappings:**
  - Q1 → `client_id`
  - Q2 → `redirect_uri`
  - Q3 → `is_primary` (1 if Yes, 0 if No)

**Operation 2: Unset Previous Primary** (conditional on Q3 = Yes)
- **Type:** UPDATE
- **Table:** `oauth_redirect_uris`
- **Set:** `is_primary` = 0
- **Conditions:**
  - WHERE `client_id` = ${Q1}
  - AND `redirect_uri` != ${Q2}

---

### Example 9: Update OAuth Application Status

**Goal:** Admin workflow to approve/suspend OAuth applications

#### Flow Configuration

**Flow Name:** "Update Application Status"  
**Description:** "Admin: Approve or suspend OAuth applications"

#### Questions:

1. **Application to Update**
   - Type: Single Select
   - Load from: `oauth_clients`
   - Display: `client_name` + " (" + `owner_email` + ")"
   - Value: `client_id`

2. **New Status**
   - Type: Single Select
   - Required: Yes
   - Options: Pending Review, Active (Approved), Suspended, Revoked
   - SQL Column: `oauth_clients.status`
   - Map: "Active (Approved)" → "active", etc.

3. **Reason for Status Change** (optional)
   - Type: Text
   - For audit logging

#### SQL Operations:

**Operation 1: Update Status**
- **Type:** UPDATE
- **Table:** `oauth_clients`
- **Column Mappings:**
  - Q2 → `status`
  - Current timestamp → `updated_at`
- **Conditions:**
  - WHERE `client_id` = ${Q1}

---

### Example 10: Revoke OAuth Client Access

**Goal:** Allow developers to revoke/delete their OAuth application

#### Flow Configuration

**Flow Name:** "Revoke Application Access"  
**Description:** "Permanently revoke your application's access"

#### Questions:

1. **Your Email**
   - Type: Email
   - Required: Yes
   - For verification

2. **Application to Revoke**
   - Type: Single Select
   - Required: Yes
   - Load from: `oauth_clients` WHERE `owner_email` = ${Q1}
   - Display: `client_name`
   - Value: `client_id`

3. **Confirmation**
   - Type: Text
   - Required: Yes
   - Validation: Must type "REVOKE" exactly
   - Question: "Type REVOKE to confirm"

#### SQL Operations:

**Operation 1: Update Client Status**
- **Type:** UPDATE
- **Table:** `oauth_clients`
- **Set:**
  - `status` = 'revoked'
  - `updated_at` = CURRENT_TIMESTAMP
- **Conditions:**
  - WHERE `client_id` = ${Q2}
  - AND `owner_email` = ${Q1}

**Operation 2: Revoke All Tokens**
- **Type:** UPDATE
- **Table:** `oauth_tokens`
- **Set:**
  - `is_revoked` = 1
- **Conditions:**
  - WHERE `client_id` = ${Q2}

---

## OAuth Flow Testing Tips

### Viewing Registered Applications

Query to see all registered applications:
```sql
SELECT 
  client_id, 
  client_name, 
  owner_email, 
  application_type, 
  status, 
  created_at
FROM oauth_clients
ORDER BY created_at DESC;
```

### Checking Application Scopes

Query to see what permissions an app has:
```sql
SELECT 
  ocs.client_id,
  c.client_name,
  ocs.scope_name,
  s.display_name,
  s.description
FROM oauth_client_scopes ocs
JOIN oauth_clients c ON ocs.client_id = c.client_id
JOIN oauth_scopes s ON ocs.scope_name = s.scope_name
WHERE ocs.client_id = 'cli_acme_mobile_001';
```

### Viewing Redirect URIs

Query to see all callback URLs for an app:
```sql
SELECT 
  client_id,
  redirect_uri,
  is_primary,
  created_at
FROM oauth_redirect_uris
WHERE client_id = 'cli_acme_mobile_001'
ORDER BY is_primary DESC, created_at;
```

### Sample Client IDs for Testing

Use these existing clients in your flows:
- `cli_acme_mobile_001` - ACME Mobile App (active)
- `cli_dashboard_web_002` - Analytics Dashboard (active)
- `cli_sync_service_003` - Cloud Sync Service (active)
- `cli_calendar_spa_004` - Calendar Plus (active)
- `cli_beta_test_005` - Beta Testing App (pending)
- `cli_legacy_app_006` - Legacy Integration (suspended)

---

## Advanced OAuth Patterns

### Multi-Step Registration with Review

1. **Step 1:** Developer submits application details → INSERT with `status='pending'`
2. **Step 2:** Admin reviews application → UPDATE status to 'active' or 'rejected'
3. **Step 3:** Developer receives client_id/client_secret via email

### Scope Request Workflow

1. Developer requests additional scopes
2. INSERT into pending scopes table
3. Admin approves scope request
4. INSERT approved scopes into `oauth_client_scopes`

### Conditional Scope Dependencies

- If requesting `write:profile`, must also have `read:profile`
- If requesting `admin:users`, show additional verification questions
- Sensitive scopes require manual approval

---

Happy onboarding! 🎉