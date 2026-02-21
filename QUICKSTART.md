# Quick Start Guide

## Example Flow #1: Basic Customer Onboarding

### Flow Configuration
- **Name**: Customer Onboarding
- **Description**: Collect basic customer information for account creation
- **Table Name**: `customers`

### Questions

1. **Full Name**
   - Type: Short Text
   - SQL Column: `full_name`
   - Required: Yes
   - Placeholder: "John Doe"

2. **Email Address**
   - Type: Email
   - SQL Column: `email`
   - Required: Yes
   - Placeholder: "john@example.com"

3. **Phone Number**
   - Type: Phone
   - SQL Column: `phone`
   - Required: No
   - Placeholder: "+1 (555) 123-4567"

4. **Company Name**
   - Type: Short Text
   - SQL Column: `company`
   - Required: No
   - Placeholder: "Acme Corp"

5. **How did you hear about us?**
   - Type: Single Select
   - SQL Column: `referral_source`
   - Options: "Google Search, Social Media, Friend Referral, Advertisement, Other"
   - Required: Yes

6. **Subscribe to newsletter?**
   - Type: Yes/No
   - SQL Column: `newsletter_opt_in`
   - Required: No

---

## Example Flow #2: Service Request with Conditional Logic

### Flow Configuration
- **Name**: Service Request Intake
- **Description**: Gather information for new service requests
- **Table Name**: `service_requests`

### Questions

1. **Request Type**
   - Type: Single Select
   - SQL Column: `request_type`
   - Options: "Technical Support, Billing Inquiry, Feature Request, Bug Report"
   - Required: Yes

2. **Priority** (Always shown)
   - Type: Single Select
   - SQL Column: `priority`
   - Options: "Low, Medium, High, Critical"
   - Required: Yes

3. **Product** (Show if Request Type = "Technical Support" OR "Bug Report")
   - Type: Single Select
   - SQL Column: `product_name`
   - Options: "Product A, Product B, Product C"
   - Required: Yes
   - **Conditional**: Show if request_type equals "Technical Support"

4. **Error Message** (Show if Request Type = "Bug Report")
   - Type: Short Text
   - SQL Column: `error_message`
   - Required: Yes
   - **Conditional**: Show if request_type equals "Bug Report"

5. **Account Number** (Show if Request Type = "Billing Inquiry")
   - Type: Number
   - SQL Column: `account_number`
   - Required: Yes
   - **Conditional**: Show if request_type equals "Billing Inquiry"

6. **Description**
   - Type: Short Text
   - SQL Column: `description`
   - Required: Yes
   - Placeholder: "Please describe your request..."

7. **Preferred Contact Method**
   - Type: Single Select
   - SQL Column: `contact_method`
   - Options: "Email, Phone, Chat"
   - Required: Yes

---

## Example Flow #3: Event Registration

### Flow Configuration
- **Name**: Conference Registration
- **Description**: Register attendees for annual conference
- **Table Name**: `event_registrations`

### Questions

1. **First Name**
   - Type: Short Text
   - SQL Column: `first_name`
   - Required: Yes

2. **Last Name**
   - Type: Short Text
   - SQL Column: `last_name`
   - Required: Yes

3. **Email**
   - Type: Email
   - SQL Column: `email`
   - Required: Yes

4. **Organization**
   - Type: Short Text
   - SQL Column: `organization`
   - Required: No

5. **Job Title**
   - Type: Short Text
   - SQL Column: `job_title`
   - Required: No

6. **Registration Type**
   - Type: Single Select
   - SQL Column: `registration_type`
   - Options: "Full Conference, Workshop Only, Virtual Attendance"
   - Required: Yes

7. **Workshop Selection** (Show if Registration Type = "Workshop Only" OR "Full Conference")
   - Type: Multi Select
   - SQL Column: `workshops`
   - Options: "AI & Machine Learning, Cloud Architecture, Security Best Practices, DevOps Strategies"
   - Required: No
   - **Conditional**: Show if registration_type equals "Workshop Only"

8. **Dietary Restrictions** (Show if NOT Virtual)
   - Type: Multi Select
   - SQL Column: `dietary_restrictions`
   - Options: "Vegetarian, Vegan, Gluten-Free, Dairy-Free, None"
   - Required: No

9. **T-Shirt Size** (Show if NOT Virtual)
   - Type: Single Select
   - SQL Column: `tshirt_size`
   - Options: "XS, S, M, L, XL, XXL"
   - Required: Yes

10. **Special Accommodations**
    - Type: Short Text
    - SQL Column: `special_needs`
    - Required: No
    - Placeholder: "Any accessibility needs?"

---

## Step-by-Step: Creating Your First Flow

### Step 1: Navigate to Flow Builder
1. Open the app at `http://localhost:5173/`
2. Click **"Create New Flow"**

### Step 2: Enter Flow Details
```
Flow Name: Customer Onboarding
Description: Collect basic customer information
Target Table Name: customers
✓ Flow is active
```

### Step 3: Add Questions
Click **"Add Question"** and configure:

**Question 1:**
- Label: "What's your full name?"
- Type: Short Text
- SQL Column Name: full_name
- ✓ Required

**Question 2:**
- Label: "What's your email address?"
- Type: Email
- SQL Column Name: email
- ✓ Required

**Question 3:**
- Label: "What's your phone number?"
- Type: Phone
- SQL Column Name: phone
- Placeholder: "+1 (555) 123-4567"

**Question 4:**
- Label: "Would you like to receive our newsletter?"
- Type: Yes/No
- SQL Column Name: newsletter_opt_in

### Step 4: Save Flow
Click **"Create Flow"** button

### Step 5: Test the Flow
1. From home page, click **"Preview Flow"** on your new flow
2. Complete the onboarding questions
3. Submit your test response

### Step 6: View Submission & SQL
1. Navigate to **"Submissions"**
2. Click your test submission
3. Review the generated SQL:

```sql
INSERT INTO customers (full_name, email, phone, newsletter_opt_in)
VALUES ('John Doe', 'john@example.com', '+1 (555) 123-4567', 1);
```

4. Click **"Copy"** to copy SQL to clipboard
5. Execute in your database
6. Update status to **"Executed"**

---

## Tips for Effective Flows

### Question Design
✅ **DO**:
- Use clear, conversational language
- Keep questions focused on one thing
- Provide helpful placeholders
- Mark truly required fields only
- Test the flow before sharing

❌ **DON'T**:
- Use technical jargon
- Ask for unnecessary information
- Make everything required
- Create circular conditional logic
- Forget to map questions to columns

### Conditional Logic Best Practices
- Always test conditional flows thoroughly
- Avoid deep nesting (max 2-3 levels)
- Document complex logic in flow description
- Consider using separate flows instead of many conditions

### SQL Column Naming
- Use `snake_case` for consistency
- Be descriptive: `customer_email` not `email1`
- Match your actual database schema
- Avoid SQL reserved keywords

### User Experience
- Start with easy questions (name, email)
- Group related questions together
- Use appropriate input types (email, phone, number, date)
- Provide context in placeholder text
- End with optional questions

---

## Common Scenarios

### Scenario: Multi-Page Form
Create multiple flows and link them:
1. Flow 1: Basic Info → Generate unique customer_id
2. Flow 2: Detailed Preferences (use customer_id from Flow 1)
3. Flow 3: Final Confirmation

### Scenario: Skip Logic
Use conditional logic to create branching:
- Q1: "Are you a new customer?" → Yes/No
- Q2: (Show if Yes) "How did you hear about us?"
- Q3: (Show if No) "What's your customer ID?"

### Scenario: File Upload (Workaround)
Since file uploads aren't supported:
1. Ask for file info in text field
2. Provide upload link in description
3. Collect file reference/URL instead

### Scenario: Multi-Step Workflow
For complex onboarding:
1. Create separate flows for each stage
2. Use submission data from previous stages
3. Track progress with status field

---

## Troubleshooting

### Issue: Conditional logic not working
- Check that condition question appears BEFORE dependent question
- Verify condition value matches exactly (case-sensitive)
- Test with simple equals/not-equals first

### Issue: SQL not generating correctly
- Ensure all questions have SQL column names
- Check for special characters in responses
- Verify table name in flow settings

### Issue: Data not persisting
- Check browser console for IndexedDB errors
- Ensure browser allows local storage
- Try clearing cache and reloading

### Issue: Submission not saving
- Complete all required fields
- Check browser console for errors
- Verify flow is marked as active

---

## Next Steps

1. **Create your flow** using examples above
2. **Test thoroughly** with various inputs
3. **Share URL** with customers: `/onboard/{flowId}`
4. **Monitor submissions** in Submissions page
5. **Execute SQL** in your database
6. **Track status** (pending → executed)

Happy building! 🚀
