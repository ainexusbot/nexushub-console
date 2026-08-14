import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { CommentsAPI } from '../utils/postsApi'
import CommentSubmitPanel from '../components/CommentSubmitPanel'
import RedditCommentsVerifier from '../components/RedditCommentsVerifier'
import { api, formatRelativeTime } from '../utils/api'
import {
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  ListChecks,
} from 'lucide-react'

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-500/10 text-gray-500',
    pending_confirmation: 'bg-yellow-500/10 text-yellow-500',
    published: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
    deleted: 'bg-gray-500/10 text-muted-foreground',
  }
  const icons = {
    draft: Clock,
    pending_confirmation: Clock,
    published: CheckCircle,
    failed: AlertCircle,
    deleted: Trash2,
  }
  const labels = {
    draft: 'Draft',
    pending_confirmation: 'Pending Confirmation',
    published: 'Published',
    failed: 'Failed',
    deleted: 'Deleted',
  }
  const Icon = icons[status] || Clock
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      <Icon className="w-3 h-3" />
      {labels[status] || status}
    </span>
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

function CommentRow({ comment, onDelete, onPublish }) {
  const [expanded, setExpanded] = useState(false)
  // Deleting only affects our own database, not the live Reddit comment.
  const canDelete = comment.status !== 'deleted'
  const canPublish =
    comment.status === 'draft' ||
    comment.status === 'pending_confirmation' ||
    comment.status === 'failed'

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CornerDownRight className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate max-w-xs">{comment.content}</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {comment.subreddit_name ? `r/${comment.subreddit_name} · ` : ''}
                {comment.post_url}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={comment.status} />
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">u/{comment.reddit_username}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {canPublish && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPublish(comment)
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                title="Publish in Submit tab"
              >
                <Send className="w-4 h-4 text-primary" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(comment.id)
              }}
              disabled={!canDelete}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={canDelete ? 'Delete from database' : 'Already deleted'}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className={`p-2 hover:bg-secondary rounded-lg transition-colors ${expanded ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan="5" className="px-4 py-3">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Comment:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Post URL:</p>
                <a
                  href={comment.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {comment.post_url}
                </a>
              </div>
              {comment.parent_comment_id && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parent comment:</p>
                  <code className="text-sm font-mono text-muted-foreground">{comment.parent_comment_id}</code>
                </div>
              )}
              {comment.status === 'published' && (comment.reddit_comment_url || comment.comment_url) ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Published comment:</p>
                  <a
                    href={comment.reddit_comment_url || comment.comment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View on Reddit
                  </a>
                </div>
              ) : comment.status === 'published' ? (
                <p className="text-xs text-muted-foreground">Published — comment URL not available.</p>
              ) : null}
              {comment.status === 'failed' && comment.error_message && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Error:</p>
                  <p className="text-sm text-destructive">{comment.error_message}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function CommentsPage({ section = 'all' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [comments, setComments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [subreddits, setSubreddits] = useState([])
  const [loading, setLoading] = useState(true)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [subredditFilter, setSubredditFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const commentsApi = new CommentsAPI()

  useEffect(() => {
    fetchMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (section === 'all') fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, statusFilter, accountFilter, subredditFilter, sortBy, sortOrder, page])

  const fetchMeta = async () => {
    try {
      const [accountsRes, subredditsRes] = await Promise.all([
        api.get('/reddit-accounts'),
        api.get('/subreddits'),
      ])
      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (subredditsRes.ok) {
        const data = await subredditsRes.json()
        setSubreddits(Array.isArray(data) ? data : data.subreddits || [])
      }
    } catch {
      // meta is non-critical
    } finally {
      setMetaLoaded(true)
    }
  }

  const fetchComments = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = { page, limit, sort_by: sortBy, sort_order: sortOrder }
      if (statusFilter !== 'all') filters.status = statusFilter
      if (accountFilter !== 'all') filters.account_id = accountFilter
      if (subredditFilter !== 'all') filters.subreddit_id = subredditFilter

      const result = await commentsApi.list(filters)
      if (!result.success) throw new Error(result.error)

      setComments(result.data.comments || result.data || [])
      setPagination(result.data.pagination || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const result = await commentsApi.delete(id)
      if (!result.success) throw new Error(result.error)
      setComments(comments.filter((c) => c.id !== id))
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleFilterChange = (setter, value) => {
    setter(value)
    setPage(1)
  }

  // Jump to the Submit tab with a comment preloaded for publishing.
  const handlePublish = (comment) => {
    navigate('/comments/submit', { state: { comment } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comments</h1>
        <p className="text-muted-foreground mt-1">
          Browse saved comments or publish a new reply and watch it post live.
        </p>
      </div>

      {/* Section switch — two routes, so a refresh keeps you on the same tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionTab
          to="/comments"
          end
          icon={ListChecks}
          title="All comments"
          subtitle="Saved comments and history"
        />
        <SectionTab
          to="/comments/submit"
          icon={Send}
          title="Submit a comment"
          subtitle="Publish with a live console"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {section === 'submit' ? (
        !metaLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <CommentSubmitPanel
            accounts={accounts}
            initialComment={location.state?.comment || null}
          />
        )
      ) : (
        <>
          <RedditCommentsVerifier accounts={accounts} />

          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              {['all', 'draft', 'pending_confirmation', 'published', 'failed', 'deleted'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange(setStatusFilter, status)}
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
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={accountFilter}
                onChange={(e) => handleFilterChange(setAccountFilter, e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    u/{acc.reddit_username}
                  </option>
                ))}
              </select>
              <select
                value={subredditFilter}
                onChange={(e) => handleFilterChange(setSubredditFilter, e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Subreddits</option>
                {subreddits.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    r/{sub.name}
                  </option>
                ))}
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
                <option value="status-asc">Status A-Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Comments</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'all'
                  ? 'Publish your first comment to get started'
                  : `No comments with status "${statusFilter.replace(/_/g, ' ')}"`}
              </p>
              {statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/comments/submit')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Submit a comment
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Comment</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Account</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      onDelete={setDeleteId}
                      onPublish={handlePublish}
                    />
                  ))}
                </tbody>
              </table>

              {pagination && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total_count} comment{pagination.total_count === 1 ? '' : 's'} · Page {pagination.page} of {pagination.total_pages}
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

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Comment?</h3>
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
