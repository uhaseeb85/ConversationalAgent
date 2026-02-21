# Conversational Onboarding Flow Builder

A client-side React application for building custom onboarding flows with a conversational chat interface. Admins can create question flows, map them to database columns, and generate SQL INSERT statements from customer responses.

![Status](https://img.shields.io/badge/status-production--ready-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-blue)

## ✨ Features

### 🎯 Core Functionality
- **Admin Dashboard** - Create and manage multiple onboarding flows
- **Flow Builder** - Visual question editor with drag-and-drop reordering
- **Conversational UI** - Chat-style interface for customers to fill out forms
- **Conditional Logic** - Show/hide questions based on previous answers
- **SQL Generation** - Automatic INSERT statement generation from responses
- **Client-Side Storage** - All data stored locally in IndexedDB (no backend required)

### 📋 Supported Question Types
- Short Text
- Email
- Phone
- Number
- Date
- Single Select (dropdown)
- Multi Select (checkboxes)
- Yes/No

### 🎨 Design
- Modern, clean conversational UI
- Indigo/Violet gradient color palette
- Smooth animations with Framer Motion
- Card-based layouts with subtle shadows
- Fully responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

The app will be available at `http://localhost:5173/`

## 📖 Usage Guide

### 1. Create a Flow

1. Click **"Create New Flow"** on the home page
2. Fill in flow details:
   - **Flow Name**: Descriptive name (e.g., "Customer Onboarding")
   - **Description**: What this flow is for
   - **Target Table Name**: SQL table name (e.g., `customers`)
   - **Is Active**: Enable/disable the flow

### 2. Add Questions

1. Click **"Add Question"** in the Flow Builder
2. Configure each question:
   - **Label**: The question text shown to users
   - **Type**: Choose from 8 question types
   - **SQL Column Name**: Database column this maps to (e.g., `email_address`)
   - **Placeholder**: Optional hint text
   - **Options**: For select types, add comma-separated choices
   - **Required**: Mark if answer is mandatory
   - **Conditional Logic**: Show question only if previous answer matches condition

3. Drag and drop questions to reorder them
4. Click **"Create Flow"** to save

### 3. Customer Onboarding

1. Share the onboarding URL: `/onboard/{flowId}`
2. Customer sees questions one at a time in chat format
3. Conditional questions automatically show/hide
4. Typing indicators and smooth animations enhance UX
5. On completion, submission is saved

### 4. View Submissions & Generate SQL

1. Navigate to **"Submissions"** page
2. Filter by status: Pending / Executed / Failed
3. Click any submission to view:
   - All question responses
   - Auto-generated SQL INSERT statement
   - Copy SQL to clipboard
4. Update status after executing SQL in your database

## 📁 Project Structure

```
ConversationalAgent/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base components (Button, Card, Input, etc.)
│   │   ├── Layout.tsx       # App layout with navigation
│   │   └── QuestionBuilder.tsx  # Flow builder component
│   ├── pages/               # Main page components
│   │   ├── HomePage.tsx     # Flow dashboard
│   │   ├── FlowBuilderPage.tsx  # Create/edit flows
│   │   ├── OnboardPage.tsx  # Chat interface for customers
│   │   └── SubmissionsPage.tsx  # View data & SQL
│   ├── lib/                 # Core logic
│   │   ├── db.ts           # IndexedDB operations
│   │   ├── store.ts        # Zustand state management
│   │   ├── sql-generator.ts # SQL INSERT generation
│   │   └── utils.ts        # Helper functions
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles (Tailwind)
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔧 Technical Architecture

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

### State Management
- **Zustand** - Global state
- **IndexedDB** (via idb) - Persistent storage

### Key Libraries
- `react-hook-form` - Form handling
- `@dnd-kit` - Drag and drop
- `lucide-react` - Icons
- `date-fns` - Date formatting

### Data Flow
1. User creates flow → Saved to IndexedDB → Updates Zustand store
2. Customer fills form → Responses stored temporarily → Saved on completion
3. Admin views submission → SQL generated on-demand → Copyable to clipboard

## 🗄️ Data Model

### OnboardingFlow
```typescript
{
  id: string
  name: string
  description: string
  tableName: string           // Target SQL table
  questions: Question[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}
```

### Question
```typescript
{
  id: string
  type: QuestionType
  label: string
  placeholder?: string
  options?: string[]          // For select types
  required: boolean
  sqlColumnName: string       // Maps to DB column
  conditionalLogic?: {
    questionId: string         // Show if this question...
    operator: 'equals' | ...
    value: string | number
  }
  order: number
}
```

### Submission
```typescript
{
  id: string
  flowId: string
  flowName: string
  responses: Response[]
  startedAt: Date
  completedAt: Date
  status: 'pending' | 'executed' | 'failed'
  generatedSQL?: string
}
```

## 🔐 Security Considerations

### SQL Injection Prevention
- All string values are escaped using `replaceAll("'", "''")` 
- Values are properly quoted in generated SQL
- **Important**: Review generated SQL before executing
- Consider using parameterized queries in your actual database

### Data Privacy
- All data stored in browser's IndexedDB (local only)
- No data sent to external servers
- Clearing browser data will delete all flows and submissions
- Export/backup functionality not included (consider adding)

## 🎨 Customization

### Change Color Palette
Edit `src/index.css`:
```css
:root {
  --primary: 262.1 83.3% 57.8%;  /* Indigo/Violet */
  /* Modify HSL values for different colors */
}
```

### Add New Question Types
1. Update `QuestionType` in `src/types/index.ts`
2. Add rendering logic in `OnboardPage.tsx`
3. Update SQL formatting in `sql-generator.ts`

### Extend Conditional Logic
Modify `ConditionalLogic` interface and `shouldShowQuestion()` in `OnboardPage.tsx`

## 🚧 Limitations & Future Enhancements

### Current Limitations
- **Client-side only** - No backend, no authentication
- **Single device** - Data doesn't sync across browsers/devices
- **No export** - Can't export/import flow configurations
- **No analytics** - No completion rate tracking
- **Manual SQL execution** - No automatic database integration

### Potential Enhancements
- [ ] Export/import flows as JSON
- [ ] Flow templates library
- [ ] Response validation rules (regex, min/max, etc.)
- [ ] Multi-language support
- [ ] Email notifications on submission
- [ ] Backend integration (optional)
- [ ] Analytics dashboard
- [ ] White-label branding options
- [ ] File upload question type
- [ ] Question branching (skip multiple questions)

## 🧪 Testing Checklist

- [x] Create a new flow
- [x] Add questions of all types
- [x] Reorder questions via drag-and-drop
- [x] Set up conditional logic
- [x] Complete onboarding flow as customer
- [x] Verify conditional questions show/hide correctly
- [x] View submissions list
- [x] Generate and copy SQL
- [x] Update submission status
- [x] Test with multiple flows
- [x] Verify data persists after refresh
- [x] Test responsive design on mobile

## 📄 License

MIT License - Free to use and modify

## 🤝 Contributing

This is a standalone client-side app. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 💡 Tips

1. **Test SQL First**: Always test generated SQL on a test database first
2. **Backup Data**: Export IndexedDB data periodically (use browser dev tools)
3. **Question Order**: Put required questions early in the flow
4. **Column Names**: Use snake_case for SQL column names
5. **Conditional Logic**: Don't create circular dependencies in conditions

## 📞 Support

For issues or questions:
- Check the [Usage Guide](#usage-guide)
- Review [Technical Architecture](#technical-architecture)
- Inspect browser console for errors
- Check IndexedDB in browser dev tools (Application > Storage > IndexedDB)

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**

**Version**: 1.0.0 | **Status**: Production Ready | **Updated**: February 2026
