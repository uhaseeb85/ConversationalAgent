import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { User, KeyRound, AlertTriangle, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Mail } from 'lucide-react'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const location = useLocation()
  const forcedChange = !!(location.state as { mustChangePassword?: boolean } | null)?.mustChangePassword

  // Change password
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [cpResult, setCpResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showCpCurrent, setShowCpCurrent] = useState(false)
  const [showCpNew, setShowCpNew] = useState(false)

  const handleChangePassword = async () => {
    setCpResult(null)
    if (cpNew.length < 8) {
      setCpResult({ ok: false, message: 'New password must be at least 8 characters' })
      return
    }
    if (cpNew !== cpConfirm) {
      setCpResult({ ok: false, message: 'New passwords do not match' })
      return
    }
    setCpLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCpResult({ ok: true, message: 'Password updated successfully!' })
      setCpCurrent('')
      setCpNew('')
      setCpConfirm('')
      // Clear mustChangePassword flag in local auth context
      if (user) setUser({ ...user, mustChangePassword: false })
    } catch (err) {
      setCpResult({ ok: false, message: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setCpLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-3">
          <User className="h-9 w-9 text-indigo-600" />
          My Profile
        </h1>
        <p className="text-muted-foreground">Manage your account information and security settings.</p>
      </div>

      {/* Temp-password notice */}
      {forcedChange && (
        <div className="flex items-start gap-3 mb-6 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Temporary password in use</p>
            <p className="text-xs mt-0.5">An admin has set a temporary password for your account. Please choose a new password below before continuing.</p>
          </div>
        </div>
      )}

      {/* ─── Account Information ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={user?.name || ''}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50 pl-8"
              />
              <Mail className="h-4 w-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={user?.role === 'admin' ? 'Administrator' : 'User'}
              disabled
              className="bg-gray-50"
            />
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Contact an administrator to update your name, email, or role.
          </p>
        </CardContent>
      </Card>

      {/* ─── Change Password ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password. You'll need to enter your current password to confirm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Current password</Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={showCpCurrent ? 'text' : 'password'}
                placeholder="Current password"
                value={cpCurrent}
                onChange={(e) => setCpCurrent(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowCpCurrent(!showCpCurrent)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showCpCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-new">New password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showCpNew ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={cpNew}
                onChange={(e) => setCpNew(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowCpNew(!showCpNew)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                type="button"
              >
                {showCpNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              type="password"
              placeholder="Repeat new password"
              value={cpConfirm}
              onChange={(e) => setCpConfirm(e.target.value)}
            />
          </div>

          {cpResult && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
              cpResult.ok
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {cpResult.ok
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <span>{cpResult.message}</span>
            </div>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
          >
            {cpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
