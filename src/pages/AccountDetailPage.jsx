import { useState, useEffect } from 'react'
import { useParams, useNavigate, NavLink } from 'react-router-dom'
import { AccountPostsAPI } from '../utils/postsApi'
import { formatRelativeTime } from '../utils/api'
import RedditPostsVerifier from '../components/RedditPostsVerifier'
import RedditCommentsVerifier from '../components/RedditCommentsVerifier'
import RedditCommunities from '../components/RedditCommunities'
import AccountSettingsPanel from '../components/AccountSettingsPanel'
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Copy,
  ArrowLeft,
  FileText,
  UserCircle,
  Settings,
  ListChecks,
} from 'lucide-react'

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-500/10 text-gray-500',
    pending_confirmation: 'bg-yellow-500/10 text-yellow-500',
    published: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
  }

  const icons = {
    draft: Clock,
    pending_confirmation: Clock,
    published: CheckCircle,
    failed: AlertCircle,
  }

  const labels = {
    draft: 'Draft',
    pending_confirmation: 'Pending',
    published: 'Published',
    failed: 'Failed',
  }

  const Icon = icons[status] || icons.draft

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      <Icon className="w-3 h-3" />
      {labels[status] || status}
    </span>
  )
}

function AccountStatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    banned: 'bg-red-500/10 text-red-500',
    suspended: 'bg-yellow-500/10 text-yellow-500',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  )
}

function PostTypeIcon({ postType }) {
  const icons = {
    text: MessageSquare,
    link: Copy,
    image: Eye,
  }
  const Icon = icons[postType] || MessageSquare
  return <Icon className="w-4 h-4" />
}

function PostRow({ post }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PostTypeIcon postType={post.post_type} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{post.title}</p>
              <p className="text-xs text-muted-foreground">
                {post.target_type === 'subreddit' ? `r/${post.target_value}` : `u/${post.target_value}`}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={post.status} />
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{post.post_type}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{formatRelativeTime(post.created_at)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className={`p-2 hover:bg-secondary rounded-lg transition-colors ${expanded ? 'rotate-180' : ''}`}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan="5" className="px-4 py-3">
            <div className="space-y-2">
              {post.content && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Content:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                </div>
              )}
              {post.url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">URL:</p>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {post.url}
                  </a>
                </div>
              )}
              {post.status === 'published' && post.reddit_post_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reddit Post:</p>
                  <a
                    href={post.reddit_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View on Reddit
                  </a>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StatsCard({ label, value, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-500',
    gray: 'bg-gray-500/10 text-gray-500',
    red: 'bg-red-500/10 text-red-500',
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

function SectionTab({ to, end, icon: Icon, title, subtitle }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
          isActive ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'
        }`
      }
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </NavLink>
  )
}

export default function AccountDetailPage({ section = 'posts' }) {
  const { accountId } = useParams()
  const navigate = useNavigate()

  const [account, setAccount] = useState(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState(null)

  const [accountInfo, setAccountInfo] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState(null)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [postTypeFilter, setPostTypeFilter] = useState('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  const accountPostsApi = new AccountPostsAPI()

  // Load the account meta whenever the id in the URL changes. This makes the
  // page survive a full refresh — we re-resolve the account from its id.
  useEffect(() => {
    let cancelled = false
    const loadAccount = async () => {
      setAccountLoading(true)
      setAccountError(null)
      const result = await accountPostsApi.getAccounts()
      if (cancelled) return
      if (!result.success) {
        setAccountError(result.error)
        setAccountLoading(false)
        return
      }
      const found = (result.data.accounts || []).find(
        (a) => String(a.id) === String(accountId),
      )
      if (!found) {
        setAccountError('Account not found.')
        setAccount(null)
      } else {
        setAccount(found)
      }
      setAccountLoading(false)
    }
    loadAccount()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  // Reset list state when switching accounts.
  useEffect(() => {
    setPage(1)
    setStatusFilter('all')
    setPostTypeFilter('all')
    setTargetTypeFilter('all')
    setPosts([])
    setStats(null)
    setAccountInfo(null)
  }, [accountId])

  // Fetch posts/stats only for the posts section.
  useEffect(() => {
    if (account && section === 'posts') {
      fetchAccountPosts()
      fetchAccountStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, section, statusFilter, postTypeFilter, targetTypeFilter, sortBy, sortOrder, page])

  const fetchAccountPosts = async () => {
    if (!account) return
    setPostsLoading(true)
    try {
      const filters = {
        page,
        limit: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      }
      if (statusFilter !== 'all') filters.status = statusFilter
      if (postTypeFilter !== 'all') filters.post_type = postTypeFilter
      if (targetTypeFilter !== 'all') filters.target_type = targetTypeFilter

      const result = await accountPostsApi.getByAccountId(account.id, filters)
      if (!result.success) throw new Error(result.error)

      setPosts(result.data.posts || [])
      setPagination(result.data.pagination || null)
      setAccountInfo(result.data.account || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchAccountStats = async () => {
    if (!account) return
    try {
      const result = await accountPostsApi.getAccountStats(account.id)
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleFilterChange = (type, value) => {
    if (type === 'status') setStatusFilter(value)
    if (type === 'postType') setPostTypeFilter(value)
    if (type === 'targetType') setTargetTypeFilter(value)
    setPage(1)
  }

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (accountError || !account) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/account-posts')}
          className="inline-flex items-center gap-2 p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to accounts
        </button>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{accountError || 'Account not found.'}</p>
        </div>
      </div>
    )
  }

  const displayAccount = accountInfo || account

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/account-posts')}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">u/{displayAccount.reddit_username}</h1>
              <AccountStatusBadge status={displayAccount.status} />
            </div>
            <p className="text-muted-foreground">{displayAccount.karma?.toLocaleString() || 0} karma</p>
          </div>
        </div>
      </div>

      {/* Section switch — now two separate routes so a refresh keeps you here */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionTab
          to={`/account-posts/${account.id}`}
          end
          icon={ListChecks}
          title="Posts & activity"
          subtitle="Posts, comments and communities"
        />
        <SectionTab
          to={`/account-posts/${account.id}/settings`}
          icon={Settings}
          title="Account settings"
          subtitle="Profile, password & avatar"
        />
      </div>

      {section === 'settings' ? (
        <AccountSettingsPanel account={account} />
      ) : (
        <>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">Error: {error}</p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard label="Total Posts" value={stats.totals?.total || 0} icon={FileText} color="primary" />
              <StatsCard label="Published" value={stats.totals?.published || 0} icon={CheckCircle} color="green" />
              <StatsCard label="Drafts" value={stats.totals?.drafts || 0} icon={Clock} color="gray" />
              <StatsCard label="Failed" value={stats.totals?.failed || 0} icon={AlertCircle} color="red" />
            </div>
          )}

          {/* Top Subreddits */}
          {stats?.top_subreddits && stats.top_subreddits.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-medium text-foreground mb-3">Top Subreddits</h3>
              <div className="flex flex-wrap gap-2">
                {stats.top_subreddits.map((sub) => (
                  <span key={sub.subreddit} className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                    r/{sub.subreddit} ({sub.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Live on Reddit */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live on Reddit</h2>
              <p className="text-sm text-muted-foreground">
                Fetch this account&apos;s real data straight from Reddit — posts, comments and community subscriptions.
              </p>
            </div>
            <RedditCommunities account={account} />
            <RedditPostsVerifier account={account} />
            <RedditCommentsVerifier account={account} />
          </div>

          {/* Saved in database */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">Saved in database</h2>
            <p className="text-sm text-muted-foreground">
              Posts stored in this panel&apos;s database for this account.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {['all', 'draft', 'pending_confirmation', 'published', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange('status', status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={postTypeFilter}
                onChange={(e) => handleFilterChange('postType', e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="link">Link</option>
                <option value="image">Image</option>
              </select>
              <select
                value={targetTypeFilter}
                onChange={(e) => handleFilterChange('targetType', e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Targets</option>
                <option value="subreddit">Subreddit</option>
                <option value="user">User</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field)
                  setSortOrder(order)
                  setPage(1)
                }}
                className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="updated_at-desc">Recently Updated</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>
          </div>

          {/* Posts table */}
          {postsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Posts</h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all' && postTypeFilter === 'all'
                  ? 'This account has no posts yet'
                  : 'No posts match the current filters'}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Post</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {posts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total_count} post{pagination.total_count === 1 ? '' : 's'} · Page {pagination.page} of {pagination.total_pages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.has_prev}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.has_next}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
