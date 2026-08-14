import { useState, useEffect, useMemo } from 'react'
import { api, formatDate, formatRelativeTime } from '../utils/api'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  Search,
  Hash,
  MessageSquare,
  ChevronDown,
  Loader2,
  UserCircle,
  Users,
  Eye,
  ShieldCheck,
  ArrowUpDown,
} from 'lucide-react'
import TagSelector from '../components/TagSelector'
import TagBadge from '../components/TagBadge'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
    banned: 'bg-destructive/10 text-destructive',
  }
  const icons = {
    active: CheckCircle,
    inactive: XCircle,
    banned: Ban,
  }
  const Icon = icons[status] || XCircle
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

const MODERATION_LEVELS = ['none', 'easy', 'medium', 'hard']

function formatCompact(value) {
  const num = Number(value || 0)
  if (num >= 1000000) return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`
  return String(num)
}

function ModerationBadge({ level }) {
  const value = level || 'none'
  const styles = {
    none: 'bg-muted text-muted-foreground',
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-destructive/10 text-destructive',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${
        styles[value] || styles.none
      }`}
    >
      <ShieldCheck className="w-3 h-3" />
      {value}
    </span>
  )
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 transition-colors ${
        active ? 'text-foreground' : 'hover:text-foreground'
      }`}
    >
      {label}
      <ArrowUpDown className={`w-3.5 h-3.5 ${active ? 'opacity-100' : 'opacity-40'}`} />
    </button>
  )
}

function SubredditModal({ subreddit, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: subreddit?.name || '',
    title: subreddit?.title || '',
    description: subreddit?.description || '',
    url: subreddit?.url || '',
    status: subreddit?.status || 'active',
    subscribers_count: subreddit?.subscribers_count ?? '',
    weekly_views: subreddit?.weekly_views ?? '',
    moderation_level: subreddit?.moderation_level || 'none',
    moderation_rules: subreddit?.moderation_rules || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const statuses = ['active', 'inactive', 'banned']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        title: formData.title || undefined,
        description: formData.description || undefined,
        url: formData.url || undefined,
        status: formData.status,
        subscribers_count:
          formData.subscribers_count === '' ? undefined : parseInt(formData.subscribers_count, 10),
        weekly_views: formData.weekly_views === '' ? undefined : parseInt(formData.weekly_views, 10),
        moderation_level: formData.moderation_level,
        moderation_rules: formData.moderation_rules || undefined,
      }

      const response = subreddit
        ? await api.patch(`/subreddits/${subreddit.id}`, payload)
        : await api.post('/subreddits', payload)

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 409) {
          throw new Error('A subreddit with this name already exists')
        }
        throw new Error(data.detail || 'Failed to save subreddit')
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
            {subreddit ? 'Edit Subreddit' : 'Add Subreddit'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="subreddit"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enter without the r/ prefix. Must be unique.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Display title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://reddit.com/r/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subscribers</label>
              <input
                type="number"
                min="0"
                value={formData.subscribers_count}
                onChange={(e) => setFormData({ ...formData, subscribers_count: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Weekly Views</label>
              <input
                type="number"
                min="0"
                value={formData.weekly_views}
                onChange={(e) => setFormData({ ...formData, weekly_views: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Moderation Level</label>
            <div className="flex gap-2">
              {MODERATION_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, moderation_level: level })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    formData.moderation_level === level
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Moderation Rules</label>
            <textarea
              value={formData.moderation_rules}
              onChange={(e) => setFormData({ ...formData, moderation_rules: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder={'1. No spam\n2. Be civil'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <div className="flex gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, status })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    formData.status === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
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
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AccountStatsPanel({ subredditId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get(`/subreddits/${subredditId}`)
        if (!response.ok) throw new Error('Failed to load account stats')
        const data = await response.json()
        if (!cancelled) setStats(data.account_stats || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [subredditId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading account stats...
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>
  }

  if (!stats || stats.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No comments sent to this subreddit yet.</p>
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Comments by account</p>
      <div className="flex flex-wrap gap-2">
        {stats.map((s) => (
          <div
            key={s.reddit_account_id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border"
          >
            <UserCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">u/{s.reddit_username}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <MessageSquare className="w-3 h-3" />
              {s.comments_count}
            </span>
            {s.last_comment_at && (
              <span className="text-xs text-muted-foreground">· {formatRelativeTime(s.last_comment_at)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SubredditRow({ subreddit, onEdit, onDelete, onTagsChange }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">r/{subreddit.name}</p>
              {subreddit.title && (
                <p className="text-xs text-muted-foreground truncate">{subreddit.title}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={subreddit.status} />
        </td>
        <td className="px-4 py-3">
          <ModerationBadge level={subreddit.moderation_level} />
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-sm text-foreground">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            {formatCompact(subreddit.subscribers_count)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-sm text-foreground">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            {formatCompact(subreddit.weekly_views)}
          </span>
        </td>
        <td className="px-4 py-3">
          <TagSelector
            entityType="subreddit"
            entityId={subreddit.id}
            tags={subreddit.tags || []}
            onChange={onTagsChange}
          />
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Show account breakdown"
          >
            <MessageSquare className="w-3 h-3" />
            {subreddit.comments_count ?? 0} sent
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(subreddit.created_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(subreddit)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(subreddit.id)}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30 border-b border-border">
          <td colSpan="9" className="px-4 py-3">
            <AccountStatsPanel subredditId={subreddit.id} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function SubredditsPage() {
  const [subreddits, setSubreddits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [moderationFilter, setModerationFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })
  const [availableTags, setAvailableTags] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editSubreddit, setEditSubreddit] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchSubreddits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, moderationFilter, tagFilter, search])

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

  const fetchSubreddits = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (moderationFilter !== 'all') params.set('moderation_level', moderationFilter)
      if (tagFilter !== 'all') params.set('tag', tagFilter)
      if (search) params.set('search', search)
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await api.get(`/subreddits${query}`)
      if (!response.ok) throw new Error('Failed to fetch subreddits')
      const data = await response.json()
      setSubreddits(Array.isArray(data) ? data : data.subreddits || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    )
  }

  const sortedSubreddits = useMemo(() => {
    const list = [...subreddits]
    const { key, dir } = sort
    list.sort((a, b) => {
      let av = a[key]
      let bv = b[key]
      if (key === 'created_at') {
        av = new Date(av || 0).getTime()
        bv = new Date(bv || 0).getTime()
      } else if (key === 'name') {
        av = (av || '').toLowerCase()
        bv = (bv || '').toLowerCase()
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      } else {
        av = Number(av || 0)
        bv = Number(bv || 0)
      }
      return dir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [subreddits, sort])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/subreddits/${id}`)
      if (!response.ok) throw new Error('Failed to delete subreddit')
      setSubreddits(subreddits.filter((s) => s.id !== id))
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditSubreddit(null)
    fetchSubreddits()
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
          <h1 className="text-2xl font-bold text-foreground">Subreddits</h1>
          <p className="text-muted-foreground mt-1">Manage tracked subreddits and view comment activity</p>
        </div>
        <button
          onClick={() => {
            setEditSubreddit(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subreddit
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'inactive', 'banned'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring capitalize"
            title="Filter by moderation level"
          >
            <option value="all">All moderation</option>
            {MODERATION_LEVELS.map((level) => (
              <option key={level} value={level} className="capitalize">
                {level}
              </option>
            ))}
          </select>
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
        <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search subreddits..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {subreddits.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Subreddits</h3>
          <p className="text-muted-foreground mb-4">Add a subreddit to start tracking comment activity</p>
          <button
            onClick={() => {
              setEditSubreddit(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Subreddit
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    <SortHeader label="Subreddit" sortKey="name" sort={sort} onSort={toggleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    <SortHeader label="Moderation" sortKey="moderation_level" sort={sort} onSort={toggleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    <SortHeader label="Subscribers" sortKey="subscribers_count" sort={sort} onSort={toggleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    <SortHeader label="Weekly Views" sortKey="weekly_views" sort={sort} onSort={toggleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tags</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Comments</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    <SortHeader label="Created" sortKey="created_at" sort={sort} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubreddits.map((subreddit) => (
                  <SubredditRow
                    key={subreddit.id}
                    subreddit={subreddit}
                    onEdit={(s) => {
                      setEditSubreddit(s)
                      setShowModal(true)
                    }}
                    onDelete={setDeleteId}
                    onTagsChange={fetchSubreddits}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <SubredditModal
          subreddit={editSubreddit}
          onClose={() => {
            setShowModal(false)
            setEditSubreddit(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Subreddit?</h3>
            <p className="text-muted-foreground mb-4">This action cannot be undone.</p>
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
