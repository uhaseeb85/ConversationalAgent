import React, { useEffect, useState, useCallback } from 'react'
import { User, ExecutionHistory } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import {
  Users, Activity, ShieldCheck, ShieldAlert, LayoutDashboard,
  Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  FileText, Database, TrendingUp, CheckCircle2, XCircle, RefreshCw, KeyRound, X,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type AdminTab = 'overview' | 'users' | 'history'

interface Stats {
  totals: {
    users: number
    activeUsers: number
    flows: number
    submissions: number
    executions: number
    successRate: number
  }
  subsByStatus: { status: string; total: number }[]
  subsPerDay: { day: string; total: number }[]
  execsPerDay: { day: string; total: number; successes: number }[]
  topFlows: { flow_name: string; total: number }[]
  topUsers: { name: string; email: string; total: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  'in-progress': '#6366f1',
  pending: '#f59e0b',
  error: '#ef4444',
}
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export function AdminPage() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [users, setUsers] = useState<User[]>([])
  const [history, setHistory] = useState<ExecutionHistory[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [expandedScript, setExpandedScript] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [tempPwdUserId, setTempPwdUserId] = useState<string | null>(null)
  const [tempPwdValue, setTempPwdValue] = useState('')
  const [tempPwdLoading, setTempPwdLoading] = useState(false)
  const [tempPwdError, setTempPwdError] = useState('')

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/users/stats/overview', { credentials: 'include' })
      const data = await res.json()
      setStats(data)
    } catch { /* ignore */ }
    setLoadingStats(false)
  }, [])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch { /* ignore */ }
    setLoadingUsers(false)
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/users/execution-history/all', { credentials: 'include' })
      const data = await res.json()
      setHistory(data.history ?? [])
    } catch { /* ignore */ }
    setLoadingHistory(false)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { if (activeTab === 'users') loadUsers() }, [activeTab, loadUsers])
  useEffect(() => { if (activeTab === 'history') loadHistory() }, [activeTab, loadHistory])

  const patchUser = async (userId: string, updates: { role?: string; isActive?: boolean }) => {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    await Promise.all([loadUsers(), loadStats()])
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? Their flows and submissions will remain.')) return
    await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' })
    await Promise.all([loadUsers(), loadStats()])
  }

  const submitTempPassword = async (userId: string) => {
    setTempPwdError('')
    if (tempPwdValue.length < 8) { setTempPwdError('Must be at least 8 characters'); return }
    setTempPwdLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/set-temp-password`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: tempPwdValue }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setTempPwdUserId(null)
      setTempPwdValue('')
    } catch (err) {
      setTempPwdError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setTempPwdLoading(false)
    }
  }

  const tabBtn = (tab: AdminTab, label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
        activeTab === tab
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

  const filteredHistory = history.filter(h =>
    !historySearch ||
    h.statement?.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.userName?.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.flowName?.toLowerCase().includes(historySearch.toLowerCase())
  )

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const t = stats?.totals

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor usage, manage users and review execution logs</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadStats(); if (activeTab === 'users') loadUsers(); if (activeTab === 'history') loadHistory() }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI strip — always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Total Users', value: t?.users ?? '—', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active Users', value: t?.activeUsers ?? '—', icon: ToggleRight, color: 'text-green-600 bg-green-50' },
          { label: 'Flows', value: t?.flows ?? '—', icon: FileText, color: 'text-violet-600 bg-violet-50' },
          { label: 'Submissions', value: t?.submissions ?? '—', icon: Database, color: 'text-blue-600 bg-blue-50' },
          { label: 'Executions', value: t?.executions ?? '—', icon: Activity, color: 'text-orange-600 bg-orange-50' },
          { label: 'Success Rate', value: t !== undefined ? `${t.successRate}%` : '—', icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{loadingStats ? '…' : value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 flex gap-6">
        {tabBtn('overview', 'Overview', LayoutDashboard)}
        {tabBtn('users', 'Users', Users)}
        {tabBtn('history', 'Execution History', Activity)}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="p-16 text-center text-muted-foreground">Loading metrics…</div>
          ) : (
            <>
              {/* Activity charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submissions over time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Submissions — Last 30 Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.subsPerDay?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No submissions yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats!.subsPerDay}>
                          <defs>
                            <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip labelFormatter={d => format(parseISO(d as string), 'MMM d, yyyy')} />
                          <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#subGrad)" strokeWidth={2} name="Submissions" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Executions success/fail over time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">SQL Executions — Last 30 Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.execsPerDay?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No executions yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats!.execsPerDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip labelFormatter={d => format(parseISO(d as string), 'MMM d, yyyy')} />
                          <Legend />
                          <Bar dataKey="successes" stackId="a" fill="#22c55e" name="Success" radius={[0,0,0,0]} />
                          <Bar dataKey="total" stackId="b" fill="#ef444466" name="Total" radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submissions by status pie */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Submissions by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(stats?.subsByStatus?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={stats!.subsByStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                            {stats!.subsByStatus.map((entry, i) => (
                              <Cell key={i} fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Top flows */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top Flows by Submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-1">
                    {(stats?.topFlows?.length ?? 0) === 0
                      ? <p className="text-sm text-muted-foreground py-4 text-center">No flows yet</p>
                      : stats!.topFlows.map((f, i) => {
                        const max = stats!.topFlows[0].total
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="truncate max-w-[70%] font-medium">{f.flow_name}</span>
                              <span className="text-muted-foreground">{f.total}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(f.total / max) * 100}%` }} />
                            </div>
                          </div>
                        )
                      })
                    }
                  </CardContent>
                </Card>

                {/* Top users */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Most Active Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-1">
                    {(stats?.topUsers?.length ?? 0) === 0
                      ? <p className="text-sm text-muted-foreground py-4 text-center">No users yet</p>
                      : stats!.topUsers.map((u, i) => {
                        const max = Math.max(stats!.topUsers[0].total, 1)
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-[9px]">
                                  {u.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-medium truncate max-w-[120px]">{u.name}</span>
                              </span>
                              <span className="text-muted-foreground">{u.total}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${(u.total / max) * 100}%` }} />
                            </div>
                          </div>
                        )
                      })
                    }
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage roles and account status for all registered users.</CardDescription>
              </div>
              <input
                type="text"
                placeholder="Search users…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingUsers ? (
              <div className="p-8 text-center text-muted-foreground">Loading users…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Submissions</th>
                      <th className="px-4 py-3 text-left font-medium">Joined</th>
                      <th className="px-4 py-3 text-left font-medium">Last Login</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <React.Fragment key={u.id}>
                      <tr className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{u.name}{u.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-1">(you)</span>}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser?.id}
                            onChange={(e) => patchUser(u.id, { role: e.target.value })}
                            className="text-xs border rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.isActive ? 'success' : 'secondary'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.submissionCount ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {u.lastLoginAt ? format(new Date(u.lastLoginAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {u.id !== currentUser?.id && (
                              <>
                                <Button variant="ghost" size="sm" title={u.isActive ? 'Deactivate' : 'Activate'}
                                  onClick={() => patchUser(u.id, { isActive: !u.isActive })}>
                                  {u.isActive
                                    ? <ToggleRight className="h-4 w-4 text-green-600" />
                                    : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                                </Button>
                                {u.role !== 'admin' && (
                                  <Button variant="ghost" size="sm" title="Grant admin"
                                    onClick={() => patchUser(u.id, { role: 'admin' })}>
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                                {u.role === 'admin' && (
                                  <Button variant="ghost" size="sm" title="Remove admin"
                                    onClick={() => patchUser(u.id, { role: 'user' })}>
                                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" title="Delete user"
                                  onClick={() => deleteUser(u.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <Button variant="ghost" size="sm"
                                  title="Set temporary password"
                                  onClick={() => { setTempPwdUserId(tempPwdUserId === u.id ? null : u.id); setTempPwdValue(''); setTempPwdError('') }}>
                                  <KeyRound className="h-4 w-4 text-violet-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {tempPwdUserId === u.id && (
                        <tr className="border-b bg-violet-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <KeyRound className="h-4 w-4 text-violet-500 flex-shrink-0" />
                              <span className="text-xs font-medium text-violet-700">Set temporary password for <strong>{u.name}</strong></span>
                              <input
                                type="password"
                                value={tempPwdValue}
                                onChange={e => setTempPwdValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitTempPassword(u.id)}
                                placeholder="New temporary password (min 8 chars)"
                                className="text-sm border rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                                autoFocus
                              />
                              <Button size="sm" onClick={() => submitTempPassword(u.id)} disabled={tempPwdLoading}>
                                {tempPwdLoading ? 'Setting…' : 'Set password'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setTempPwdUserId(null); setTempPwdValue('') }}>
                                <X className="h-4 w-4" />
                              </Button>
                              {tempPwdError && <span className="text-xs text-red-600">{tempPwdError}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 ml-6">The user will be required to change this password on next login.</p>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>All SQL statements executed across submissions by all users.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{filteredHistory.length} records</span>
                <input
                  type="text"
                  placeholder="Search SQL, user, flow…"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="p-8 text-center text-muted-foreground">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No execution history yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Flow</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Rows</th>
                      <th className="px-4 py-3 text-left font-medium">SQL</th>
                      <th className="px-4 py-3 text-left font-medium">Executed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((h) => {
                      const isExpanded = expandedScript === h.id
                      return (
                        <tr key={h.id} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium">{h.userName ?? 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{h.userEmail ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{h.flowName ?? '—'}</td>
                          <td className="px-4 py-3">
                            {h.success
                              ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Success</span>
                              : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="h-3.5 w-3.5" />Failed</span>
                            }
                            {!h.success && h.errorMessage && (
                              <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{h.errorMessage}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{h.rowsAffected ?? '—'}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <button
                              className="flex items-start gap-1 text-xs font-mono text-left text-muted-foreground hover:text-foreground"
                              onClick={() => setExpandedScript(isExpanded ? null : h.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                              <span className={isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate max-w-[240px]'}>{h.statement}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {h.executedAt ? format(new Date(h.executedAt), 'MMM d, yyyy h:mm a') : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No results match your search</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
