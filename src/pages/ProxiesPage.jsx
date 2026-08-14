import { useState, useEffect } from 'react'
import { api, formatDate } from '../utils/api'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  UserCircle,
  Users,
  DollarSign,
  Gift
} from 'lucide-react'
import TagSelector from '../components/TagSelector'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/10 text-destructive',
  }
  
  const icons = {
    active: CheckCircle,
    inactive: XCircle,
    error: AlertCircle,
  }
  
  const Icon = icons[status] || icons.inactive
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function ProxyTypeBadge({ type }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground uppercase">
      {type}
    </span>
  )
}

function PlanBadge({ plan }) {
  const isPaid = plan === 'paid'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isPaid ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
      }`}
    >
      {isPaid ? <DollarSign className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
      {isPaid ? 'Paid' : 'Free'}
    </span>
  )
}

function ExpiryCell({ expiresAt }) {
  if (!expiresAt) {
    return <span className="text-sm text-muted-foreground">Never</span>
  }

  const date = new Date(expiresAt)
  const now = new Date()
  const msLeft = date.getTime() - now.getTime()
  const dayMs = 1000 * 60 * 60 * 24
  const expired = msLeft <= 0
  const soon = !expired && msLeft <= 7 * dayMs

  const styles = expired
    ? 'bg-destructive/10 text-destructive'
    : soon
    ? 'bg-warning/10 text-warning'
    : 'bg-muted text-muted-foreground'

  let label
  if (expired) {
    label = 'Expired'
  } else {
    const days = Math.ceil(msLeft / dayMs)
    label = days <= 1 ? '< 1 day left' : `${days} days left`
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-foreground">{formatDate(expiresAt)}</span>
      <span className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
        {(expired || soon) && <Clock className="w-3 h-3" />}
        {label}
      </span>
    </div>
  )
}

function PasswordCell({ password }) {
  const [show, setShow] = useState(false)
  if (!password) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-1">
      <code className="text-sm font-mono text-muted-foreground">
        {show ? password : '••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="p-1 hover:bg-secondary rounded"
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  )
}

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ProxyModal({ proxy, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: proxy?.name || '',
    host: proxy?.host || '',
    port: proxy?.port || '',
    username: proxy?.username || '',
    password: proxy?.password || '',
    type: proxy?.type || 'http',
    plan: proxy?.plan || 'free',
    status: proxy?.status || 'active',
    expires_at: toLocalInputValue(proxy?.expires_at),
    region: proxy?.region || '',
    timezone: proxy?.timezone || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [regions, setRegions] = useState([])

  const proxyTypes = ['http', 'https', 'socks4', 'socks5']

  useEffect(() => {
    let cancelled = false
    const loadRegions = async () => {
      try {
        const response = await api.get('/proxies/meta/regions')
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setRegions(Array.isArray(data.regions) ? data.regions : [])
      } catch {
        // non-critical — region/timezone fields stay empty
      }
    }
    loadRegions()
    return () => {
      cancelled = true
    }
  }, [])

  const timezoneOptions =
    regions.find((r) => r.region === formData.region)?.timezones || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        port: parseInt(formData.port, 10),
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : null,
        region: formData.region || null,
        timezone: formData.timezone || null,
      }

      // Status is only managed manually when editing an existing proxy
      if (!proxy) {
        delete payload.status
      }
      
      const response = proxy
        ? await api.patch(`/proxies/${proxy.id}`, payload)
        : await api.post('/proxies', payload)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to save proxy')
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
            {proxy ? 'Edit Proxy' : 'Add Proxy'}
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
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="US Proxy 1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Host *</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Port *</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                required
                min="1"
                max="65535"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                placeholder="8080"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Type</label>
            <div className="flex gap-2">
              {proxyTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors uppercase ${
                    formData.type === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Region</label>
              <select
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value, timezone: '' })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Auto / none</option>
                {regions.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.region}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                disabled={!formData.region}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Auto (from region)</option>
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Pick a region and the backend auto-selects a timezone, or override it manually.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Plan</label>
            <div className="flex gap-2">
              {[
                { value: 'free', label: 'Free', Icon: Gift },
                { value: 'paid', label: 'Paid', Icon: DollarSign },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, plan: value })}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.plan === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {proxy && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Manually override the status, e.g. mark a dead proxy as inactive.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Username</label>
            <input
              type="text"
              name="proxy-username"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="proxyuser"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="proxy-password"
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={proxy ? '(unchanged)' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Expires At</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              {formData.expires_at && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expires_at: '' })}
                  className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors text-sm"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Optional. Leave empty for no expiration.</p>
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

function AccountStatusDot({ status }) {
  const colors = {
    active: 'bg-success',
    inactive: 'bg-muted-foreground',
    banned: 'bg-destructive',
    error: 'bg-destructive',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-muted-foreground'}`}
      title={status}
    />
  )
}

function ProxyRow({ proxy, checkingId, onCheck, onEdit, onDelete, onTagsChange }) {
  const [expanded, setExpanded] = useState(false)
  const accounts = proxy.connected_accounts || []
  const count =
    proxy.connected_accounts_count != null
      ? proxy.connected_accounts_count
      : accounts.length
  const hasAccounts = count > 0

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="font-medium text-foreground">
            {proxy.name || `${proxy.host}:${proxy.port}`}
          </div>
          {proxy.username && (
            <div className="text-sm text-muted-foreground">Auth: {proxy.username}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <code className="text-sm font-mono text-muted-foreground">
            {proxy.host}:{proxy.port}
          </code>
        </td>
        <td className="px-4 py-3">
          <PasswordCell password={proxy.password} />
        </td>
        <td className="px-4 py-3">
          <ProxyTypeBadge type={proxy.type} />
        </td>
        <td className="px-4 py-3">
          {proxy.region || proxy.timezone ? (
            <div className="flex flex-col">
              {proxy.region && (
                <span className="text-sm font-medium text-foreground">{proxy.region}</span>
              )}
              {proxy.timezone && (
                <span className="text-xs text-muted-foreground">{proxy.timezone}</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <PlanBadge plan={proxy.plan} />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={proxy.status} />
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => hasAccounts && setExpanded(!expanded)}
            disabled={!hasAccounts}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              hasAccounts
                ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                : 'bg-muted text-muted-foreground cursor-default'
            }`}
            title={hasAccounts ? 'Show connected accounts' : 'No connected accounts'}
          >
            <Users className="w-3 h-3" />
            {count} {count === 1 ? 'account' : 'accounts'}
            {hasAccounts && (
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <ExpiryCell expiresAt={proxy.expires_at} />
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {formatDate(proxy.last_checked_at)}
        </td>
        <td className="px-4 py-3">
          <TagSelector
            entityType="proxy"
            entityId={proxy.id}
            tags={proxy.tags || []}
            onChange={onTagsChange}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onCheck(proxy.id)}
              disabled={checkingId === proxy.id}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              title="Check proxy"
            >
              {checkingId === proxy.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => onEdit(proxy)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(proxy.id)}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && hasAccounts && (
        <tr className="bg-muted/30 border-b border-border">
          <td colSpan="12" className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Connected Reddit accounts
            </p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border"
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    u/{acc.reddit_username}
                  </span>
                  <AccountStatusDot status={acc.status} />
                  <span className="text-xs text-muted-foreground capitalize">{acc.status}</span>
                  {acc.last_used_at && (
                    <span className="text-xs text-muted-foreground">
                      · {formatDate(acc.last_used_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ProxiesPage() {
  const [proxies, setProxies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalProxy, setModalProxy] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [checkingId, setCheckingId] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [planFilter, setPlanFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [availableTags, setAvailableTags] = useState([])

  const freeCount = proxies.filter((p) => (p.plan || 'free') !== 'paid').length
  const paidCount = proxies.filter((p) => p.plan === 'paid').length
  const filteredProxies =
    planFilter === 'all'
      ? proxies
      : proxies.filter((p) =>
          planFilter === 'paid'
            ? p.plan === 'paid'
            : (p.plan || 'free') !== 'paid'
        )

  const planTabs = [
    { value: 'all', label: 'All', count: proxies.length },
    { value: 'free', label: 'Free', count: freeCount },
    { value: 'paid', label: 'Paid', count: paidCount },
  ]

  useEffect(() => {
    fetchProxies()
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

  const fetchProxies = async () => {
    try {
      const query = tagFilter !== 'all' ? `?tag=${encodeURIComponent(tagFilter)}` : ''
      const response = await api.get(`/proxies${query}`)
      if (!response.ok) throw new Error('Failed to fetch proxies')
      const data = await response.json()
      setProxies(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/proxies/${id}`)
      if (!response.ok) throw new Error('Failed to delete proxy')
      setProxies(proxies.filter(p => p.id !== id))
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCheck = async (id) => {
    setCheckingId(id)
    setCheckResult(null)
    try {
      const response = await api.post(`/proxies/${id}/check`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to check proxy')
      }

      setProxies(proxies.map(p =>
        p.id === id
          ? (data.proxy
              ? { ...p, ...data.proxy }
              : { ...p, status: data.status, last_checked_at: data.checked_at })
          : p
      ))

      const proxy = proxies.find(p => p.id === id)
      const label = proxy ? (proxy.name || `${proxy.host}:${proxy.port}`) : 'Proxy'

      if (data.ok) {
        const parts = []
        if (data.ip) parts.push(`IP ${data.ip}`)
        if (data.latency_ms != null) parts.push(`${data.latency_ms} ms`)
        setCheckResult({
          type: 'success',
          message: `${label} is active${parts.length ? ` — ${parts.join(', ')}` : ''}`,
        })
      } else {
        setCheckResult({
          type: 'error',
          message: `${label} failed: ${data.error || 'proxy is not responding'}`,
        })
      }
    } catch (err) {
      setCheckResult({ type: 'error', message: err.message })
    } finally {
      setCheckingId(null)
    }
  }

  const openEditModal = (proxy) => {
    setModalProxy(proxy)
    setShowModal(true)
  }

  const openAddModal = () => {
    setModalProxy(null)
    setShowModal(true)
  }

  const handleModalSave = () => {
    setShowModal(false)
    setModalProxy(null)
    fetchProxies()
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
          <h1 className="text-2xl font-bold text-foreground">Proxies</h1>
          <p className="text-muted-foreground mt-1">Manage proxy servers for Reddit accounts</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Proxy
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {checkResult && (
        <div
          className={`rounded-lg p-4 flex items-start justify-between gap-3 border ${
            checkResult.type === 'success'
              ? 'bg-success/10 border-success/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {checkResult.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-success shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <p
              className={`text-sm font-medium ${
                checkResult.type === 'success' ? 'text-success' : 'text-destructive'
              }`}
            >
              {checkResult.message}
            </p>
          </div>
          <button
            onClick={() => setCheckResult(null)}
            className="p-1 hover:bg-secondary rounded shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {proxies.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Proxies</h3>
          <p className="text-muted-foreground mb-4">Add proxies to route your Reddit account traffic</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Proxy
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
            {planTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setPlanFilter(tab.value)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  planFilter === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    planFilter === tab.value
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
            <div className="ml-auto pb-2">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Address</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Password</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Region / TZ</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Accounts</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Expires</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Checked</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tags</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProxies.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No {planFilter} proxies.
                    </td>
                  </tr>
                ) : (
                  filteredProxies.map((proxy) => (
                    <ProxyRow
                      key={proxy.id}
                      proxy={proxy}
                      checkingId={checkingId}
                      onCheck={handleCheck}
                      onEdit={openEditModal}
                      onDelete={setDeleteId}
                      onTagsChange={fetchProxies}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ProxyModal
          proxy={modalProxy}
          onClose={() => {
            setShowModal(false)
            setModalProxy(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Proxy?</h3>
            <p className="text-muted-foreground mb-4">
              This action cannot be undone. Accounts using this proxy will need to be updated.
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
    </div>
  )
}
