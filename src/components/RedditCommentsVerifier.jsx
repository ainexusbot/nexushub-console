import { useState } from 'react'
import PostsAPI from '../utils/postsApi'
import { formatDate } from '../utils/api'
import {
  MessagesSquare,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Inbox,
  ArrowUpCircle,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
} from 'lucide-react'

export default function RedditCommentsVerifier({ accounts = [], account = null }) {
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState(account ? account.id : '')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [comments, setComments] = useState([])

  // Delete flow state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Edit flow state
  const [editTarget, setEditTarget] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState(null)

  const postsApi = new PostsAPI()

  const handleVerify = async () => {
    if (!accountId) {
      setError('Select an account to fetch comments.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setComments([])

    const res = await postsApi.getUserComments(accountId, username.trim() || undefined)

    if (!res.success) {
      setError(res.error)
      setLoading(false)
      return
    }

    setResult(res.data)
    setComments(res.data?.comments || [])
    setLoading(false)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const commentUrl = deleteTarget.url || deleteTarget.permalink
    if (!commentUrl) {
      setDeleteError('This comment has no URL to delete.')
      return
    }
    setDeleting(true)
    setDeleteError(null)

    const res = await postsApi.deleteRedditComment(accountId, commentUrl, deleteTarget.id)

    if (!res.success) {
      setDeleteError(res.error)
      setDeleting(false)
      return
    }

    setComments((prev) => prev.filter((c) => (c.url || c.permalink) !== commentUrl))
    setDeleting(false)
    setDeleteTarget(null)
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  const openEditModal = (comment) => {
    setEditTarget(comment)
    setEditContent(comment.body || comment.content || '')
    setEditError(null)
  }

  const closeEditModal = () => {
    if (editing) return
    setEditTarget(null)
    setEditContent('')
    setEditError(null)
  }

  const handleConfirmEdit = async () => {
    if (!editTarget) return
    const commentUrl = editTarget.url || editTarget.permalink
    if (!commentUrl) {
      setEditError('This comment has no URL to edit.')
      return
    }
    if (!editContent.trim()) {
      setEditError('Comment text cannot be empty.')
      return
    }
    setEditing(true)
    setEditError(null)

    const res = await postsApi.editRedditComment(
      accountId,
      commentUrl,
      editContent,
      editTarget.id,
    )

    if (!res.success) {
      setEditError(res.error)
      setEditing(false)
      return
    }

    setComments((prev) =>
      prev.map((c) =>
        (c.url || c.permalink) === commentUrl ? { ...c, body: editContent } : c,
      ),
    )
    setEditing(false)
    setEditTarget(null)
    setEditContent('')
  }

  const renderResult = () => {
    if (!result) return null

    const { count = 0, empty_state, profile_url, username: resolvedUser } = result

    // count === 0 && empty_state === false -> parsing failed
    if (count === 0 && empty_state === false) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Could not read the profile</p>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t parse the Reddit comments feed (unusual layout or a redirect). Please try again.
            </p>
          </div>
        </div>
      )
    }

    // count === 0 && empty_state === true -> genuinely empty
    if (count === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-8 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No comments on this profile</p>
          <p className="text-sm text-muted-foreground">
            Nothing was found on Reddit — this account hasn&apos;t commented yet.
          </p>
        </div>
      )
    }

    // count > 0 -> real comments exist
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              {comments.length} live comment{comments.length === 1 ? '' : 's'} on Reddit
            </p>
          </div>
          {profile_url && (
            <a
              href={profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              u/{resolvedUser}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-8 text-center">
            <CheckCircle className="mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-foreground">All listed comments were deleted</p>
            <p className="text-sm text-muted-foreground">
              Refresh from Reddit to re-check the live profile feed.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment, idx) => (
              <li
                key={comment.id || comment.url || idx}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap text-pretty">
                    {comment.body}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {comment.target && <span>{comment.target}</span>}
                    {comment.created_at && <span>{formatDate(comment.created_at)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpCircle className="h-3.5 w-3.5" />
                      {comment.score ?? '0'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={comment.url || comment.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Eye className="h-4 w-4" />
                    View on Reddit
                  </a>

                  <button
                    type="button"
                    onClick={() => openEditModal(comment)}
                    title="Edit the text of this comment"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(comment)
                      setDeleteError(null)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete comment
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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
            <MessagesSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Manage comments on Reddit</p>
            <p className="text-sm text-muted-foreground">
              Fetch an account&apos;s live comments straight from Reddit, then edit or delete them.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {!account && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">Account</label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value)
                    setUsername('')
                    setResult(null)
                    setComments([])
                    setError(null)
                  }}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      u/{acc.reddit_username} ({acc.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Username <span className="text-muted-foreground">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">u/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="leave empty to use the account"
                  className="w-full rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || !accountId}
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
                  Refresh from Reddit
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            This launches a real browser session on the backend, so it can take a few seconds. Run it
            only when you need to manage live comments.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {renderResult()}
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">Delete this comment?</h3>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                This permanently removes the comment from Reddit. This action can&apos;t be undone.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="line-clamp-3 text-sm font-medium text-foreground">
                  {deleteTarget.body}
                </p>
                {(deleteTarget.url || deleteTarget.permalink) && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {deleteTarget.url || deleteTarget.permalink}
                  </p>
                )}
              </div>

              {deleteError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{deleteError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete comment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pencil className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Edit comment</h3>
                  <p className="text-sm text-muted-foreground">
                    Update the text of this comment on Reddit.
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                disabled={editing}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {(editTarget.url || editTarget.permalink) && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="truncate text-xs text-muted-foreground">
                    {editTarget.url || editTarget.permalink}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Comment text
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  disabled={editing}
                  placeholder="Enter the new text for this comment"
                  className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {editError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{editError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button
                onClick={closeEditModal}
                disabled={editing}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEdit}
                disabled={editing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {editing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
