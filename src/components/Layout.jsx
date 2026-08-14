import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  UserCircle,
  Globe,
  Users,
  LogOut,
  Menu,
  X,
  MessageSquare,
  MessagesSquare,
  Hash,
  FileText,
  Tag,
  Compass,
  CornerDownRight
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Reddit Accounts', href: '/reddit-accounts', icon: UserCircle },
  { name: 'Posts', href: '/posts', icon: MessageSquare },
  { name: 'Comments', href: '/comments', icon: MessagesSquare },
  { name: 'Comment Replies', href: '/comment-replies', icon: CornerDownRight },
  { name: 'Subreddits', href: '/subreddits', icon: Hash },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Account Data', href: '/account-posts', icon: FileText },
  { name: 'Feed Browse', href: '/feed-browse', icon: Compass },
  { name: 'Proxies', href: '/proxies', icon: Globe },
  { name: 'Users', href: '/users', icon: Users },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">Reddit Panel</h1>
            <button 
              className="lg:hidden p-1 hover:bg-secondary rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-border">
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {user?.is_verified ? 'Verified' : 'Not verified'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center px-4 lg:px-6">
          <button 
            className="lg:hidden p-2 hover:bg-secondary rounded-lg mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
