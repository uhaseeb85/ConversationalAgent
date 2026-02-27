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

function App() {
  return (
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
  )
}

export default App

