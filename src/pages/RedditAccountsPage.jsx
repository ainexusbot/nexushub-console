import { useState, useEffect, useRef } from 'react'
import { api, formatRelativeTime } from '../utils/api'
import RegisterAccountModal from '../components/RegisterAccountModal'
import TagSelector from '../components/TagSelector'
import TagBadge from '../components/TagBadge'
import {
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  X,
  UserCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Globe,
  Link as LinkIcon,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Info,
  Terminal,
} from 'lucide-react'

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

function ProxyExpiry({ expiresAt }) {
  if (!expiresAt) {
    return <span className="text-sm text-muted-foreground">No expiry set</span>
  }
  const date = new Date(expiresAt)
  if (isNaN(date.getTime())) {
    return <span className="text-sm text-muted-foreground">No expiry set</span>
  }
  const dayMs = 24 * 60 * 60 * 1000
  const msLeft = date.getTime() - Date.now()
  const expired = msLeft <= 0
  const soon = !expired && msLeft <= 7 * dayMs
  const formatted = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const cls = expired
    ? 'text-destructive'
    : soon
      ? 'text-amber-500'
      : 'text-foreground'
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${cls}`}>
      {(expired || soon) && <Clock className="w-3 h-3" />}
      {formatted}
      {expired && <span className="text-xs">(expired)</span>}
      {soon && <span className="text-xs">(soon)</span>}
    </span>
  )
}

// Read-only context shown under the proxy selector once a proxy is chosen.
function ProxyContext({ proxy }) {
  if (!proxy) return null
  const tags = proxy.tags || []
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          A proxy routes this account&apos;s traffic through a separate IP address and region,
          keeping each account on a stable, isolated connection. Assign one proxy per account to
          avoid linking accounts together.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          Expires
        </span>
        <ProxyExpiry expiresAt={proxy.expires_at} />
      </div>

      {(proxy.region || proxy.type) && (
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            Region
          </span>
          <span className="text-sm text-foreground">
            {proxy.region || '—'}
            {proxy.type && (
              <span className="text-muted-foreground"> · {proxy.type}</span>
            )}
          </span>
        </div>
      )}

      <div>
        <span className="block text-xs text-muted-foreground mb-1.5">Tags</span>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagBadge key={tag.id || tag.name} tag={tag} />
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
      </div>
    </div>
  )
}

function AccountModal({ account, proxies, onClose, onSave }) {
  // The backend returns the stored password masked (e.g. "********") — never the
  // real value. We prefill the field with it so the user can see a password is
  // saved, but we only submit a new password if they actually change this value.
  const initialPassword = account?.reddit_password || ''
  const [formData, setFormData] = useState({
    reddit_username: account?.reddit_username || '',
    reddit_password: initialPassword,
    proxy_id: account?.proxy_id || '',
    status: account?.status || 'needs_login',
    notes: account?.notes || '',
    timezone: account?.timezone || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timezones, setTimezones] = useState([])

  // The full proxy object for the currently selected proxy_id (for the context block).
  const selectedProxy = proxies.find((p) => String(p.id) === String(formData.proxy_id))

  useEffect(() => {
    let cancelled = false
    const loadRegions = async () => {
      try {
        const response = await api.get('/proxies/meta/regions')
        if (!response.ok) return
        const data = await response.json()
        const all = (data.regions || []).flatMap((r) => r.timezones || [])
        if (!cancelled) setTimezones([...new Set(all)].sort())
      } catch {
        // non-critical
      }
    }
    loadRegions()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        reddit_username: formData.reddit_username,
        proxy_id: formData.proxy_id || null,
        notes: formData.notes || null,
      }

      if (account) {
        payload.status = formData.status
        // Empty string clears the override so the zone is re-derived from the proxy region.
        payload.timezone = formData.timezone || null
      } else if (formData.timezone) {
        payload.timezone = formData.timezone
      }

      // Only send the password if it was actually entered/changed — never resend
      // the masked placeholder we prefilled from the backend.
      if (formData.reddit_password && formData.reddit_password !== initialPassword) {
        payload.reddit_password = formData.reddit_password
      }
      
      const response = account
        ? await api.patch(`/reddit-accounts/${account.id}`, payload)
        : await api.post('/reddit-accounts', payload)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to save account')
      }
      
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {account ? 'Edit Reddit Account' : 'Add Reddit Account'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4" autoComplete="off">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reddit Username *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">u/</span>
              <input
                type="text"
                name="reddit-account-username"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                value={formData.reddit_username}
                onChange={(e) => setFormData({ ...formData, reddit_username: e.target.value })}
                required
                disabled={!!account}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reddit Password {!account && '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="reddit-account-password"
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                value={formData.reddit_password}
                onChange={(e) => setFormData({ ...formData, reddit_password: e.target.value })}
                required={!account}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={account ? 'Leave blank to keep current' : 'Password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {account && initialPassword
                ? 'This is the saved password. Edit it to change, or leave it as-is to keep it.'
                : 'Password is encrypted and stored securely.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Proxy (Optional)</label>
            <select
              value={formData.proxy_id}
              onChange={(e) => setFormData({ ...formData, proxy_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No proxy</option>
              {proxies.filter(p => p.status === 'active').map((proxy) => (
                <option key={proxy.id} value={proxy.id}>
                  {proxy.name || `${proxy.host}:${proxy.port}`} ({proxy.type})
                </option>
              ))}
            </select>
            <ProxyContext proxy={selectedProxy} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Auto (derived from proxy region)</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {account && (account.proxy_region || account.proxy_timezone) && (
              <p className="text-xs text-muted-foreground mt-1">
                Proxy context:{' '}
                {account.proxy_region && (
                  <span className="font-medium text-foreground">{account.proxy_region}</span>
                )}
                {account.proxy_timezone && <span> — {account.proxy_timezone}</span>}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Leave on Auto to re-derive the zone from the proxy region on the next connect.
            </p>
          </div>

          {account && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="needs_login">Needs Login</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
                <option value="error">Error</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Manually override the account status</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Any notes about this account..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatLogTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function logLevelColor(level) {
  switch (level) {
    case 'error':
      return 'text-red-400'
    case 'warn':
    case 'warning':
      return 'text-amber-300'
    case 'success':
      return 'text-emerald-400'
    case 'debug':
      return 'text-sky-400'
    default:
      return 'text-slate-200'
  }
}

function ConnectModal({ account, onClose, onSuccess }) {
  // phase: idle | running | success | failed
  const [phase, setPhase] = useState('idle')
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [requires2FA, setRequires2FA] = useState(false)
  // Prefill with the password saved on the account so it's visible and reused on
  // Connect. The user can still override it before starting.
  const [password, setPassword] = useState(account?.reddit_password || '')
  const [showPassword, setShowPassword] = useState(false)

  const cancelledRef = useRef(false)
  const logEndRef = useRef(null)

  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [logs])

  const running = phase === 'running'

  const handleStart = async () => {
    setPhase('running')
    setLogs([])
    setResult(null)
    setError(null)
    setRequires2FA(false)
    cancelledRef.current = false

    try {
      const startRes = await api.post(
        `/reddit-accounts/${account.id}/connect/start`,
        password ? { password } : {},
      )
      if (!startRes.ok) {
        const data = await startRes.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to start authorization')
      }
      const startData = await startRes.json()
      const jobId = startData.job_id
      let since = 0

      while (!cancelledRef.current) {
        const statusRes = await api.get(
          `/reddit-accounts/${account.id}/connect/status/${jobId}?since=${since}`,
        )
        if (!statusRes.ok) {
          const data = await statusRes.json().catch(() => ({}))
          throw new Error(data.detail || 'Lost connection to the authorization job')
        }
        const data = await statusRes.json()

        if (data.expired) {
          throw new Error('Authorization job expired. Please try again.')
        }

        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs((prev) => [...prev, ...data.logs])
        }
        since = data.next_since ?? since

        if (data.done) {
          if (data.status === 'success') {
            setResult(data.result)
            setPhase('success')
            setTimeout(() => {
              if (!cancelledRef.current) onSuccess()
            }, 3000)
          } else {
            setError((data.error && data.error.detail) || 'Authorization failed')
            setRequires2FA(!!(data.error && data.error.requires2FA))
            setPhase('failed')
          }
          return
        }

        await new Promise((r) => setTimeout(r, 1000))
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message)
        setPhase('failed')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Connect / Login</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded" disabled={running}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted">
            <p className="text-sm text-foreground">
              Account: <span className="font-medium">u/{account.reddit_username}</span>
            </p>
            {phase === 'running' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running
              </span>
            )}
            {phase === 'success' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500">
                <CheckCircle className="w-3.5 h-3.5" />
                Success
              </span>
            )}
            {phase === 'failed' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                Failed
              </span>
            )}
          </div>

          {phase === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                This will log in to Reddit using browser automation. You can follow each step in
                the live log below. The process may take 10-60 seconds.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Password {account?.reddit_password ? '(saved — used automatically)' : '(optional)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="reddit-connect-password"
                    autoComplete="new-password"
                    data-1p-ignore
                    data-lpignore="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter the Reddit account password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Live log terminal */}
          {phase !== 'idle' && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Authorization log</span>
              </div>
              <div className="rounded-lg border border-border bg-[#0b0e14] font-mono text-xs h-72 overflow-y-auto p-3">
                {logs.length === 0 ? (
                  <p className="text-slate-400">Waiting for the first log line...</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.seq} className="flex gap-2 py-0.5 leading-relaxed">
                      <span className="text-slate-500 shrink-0 tabular-nums">
                        {formatLogTime(log.ts)}
                      </span>
                      <span className={`break-all ${logLevelColor(log.level)}`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {phase === 'success' && result && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connected successfully!</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {result.status && <p>Status: {result.status}</p>}
                {result.reddit_username && <p>Username: u/{result.reddit_username}</p>}
                {result.karma !== null && result.karma !== undefined && (
                  <p>Karma: {result.karma?.toLocaleString()}</p>
                )}
                {result.reddit_id && <p>Reddit ID: {result.reddit_id}</p>}
              </div>
            </div>
          )}

          {phase === 'failed' && error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div className="text-sm text-destructive">
                <p>{error}</p>
                {requires2FA && (
                  <p className="mt-1 text-xs">
                    This account requires two-factor authentication (2FA).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {phase === 'idle' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Start
              </button>
            </div>
          )}

          {phase === 'running' && (
            <p className="text-xs text-muted-foreground text-center">
              Authorization in progress. Please keep this window open.
            </p>
          )}

          {phase === 'failed' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {phase === 'success' && (
            <button
              onClick={onSuccess}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButtons({ account, onAction, checking, loggingOut }) {
  const buttons = [
    {
      action: 'connect',
      label: 'Connect',
      title: 'Connect / Login',
      icon: LinkIcon,
    },
    // Only logged-in (active) accounts can be logged out.
    ...(account.status === 'active'
      ? [
          {
            action: 'logout',
            label: 'Log out',
            title: 'Log out',
            icon: loggingOut ? Loader2 : LogOut,
            spinning: loggingOut,
            disabled: loggingOut,
          },
        ]
      : []),
    {
      action: 'check-status',
      label: 'Status',
      title: 'Check Status',
      icon: checking ? Loader2 : ShieldCheck,
      spinning: checking,
      disabled: checking,
    },
    {
      action: 'edit',
      label: 'Edit',
      title: 'Edit Account',
      icon: Edit2,
    },
    {
      action: 'delete',
      label: 'Delete',
      title: 'Delete',
      icon: Trash2,
      destructive: true,
    },
  ]

  return (
    <div className="inline-flex items-stretch rounded-lg border border-border overflow-hidden">
      {buttons.map(({ action, label, title, icon: Icon, disabled, destructive, spinning }, index) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={disabled}
          title={title}
          aria-label={title}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            index > 0 ? 'border-l border-border' : ''
          } ${
            destructive
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-foreground hover:bg-secondary'
          }`}
        >
          <Icon className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-medium leading-none">{label}</span>
        </button>
      ))}
    </div>
  )
}

export default function RedditAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [proxies, setProxies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [connectAccount, setConnectAccount] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [logoutAccount, setLogoutAccount] = useState(null)

  // Status check
  const [checkingId, setCheckingId] = useState(null)
  const [statusResult, setStatusResult] = useState(null)
  const [loggingOutId, setLoggingOutId] = useState(null)

  // Tags
  const [tagFilter, setTagFilter] = useState('all')
  const [availableTags, setAvailableTags] = useState([])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter])

  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await api.get('/tags')
        if (response.ok) {
          const data = await response.json()
          setAvailableTags(Array.isArray(data) ? data : [])
        }
      } catch {
        // non-critical
      }
    }
    loadTags()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const accountsQuery = tagFilter !== 'all' ? `?tag=${encodeURIComponent(tagFilter)}` : ''
      const [accountsRes, proxiesRes] = await Promise.all([
        api.get(`/reddit-accounts${accountsQuery}`),
        api.get('/proxies'),
      ])
      
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts')
      if (!proxiesRes.ok) throw new Error('Failed to fetch proxies')
      
      const [accountsData, proxiesData] = await Promise.all([
        accountsRes.json(),
        proxiesRes.json(),
      ])
      
      setAccounts(Array.isArray(accountsData) ? accountsData : accountsData.accounts || [])
      setProxies(proxiesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/reddit-accounts/${id}`)
      if (!response.ok) throw new Error('Failed to delete account')
      setAccounts(accounts.filter(a => a.id !== id))
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCheckStatus = async (account) => {
    setCheckingId(account.id)
    setStatusResult(null)
    try {
      const response = await api.post(`/reddit-accounts/${account.id}/check-status`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to check status')
      }
      const data = await response.json()
      const message = data.banned
        ? `u/${account.reddit_username} is banned`
        : data.suspended
          ? `u/${account.reddit_username} is suspended`
          : `u/${account.reddit_username} looks ok`
      setStatusResult({
        type: data.banned || data.suspended ? 'warning' : 'success',
        message,
      })
      await fetchData()
    } catch (err) {
      setStatusResult({ type: 'error', message: err.message })
    } finally {
      setCheckingId(null)
    }
  }

  const handleLogout = async (account) => {
    setLoggingOutId(account.id)
    setStatusResult(null)
    try {
      const response = await api.post(`/reddit-accounts/${account.id}/logout`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Logout failed')
      setStatusResult({
        type: data.already_logged_out ? 'info' : 'success',
        message: data.already_logged_out
          ? `u/${account.reddit_username} was already logged out`
          : `u/${account.reddit_username} logged out`,
      })
      setLogoutAccount(null)
      await fetchData()
    } catch (err) {
      setStatusResult({ type: 'error', message: err.message })
    } finally {
      setLoggingOutId(null)
    }
  }

  const handleAction = (account, action) => {
    switch (action) {
      case 'connect':
        setConnectAccount(account)
        break
      case 'logout':
        setLogoutAccount(account)
        break
      case 'check-status':
        handleCheckStatus(account)
        break
      case 'edit':
        setEditAccount(account)
        break
      case 'delete':
        setDeleteId(account.id)
        break
    }
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setEditAccount(null)
    setConnectAccount(null)
  }

  const handleModalSuccess = () => {
    handleModalClose()
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reddit Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your Reddit accounts with browser automation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Register Account
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          title="Filter by tag"
        >
          <option value="all">All tags</option>
          {availableTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {statusResult && (
        <div
          className={`rounded-lg p-4 flex items-start justify-between gap-3 border ${
            statusResult.type === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : statusResult.type === 'warning'
                ? 'bg-orange-500/10 border-orange-500/20'
                : statusResult.type === 'info'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-destructive/10 border-destructive/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusResult.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            ) : statusResult.type === 'warning' ? (
              <Shield className="w-5 h-5 text-orange-500 shrink-0" />
            ) : statusResult.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <p
              className={`text-sm font-medium ${
                statusResult.type === 'success'
                  ? 'text-green-500'
                  : statusResult.type === 'warning'
                    ? 'text-orange-500'
                    : statusResult.type === 'info'
                      ? 'text-blue-500'
                      : 'text-destructive'
              }`}
            >
              {statusResult.message}
            </p>
          </div>
          <button
            onClick={() => setStatusResult(null)}
            className="p-1 hover:bg-secondary rounded shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Reddit Accounts</h3>
          <p className="text-muted-foreground mb-4">Register a new account or add an existing one to get started</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Register Account
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Account</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Proxy</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Timezone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Used</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">u/{account.reddit_username}</p>
                        {account.reddit_id && (
                          <p className="text-xs text-muted-foreground">ID: {account.reddit_id}</p>
                        )}
                        {account.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{account.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-4 py-3">
                    <TagSelector
                      entityType="reddit_account"
                      entityId={account.id}
                      tags={account.tags || []}
                      onChange={fetchData}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {account.proxy_name ? (
                      <span className="text-sm text-foreground">{account.proxy_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {account.timezone ? (
                      <span className="text-sm text-foreground">{account.timezone}</span>
                    ) : account.proxy_timezone ? (
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Auto</span>
                        <span className="text-xs text-muted-foreground">{account.proxy_timezone}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Auto</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {account.last_used_at ? formatRelativeTime(account.last_used_at) : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end">
                      <ActionButtons
                        account={account}
                        checking={checkingId === account.id}
                        loggingOut={loggingOutId === account.id}
                        onAction={(action) => handleAction(account, action)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account?</h3>
            <p className="text-muted-foreground mb-4">
              This will permanently delete the account and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {logoutAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="w-5 h-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Log out of account?</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to log out of{' '}
              <span className="font-medium text-foreground">u/{logoutAccount.reddit_username}</span>
              ? This ends the stored browser session and the account will need to be reconnected
              before it can be used again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutAccount(null)}
                disabled={loggingOutId === logoutAccount.id}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogout(logoutAccount)}
                disabled={loggingOutId === logoutAccount.id}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loggingOutId === logoutAccount.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging out…
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Log out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showAddModal || editAccount) && (
        <AccountModal
          account={editAccount}
          proxies={proxies}
          onClose={handleModalClose}
          onSave={handleModalSuccess}
        />
      )}

      {connectAccount && (
        <ConnectModal
          account={connectAccount}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showRegisterModal && (
        <RegisterAccountModal
          proxies={proxies}
          onClose={() => setShowRegisterModal(false)}
          onComplete={() => {
            setShowRegisterModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
