import { ReactNode, useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, FileText, Send, Settings, PlusCircle, ShieldCheck, LogOut, ChevronDown, User, Sparkles, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

interface LayoutProps {
  children?: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/flows/new', label: 'Create Flow', icon: PlusCircle },
    { path: '/ai-flow-builder', label: 'AI Flow Builder', icon: Sparkles },
    { path: '/submissions', label: 'Submissions', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ]

  const initials = user
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950">
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Send className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                WorkFlow Studio
              </span>
            </Link>

            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive(item.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {/* User avatar + dropdown */}
              {user && (
                <div className="relative ml-2" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        App Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children ?? <Outlet />}</main>
    </div>
  )
}

