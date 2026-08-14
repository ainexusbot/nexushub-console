import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountPostsAPI } from '../utils/postsApi'
import { api } from '../utils/api'
import TagBadge from '../components/TagBadge'
import {
  Users,
  UserCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'reddit_username', label: 'Username' },
  { value: 'created_at', label: 'Created' },
  { value: 'last_used_at', label: 'Last used' },
  { value: 'karma', label: 'Karma' },
  { value: 'status', label: 'Status' },
  { value: 'total_posts', label: 'Total posts' },
  { value: 'published_posts', label: 'Published' },
  { value: 'draft_posts', label: 'Drafts' },
  { value: 'failed_posts', label: 'Failed' },
]

const ACTIVE_OPTIONS = [
  { value: 'all', label: 'All accounts' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Non-active' },
]

const LIMIT_OPTIONS = [10, 20, 50, 100]

function AccountStatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    needs_login: 'bg-yellow-500/10 text-yellow-500',
    banned: 'bg-red-500/10 text-red-500',
    suspended: 'bg-orange-500/10 text-orange-500',
    locked: 'bg-orange-500/10 text-orange-500',
    error: 'bg-red-500/10 text-red-500',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  )
}

function AccountRow({ account, onClick }) {
  return (
    <button
      onClick={() => onClick(account)}
      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <UserCircle className="w-5 h-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground truncate">u/{account.reddit_username}</p>
          <AccountStatusBadge status={account.status} />
          {(account.tags || []).map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {account.karma?.toLocaleString() || 0} karma
        </p>
      </div>

      <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5 text-xs">
        <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
          {account.posts?.total || 0} total
        </span>
        <span className="px-2 py-0.5 bg-green-500/10 rounded-full text-green-600">
          {account.posts?.published || 0} pub
        </span>
        {(account.posts?.drafts || 0) > 0 && (
          <span className="px-2 py-0.5 bg-gray-500/10 rounded-full text-gray-500">
            {account.posts.drafts} draft
          </span>
        )}
        {(account.posts?.failed || 0) > 0 && (
          <span className="px-2 py-0.5 bg-red-500/10 rounded-full text-red-500">
            {account.posts.failed} fail
          </span>
        )}
      </div>
    </button>
  )
}

export default function AccountPostsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters / sorting / pagination
  const [tag, setTag] = useState('all')
  const [active, setActive] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reddit_username')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [availableTags, setAvailableTags] = useState([])

  const accountPostsApi = new AccountPostsAPI()

  // Load tags for the filter dropdown.
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

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = {
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      }
      if (tag !== 'all') filters.tag = tag
      if (active !== 'all') filters.active = active
      if (search) filters.search = search

      const result = await accountPostsApi.getAccounts(filters)
      if (!result.success) throw new Error(result.error)

      setAccounts(result.data.accounts || [])
      setPagination(
        result.data.pagination || {
          page: 1,
          limit,
          total_count: result.data.total_accounts || 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, active, search, sortBy, sortOrder, page, limit])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Reset to page 1 whenever a filter/sort/limit changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1)
  }, [tag, active, search, sortBy, sortOrder, limit])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleSelectAccount = (account) => {
    navigate(`/account-posts/${account.id}`)
  }

  const totalCount = pagination?.total_count ?? 0
  const totalPages = pagination?.total_pages ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Data</h1>
        <p className="text-muted-foreground mt-1">
          Select a Reddit account to view everything about it — posts, comments and communities
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {ACTIVE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActive(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            title="Filter by tag"
          >
            <option value="all">All tags</option>
            {availableTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search username..."
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              title="Sort by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              title="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">Per page</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              title="Accounts per page"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Accounts</h3>
          <p className="text-muted-foreground">No Reddit accounts match the current filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {totalCount} Reddit account{totalCount === 1 ? '' : 's'}
            {totalPages > 1 ? ` — page ${pagination?.page ?? page} of ${totalPages}` : ''}
          </p>

          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} onClick={handleSelectAccount} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination?.has_prev}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {pagination?.page ?? page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination?.has_next}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
