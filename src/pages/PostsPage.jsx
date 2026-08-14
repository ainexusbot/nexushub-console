import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import PostsAPI from '../utils/postsApi'
import PostSubmitPanel from '../components/PostSubmitPanel'
import RedditPostsVerifier from '../components/RedditPostsVerifier'
import { api, formatRelativeTime } from '../utils/api'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Eye,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
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
    pending_confirmation: 'Pending Confirmation',
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

function PostTypeIcon({ postType }) {
  const icons = {
    text: MessageSquare,
    link: Copy,
    image: Eye,
  }
  const Icon = icons[postType] || MessageSquare
  return <Icon className="w-4 h-4" />
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

// Draft editor. Publishing lives in the Submit tab (with the live console), so
// this modal only creates and edits drafts in the database.
function PostDraftModal({ post, accounts, subreddits = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    account_id: post?.account_id || '',
    title: post?.title || '',
    content: post?.content || '',
    url: post?.url || '',
    image_url: post?.image_url || '',
    post_type: post?.post_type || 'text',
    target_type: post?.target_type || 'subreddit',
    target_value: post?.target_value || '',
  })
  const [subredditMode, setSubredditMode] = useState(
    post?.target_type === 'subreddit' &&
      post?.target_value &&
      !subreddits.some((s) => s.name === post.target_value)
      ? 'manual'
      : 'select',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const postsApi = new PostsAPI()

  const selectedAccount = accounts.find((acc) => String(acc.id) === String(formData.account_id))

  useEffect(() => {
    if (formData.target_type === 'user' && selectedAccount) {
      if (formData.target_value !== selectedAccount.reddit_username) {
        setFormData((prev) => ({ ...prev, target_value: selectedAccount.reddit_username }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.target_type, formData.account_id])

  const buildPayload = () => {
    const payload = {
      account_id: formData.account_id,
      title: formData.title,
      post_type: formData.post_type,
      target_type: formData.target_type,
      target_value: formData.target_value,
    }
    if (formData.post_type === 'text') payload.content = formData.content
    if (formData.post_type === 'link') payload.url = formData.url
    if (formData.post_type === 'image') payload.image_url = formData.image_url
    if (post?.id) payload.post_id = post.id
    return payload
  }

  const handleSaveDraft = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await postsApi.createDraft(buildPayload())
      if (!result.success) throw new Error(result.error)
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
            {post ? 'Edit Draft' : 'New Draft'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveDraft} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Account *</label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              required
              disabled={!!post}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  u/{acc.reddit_username} ({acc.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Post Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {['text', 'link', 'image'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, post_type: type })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.post_type === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <PostTypeIcon postType={type} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Post To *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, target_type: 'subreddit', target_value: '' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.target_type === 'subreddit'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                r/ Subreddit
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    target_type: 'user',
                    target_value: selectedAccount?.reddit_username || '',
                  })
                }
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.target_type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                u/ Profile
              </button>
            </div>
          </div>

          {formData.target_type === 'user' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Profile *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">u/</span>
                <input
                  type="text"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="username"
                />
              </div>
            </div>
          )}

          {formData.target_type === 'subreddit' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subreddit *</label>
              {subreddits.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubredditMode('select')
                      setFormData({ ...formData, target_value: '' })
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      subredditMode === 'select'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Choose from list
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubredditMode('manual')
                      setFormData({ ...formData, target_value: '' })
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      subredditMode === 'manual'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Enter manually
                  </button>
                </div>
              )}
              {subreddits.length > 0 && subredditMode === 'select' ? (
                <select
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a subreddit</option>
                  {subreddits.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      r/{sub.name}
                      {sub.title ? ` — ${sub.title}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
                  <input
                    type="text"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="subreddit"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Post title"
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/300</p>
          </div>

          {formData.post_type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Post content (optional)"
              />
            </div>
          )}

          {formData.post_type === 'link' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required={formData.post_type === 'link'}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://..."
              />
            </div>
          )}

          {formData.post_type === 'image' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Image URL *</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                required={formData.post_type === 'image'}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://..."
              />
            </div>
          )}

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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PostRow({ post, onEdit, onDelete, onPublish }) {
  const [expanded, setExpanded] = useState(false)
  const canPublish = post.status === 'draft' || post.status === 'pending_confirmation' || post.status === 'failed'

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
          <span className="text-sm text-muted-foreground">u/{post.reddit_username}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{formatRelativeTime(post.created_at)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {canPublish && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPublish(post)
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
                onEdit(post)
              }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Edit draft"
            >
              <Edit2 className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(post.id)
              }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Delete"
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
              {post.status === 'published' && post.post_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reddit Post:</p>
                  <a
                    href={post.post_url}
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

export default function PostsPage({ section = 'all' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [posts, setPosts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [subreddits, setSubreddits] = useState([])
  const [loading, setLoading] = useState(true)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editPost, setEditPost] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const postsApi = new PostsAPI()

  // Accounts + subreddits are needed by both tabs.
  useEffect(() => {
    fetchMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The posts list is only fetched on the "all" tab.
  useEffect(() => {
    if (section === 'all') fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, statusFilter, accountFilter, sortBy, sortOrder, page])

  const fetchMeta = async () => {
    try {
      const accountsRes = await api.get('/reddit-accounts')
      if (accountsRes.ok) setAccounts(await accountsRes.json())

      try {
        const subredditsRes = await api.get('/subreddits')
        if (subredditsRes.ok) {
          const subredditsData = await subredditsRes.json()
          setSubreddits(Array.isArray(subredditsData) ? subredditsData : subredditsData.subreddits || [])
        }
      } catch {
        // subreddits are optional for posting
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setMetaLoaded(true)
    }
  }

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const filters = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      }
      if (statusFilter !== 'all') filters.status = statusFilter
      if (accountFilter !== 'all') filters.account_id = accountFilter

      const postsRes = await postsApi.list(filters)
      if (!postsRes.success) throw new Error(postsRes.error)

      setPosts(postsRes.data.posts || postsRes.data || [])
      setPagination(postsRes.data.pagination || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleDelete = async (id) => {
    try {
      const result = await postsApi.delete(id)
      if (!result.success) throw new Error(result.error)
      setPosts(posts.filter((p) => p.id !== id))
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditPost(null)
  }

  const handleModalSuccess = () => {
    handleModalClose()
    fetchPosts()
  }

  const handleFilterChange = (type, value) => {
    if (type === 'status') setStatusFilter(value)
    if (type === 'account') setAccountFilter(value)
    setPage(1)
  }

  // Jump to the Submit tab with a post preloaded for publishing.
  const handlePublish = (post) => {
    navigate('/posts/submit', { state: { post } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reddit Posts</h1>
        <p className="text-muted-foreground mt-1">
          Browse saved posts or submit a new one and watch it publish live.
        </p>
      </div>

      {/* Section switch — two routes, so a refresh keeps you on the same tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionTab
          to="/posts"
          end
          icon={ListChecks}
          title="All posts"
          subtitle="Saved posts, drafts and history"
        />
        <SectionTab
          to="/posts/submit"
          icon={Send}
          title="Submit a post"
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
          <PostSubmitPanel
            accounts={accounts}
            subreddits={subreddits}
            initialPost={location.state?.post || null}
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setEditPost(null)
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Draft
            </button>
          </div>

          <RedditPostsVerifier accounts={accounts} />

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
                value={accountFilter}
                onChange={(e) => handleFilterChange('account', e.target.value)}
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
                <option value="status-asc">Status A-Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Posts</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'all'
                  ? 'Submit your first post to get started'
                  : `No posts with status "${statusFilter.replace(/_/g, ' ')}"`}
              </p>
              {statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/posts/submit')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Submit a post
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSortChange('title')}
                    >
                      <div className="flex items-center gap-1">
                        Post
                        {sortBy === 'title' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSortChange('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Account</th>
                    <th
                      className="text-left px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSortChange('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortBy === 'created_at' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {posts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      onEdit={(p) => {
                        setEditPost(p)
                        setShowModal(true)
                      }}
                      onDelete={setDeleteId}
                      onPublish={handlePublish}
                    />
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

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Post?</h3>
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

      {/* Draft Modal */}
      {showModal && (
        <PostDraftModal
          post={editPost}
          accounts={accounts}
          subreddits={subreddits}
          onClose={handleModalClose}
          onSave={handleModalSuccess}
        />
      )}
    </div>
  )
}
