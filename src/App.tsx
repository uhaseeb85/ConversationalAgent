import { Component, ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { FlowBuilderPage } from './pages/FlowBuilderPage'
import { AIFlowBuilderPage } from './pages/AIFlowBuilderPage'
import { OnboardPage } from './pages/OnboardPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-8">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">{this.state.message}</p>
            <button
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/' }}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/flows/new" element={<FlowBuilderPage />} />
              <Route path="/flows/:id/edit" element={<FlowBuilderPage />} />
              <Route path="/ai-flow-builder" element={<AIFlowBuilderPage />} />
              <Route path="/onboard/:flowId" element={<OnboardPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/submissions/:id" element={<SubmissionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </AppErrorBoundary>
  )
}

export default App

