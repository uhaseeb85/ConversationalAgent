import { Link, useLocation, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, FileText, Settings, PlusCircle, Sparkles, Moon, Sun, Send } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function Layout() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/flows/new', label: 'Create Flow', icon: PlusCircle },
    { path: '/ai-flow-builder', label: 'AI Flow Builder', icon: Sparkles },
    { path: '/submissions', label: 'Submissions', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950">
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Send className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-400 bg-clip-text text-transparent">
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
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8"><Outlet /></main>
    </div>
  )
}
