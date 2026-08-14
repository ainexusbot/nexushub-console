import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, formatRelativeTime } from '../utils/api'
import { 
  UserCircle, 
  Globe, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield
} from 'lucide-react'

function StatCard({ title, value, subtitle, icon: Icon, href }) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }
  return content
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    needs_login: 'bg-yellow-500/10 text-yellow-500',
    suspended: 'bg-orange-500/10 text-orange-500',
    banned: 'bg-red-500/10 text-red-500',
    error: 'bg-red-500/10 text-red-500',
  }
  
  const icons = {
    active: CheckCircle,
    inactive: XCircle,
    needs_login: Clock,
    suspended: AlertCircle,
    banned: Shield,
    error: AlertCircle,
  }
  
  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    needs_login: 'Needs Login',
    suspended: 'Suspended',
    banned: 'Banned',
    error: 'Error',
  }
  
  const Icon = icons[status] || icons.inactive
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      <Icon className="w-3 h-3" />
      {labels[status] || status}
    </span>
  )
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState([])
  const [proxies, setProxies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [accountsRes, proxiesRes] = await Promise.all([
        api.get('/reddit-accounts'),
        api.get('/proxies'),
      ])
      
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts')
      if (!proxiesRes.ok) throw new Error('Failed to fetch proxies')
      
      const [accountsData, proxiesData] = await Promise.all([
        accountsRes.json(),
        proxiesRes.json(),
      ])
      
      setAccounts(accountsData)
      setProxies(proxiesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  const activeAccounts = accounts.filter(a => a.status === 'active').length
  const needsLoginAccounts = accounts.filter(a => a.status === 'needs_login').length
  const problemAccounts = accounts.filter(a => ['suspended', 'banned', 'error'].includes(a.status)).length
  const activeProxies = proxies.filter(p => p.status === 'active').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your Reddit accounts</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Accounts"
          value={accounts.length}
          subtitle={`${activeAccounts} active`}
          icon={UserCircle}
          href="/reddit-accounts"
        />
        <StatCard
          title="Active Sessions"
          value={activeAccounts}
          subtitle="Ready to use"
          icon={CheckCircle}
          href="/reddit-accounts"
        />
        <StatCard
          title="Needs Attention"
          value={needsLoginAccounts + problemAccounts}
          subtitle={needsLoginAccounts > 0 ? `${needsLoginAccounts} needs login` : 'All good'}
          icon={AlertCircle}
          href="/reddit-accounts"
        />
        <StatCard
          title="Proxies"
          value={proxies.length}
          subtitle={`${activeProxies} active`}
          icon={Globe}
          href="/proxies"
        />
      </div>

      {/* Alerts */}
      {needsLoginAccounts > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Sessions Expired</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {needsLoginAccounts} account{needsLoginAccounts > 1 ? 's need' : ' needs'} to be reconnected. 
                Click Connect to re-login via browser automation.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {accounts.filter(a => a.status === 'needs_login').slice(0, 5).map((account) => (
                  <span key={account.id} className="px-2 py-1 rounded bg-yellow-500/20 text-sm text-yellow-600">
                    u/{account.reddit_username}
                  </span>
                ))}
                {needsLoginAccounts > 5 && (
                  <span className="px-2 py-1 text-sm text-yellow-600">
                    +{needsLoginAccounts - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {problemAccounts > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Account Issues</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {problemAccounts} account{problemAccounts > 1 ? 's have' : ' has'} issues (suspended, banned, or error).
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {accounts.filter(a => ['suspended', 'banned', 'error'].includes(a.status)).slice(0, 5).map((account) => (
                  <span key={account.id} className={`px-2 py-1 rounded text-sm ${
                    account.status === 'banned' ? 'bg-red-500/20 text-red-600' :
                    account.status === 'suspended' ? 'bg-orange-500/20 text-orange-600' :
                    'bg-red-500/20 text-red-600'
                  }`}>
                    u/{account.reddit_username} ({account.status})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Accounts */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Accounts</h2>
          <Link 
            to="/reddit-accounts" 
            className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {accounts.length === 0 ? (
          <div className="p-8 text-center">
            <UserCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No accounts yet</p>
            <Link 
              to="/reddit-accounts" 
              className="text-sm text-primary hover:text-primary/80 mt-2 inline-block"
            >
              Add your first account
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.slice(0, 5).map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">u/{account.reddit_username}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.karma !== null ? `${account.karma?.toLocaleString()} karma` : 'No karma data'}
                      {account.proxy_name && ` • ${account.proxy_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={account.status} />
                  {account.last_used_at && (
                    <span className="text-sm text-muted-foreground hidden sm:block">
                      {formatRelativeTime(account.last_used_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proxies Status */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Proxies</h2>
          <Link 
            to="/proxies" 
            className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            Manage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {proxies.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No proxies configured</p>
            <Link 
              to="/proxies" 
              className="text-sm text-primary hover:text-primary/80 mt-2 inline-block"
            >
              Add a proxy
            </Link>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {proxies.slice(0, 5).map((proxy) => (
              <div key={proxy.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{proxy.name || `${proxy.host}:${proxy.port}`}</span>
                  <span className="text-xs text-muted-foreground uppercase">{proxy.type}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  proxy.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                  proxy.status === 'error' ? 'bg-red-500/10 text-red-500' :
                  'bg-gray-500/10 text-gray-500'
                }`}>
                  {proxy.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
