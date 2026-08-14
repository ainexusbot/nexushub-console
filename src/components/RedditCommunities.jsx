import { useState, useEffect } from 'react'
import PostsAPI from '../utils/postsApi'
import { api } from '../utils/api'
import {
  Users,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Inbox,
  ExternalLink,
  Star,
  Hash,
  Search,
  X,
  Info,
} from 'lucide-react'

function CommunityIcon({ community }) {
  if (community.icon) {
    return (
      <img
        src={community.icon || '/placeholder.svg'}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        crossOrigin="anonymous"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: community.primary_color || '#6b7280' }}
    >
      {(community.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function JoinCommunityModal({ account, onClose, onResult }) {
  const [mode, setMode] = useState('saved') // 'saved' | 'custom'
  const [subreddit, setSubreddit] = useState('')
  const [savedList, setSavedList] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    const loadSaved = async () => {
      setSavedLoading(true)
      try {
        const res = await api.get('/subreddits')
        if (!res.ok) throw new Error()
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.subreddits || []
        if (active) {
          setSavedList(list)
          if (list.length === 0) setMode('custom')
        }
      } catch {
        if (active) setMode('custom')
      } finally {
        if (active) setSavedLoading(false)
      }
    }
    loadSaved()
    return () => {
      active = false
    }
  }, [])

  const filteredSaved = savedList.filter((s) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.title && s.title.toLowerCase().includes(q))
    )
  })

  const canSubmit =
    mode === 'saved' ? Boolean(selectedId) : Boolean(subreddit.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const payload = { account_id: account.id }
      if (mode === 'saved') payload.subreddit_id = selectedId
      else payload.subreddit = subreddit.trim()

      const response = await api.post('/reddit/join', payload)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to join community')
      }

      onResult({
        type: data.already_joined ? 'info' : 'success',
        message: data.detail || 'Joined community successfully.',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Join Community</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-foreground">
              Account: <span className="font-medium">u/{account.reddit_username}</span>
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
            <button
              type="button"
              onClick={() => setMode('saved')}
              disabled={loading}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'saved'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              From saved
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              disabled={loading}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'custom'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Custom link
            </button>
          </div>

          {mode === 'saved' ? (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loading || savedLoading}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  placeholder="Search saved communities..."
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {savedLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading communities...
                  </div>
                ) : filteredSaved.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No saved communities found.
                  </div>
                ) : (
                  filteredSaved.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      disabled={loading}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        selectedId === s.id ? 'bg-primary/10' : 'hover:bg-secondary'
                      }`}
                    >
                      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          r/{s.name}
                        </p>
                        {s.title && (
                          <p className="text-xs text-muted-foreground truncate">{s.title}</p>
                        )}
                      </div>
                      {selectedId === s.id && (
                        <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Community link or name *
              </label>
              <input
                type="text"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                autoFocus
                disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="https://www.reddit.com/r/type2diabetes/"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a full link, r/name, or just the community name.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Join
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RedditCommunities({ account }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [communities, setCommunities] = useState([])
  const [showJoin, setShowJoin] = useState(false)
  const [notice, setNotice] = useState(null)

  const postsApi = new PostsAPI()

  const handleFetch = async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await postsApi.getCommunities(account.id)

    if (!res.success) {
      setError(res.error)
      setLoading(false)
      return
    }

    setResult(res.data)
    setCommunities(res.data?.communities || [])
    setLoading(false)
  }

  const renderResult = () => {
    if (!result) return null

    if (communities.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-8 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No communities</p>
          <p className="text-sm text-muted-foreground">
            This account isn&apos;t subscribed to any communities yet.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm font-medium text-foreground">
            {communities.length} communit{communities.length === 1 ? 'y' : 'ies'} subscribed
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {communities.map((c) => (
            <li
              key={c.id || c.prefixed_name}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <CommunityIcon community={c} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {c.prefixed_name}
                  </a>
                  {c.is_favorite && (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
                  )}
                </div>
              </div>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Open ${c.prefixed_name} on Reddit`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Communities &amp; subscriptions</p>
            <p className="text-sm text-muted-foreground">
              See which communities this account is subscribed to, or join a new one.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFetch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {result ? 'Refresh from Reddit' : 'Show communities'}
                </>
              )}
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Users className="h-4 w-4" />
              Join Community
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            This reads the live subscriptions straight from Reddit via a real browser session, so it
            can take a few seconds.
          </p>

          {notice && (
            <div
              className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                notice.type === 'success'
                  ? 'border-green-500/20 bg-green-500/10'
                  : notice.type === 'info'
                    ? 'border-blue-500/20 bg-blue-500/10'
                    : 'border-destructive/20 bg-destructive/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {notice.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                ) : notice.type === 'info' ? (
                  <Info className="h-5 w-5 shrink-0 text-blue-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
                <p
                  className={`text-sm font-medium ${
                    notice.type === 'success'
                      ? 'text-green-500'
                      : notice.type === 'info'
                        ? 'text-blue-500'
                        : 'text-destructive'
                  }`}
                >
                  {notice.message}
                </p>
              </div>
              <button
                onClick={() => setNotice(null)}
                className="rounded p-1 hover:bg-secondary"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {renderResult()}
        </div>
      )}

      {showJoin && (
        <JoinCommunityModal
          account={account}
          onClose={() => setShowJoin(false)}
          onResult={(res) => {
            setShowJoin(false)
            setNotice(res)
            setOpen(true)
            handleFetch()
          }}
        />
      )}
    </div>
  )
}
