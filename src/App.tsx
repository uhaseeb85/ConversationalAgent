import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { FlowBuilderPage } from './pages/FlowBuilderPage'
import { AIFlowBuilderPage } from './pages/AIFlowBuilderPage'
import { OnboardPage } from './pages/OnboardPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

// Layout route: auth guard + layout shell with Outlet
function PrivateLayout() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  // Force password change if admin set a temporary password
  if (user.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ mustChangePassword: true }} replace />
  }

  return <Layout />
}

// Admin-only guard
function AdminRoute() {
  const { user } = useAuth()
  if (user && user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes — PrivateLayout renders Layout + Outlet */}
          <Route element={<PrivateLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/flows/new" element={<FlowBuilderPage />} />
            <Route path="/flows/:id/edit" element={<FlowBuilderPage />} />
            <Route path="/ai-flow-builder" element={<AIFlowBuilderPage />} />
            <Route path="/onboard/:flowId" element={<OnboardPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/submissions/:id" element={<SubmissionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Admin-only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

