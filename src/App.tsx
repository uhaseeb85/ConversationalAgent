import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { FlowBuilderPage } from './pages/FlowBuilderPage'
import { OnboardPage } from './pages/OnboardPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { Layout } from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/flows/new" element={<FlowBuilderPage />} />
          <Route path="/flows/:id/edit" element={<FlowBuilderPage />} />
          <Route path="/onboard/:flowId" element={<OnboardPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/submissions/:id" element={<SubmissionsPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
