import { useState, useEffect, useRef, useCallback } from 'react'
import { api, formatRelativeTime } from '../utils/api'
import { CommentRepliesAPI } from '../utils/postsApi'
import {
  Play,
  Square,
  Loader2,
  Terminal,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  CornerDownRight,
  Send,
  X,
  MessageSquare,
  ArrowBigUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Ban,
} from 'lucide-react'

const POLL_INTERVAL_MS = 1000
const REPLIES_LIMIT = 20

function LogLine({ line }) {
  const levelColor =
    line.level === 'error'
      ? 'text-destructive'
      : line.level === 'warn'
        ? 'text-warning'
        : 'text-foreground/80'
  const time = line.ts ? new Date(line.ts).toLocaleTimeString() : ''
  return (
    <div className="flex gap-3 px-3 py-1 font-mono text-xs leading-relaxed hover:bg-muted/40">
      <span className="text-muted-foreground/60 shrink-0 tabular-nums">{time}</span>
      <span className={`whitespace-pre-wrap break-words ${levelColor}`}>{line.message}</span>
    </div>
  )
}

// A single scanned comment with its reply affordance. Indentation comes from
// the backend `depth` field so the thread shape is preserved.
function ScannedComment({ comment, onReply, isReplying, replied }) {
  const depth = Math.min(Number(comment.depth) || 0, 8)
  return (
    <div
      className="rounded-lg border border-border bg-card p-3"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-foreground">u/{comment.author || 'unknown'}</span>
            {comment.score !== undefined && comment.score !== null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowBigUp className="w-3 h-3" />
                {comment.score}
              </span>
            )}
            <code className="text-[11px] font-mono text-muted-foreground/70">{comment.id}</code>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.body}</p>
        </div>
        <button
          onClick={() => onReply(comment)}
          disabled={isReplying}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            replied
              ? 'bg-success/10 text-success'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {replied ? <CheckCircle className="w-4 h-4" /> : <CornerDownRight className="w-4 h-4" />}
          {replied ? 'Replied' : 'Reply'}
        </button>
      </div>
    </div>
  )
}

// Inline reply composer shown in a modal for the selected comment.
function ReplyModal({ comment, accountId, postUrl, onClose, onSuccess }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const repliesApi = useRef(new CommentRepliesAPI()).current

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNeedsLogin(false)

    const res = await repliesApi.reply({
      account_id: accountId,
      post_url: postUrl,
      parent_comment_id: comment.id,
      content,
    })
    setLoading(false)

    if (!res.success) {
      if (res.error && /not logged in|needs_login/i.test(res.error)) setNeedsLogin(true)
      setError(res.error)
      return
    }
    onSuccess(comment, res.data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Reply to comment</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-destructive">{error}</p>
                {needsLogin && (
                  <p className="text-xs text-destructive/80">
                    This account needs to be reconnected before it can reply.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">u/{comment.author || 'unknown'}</span>
              <code className="text-[11px] font-mono text-muted-foreground/70">{comment.id}</code>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words line-clamp-4">
              {comment.body}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Your reply *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Write your reply..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Publishing...' : 'Publish Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReplyStatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-500/10 text-gray-500',
    pending_confirmation: 'bg-yellow-500/10 text-yellow-500',
    published: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
    deleted: 'bg-gray-500/10 text-muted-foreground',
  }
  const labels = {
    draft: 'Draft',
    pending_confirmation: 'Pending',
    published: 'Published',
    failed: 'Failed',
    deleted: 'Deleted',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}

export default function CommentRepliesPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [maxComments, setMaxComments] = useState(200)

  // Scan job state
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | success | failed
  const [logs, setLogs] = useState([])
  const [scanned, setScanned] = useState([])
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [canForce, setCanForce] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stoppingAll, setStoppingAll] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Reply state
  const [replyTarget, setReplyTarget] = useState(null)
  const [repliedIds, setRepliedIds] = useState(() => new Set())

  // Replies history
  const [replies, setReplies] = useState([])
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [repliesPage, setRepliesPage] = useState(1)
  const [repliesTotalPages, setRepliesTotalPages] = useState(1)
  const [repliesTotal, setRepliesTotal] = useState(0)

  const sinceRef = useRef(0)
  const pollRef = useRef(null)
  const consoleRef = useRef(null)
  const repliesApi = useRef(new CommentRepliesAPI()).current

  const running = status === 'running'

  useEffect(() => {
    api
      .get('/reddit-accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const fetchReplies = useCallback(
    async (page = 1) => {
      setRepliesLoading(true)
      const filters = { page, limit: REPLIES_LIMIT, sort_order: 'desc' }
      if (accountId) filters.account_id = accountId
      const res = await repliesApi.list(filters)
      setRepliesLoading(false)
      if (res.success) {
        setReplies(res.data.replies || [])
        setRepliesTotalPages(res.data.total_pages || 1)
        setRepliesTotal(res.data.total || 0)
        setRepliesPage(res.data.page || page)
      }
    },
    [accountId, repliesApi],
  )

  useEffect(() => {
    fetchReplies(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const poll = useCallback(
    async (id) => {
      const res = await repliesApi.scanStatus(id, sinceRef.current)
      if (!res.success) {
        if (res.status === 404) {
          stopPolling()
          setStatus((s) => (s === 'running' ? 'failed' : s))
          setError((e) => e || 'Scan job expired or was not found.')
        }
        return
      }
      const data = res.data
      if (Array.isArray(data.logs) && data.logs.length) {
        setLogs((prev) => [...prev, ...data.logs])
      }
      if (typeof data.next_since === 'number') sinceRef.current = data.next_since

      if (data.done) {
        stopPolling()
        setStatus(data.status || 'success')
        if (data.result) {
          setScanResult(data.result)
          setScanned(Array.isArray(data.result.comments) ? data.result.comments : [])
        }
        if (data.error) setError(data.error.detail || 'Comment scan failed.')
      }
    },
    [repliesApi, stopPolling],
  )

  const handleScan = async (force = false) => {
    if (!accountId) {
      setError('Select an account first.')
      return
    }
    if (!postUrl.trim()) {
      setError('Paste a post URL first.')
      return
    }
    setStarting(true)
    setError(null)
    setCanForce(false)
    setScanResult(null)
    setScanned([])
    setRepliedIds(new Set())
    setLogs([])
    sinceRef.current = 0

    const res = await repliesApi.startScan({
      account_id: accountId,
      post_url: postUrl.trim(),
      max_comments: maxComments,
      force,
    })
    setStarting(false)

    if (!res.success) {
      setError(res.error)
      // A 409 means a previous scan is still registered (possibly wedged).
      // Offer a one-click force stop & retry.
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }

    const id = res.data.job_id
    setJobId(id)
    setStatus('running')
    setLogs([
      {
        seq: -1,
        level: 'info',
        message: `[v0] Scan: ${force ? 'force-' : ''}started for account ${accountId} (job ${id})`,
        ts: new Date().toISOString(),
      },
    ])

    stopPolling()
    poll(id)
    pollRef.current = setInterval(() => poll(id), POLL_INTERVAL_MS)
  }

  // Force-stop the account's current scan, then immediately retry. Used to
  // recover from a stuck "already scanning" state.
  const handleForceStopAndRetry = async () => {
    setStopping(true)
    await repliesApi.stopScan(accountId, true)
    setStopping(false)
    setCanForce(false)
    handleScan(true)
  }

  const handleStop = async (force = false) => {
    setStopping(true)
    const res = await repliesApi.stopScan(accountId, force)
    setStopping(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    setLogs((prev) => [
      ...prev,
      {
        seq: -2,
        level: 'warn',
        message: force
          ? '[v0] Scan: force stop — closing browser and clearing session…'
          : '[v0] Scan: stop requested — finishing current step…',
        ts: new Date().toISOString(),
      },
    ])
  }

  // Super stop / panic button: force-stop every running scan, anywhere.
  const handleStopAll = async () => {
    setStoppingAll(true)
    const res = await repliesApi.stopAllScans(true)
    setStoppingAll(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    stopPolling()
    setStatus((s) => (s === 'running' ? 'failed' : s))
    const stopped = res.data && (res.data.stopped ?? res.data.count)
    setLogs((prev) => [
      ...prev,
      {
        seq: -3,
        level: 'warn',
        message: `[v0] Super stop: halted all active scans${
          stopped !== undefined ? ` (${stopped})` : ''
        }.`,
        ts: new Date().toISOString(),
      },
    ])
  }

  const handleDeleteReply = async (reply) => {
    setDeletingId(reply.id)
    const res = await repliesApi.deleteReply(reply.id)
    setDeletingId(null)
    // 404 means it's already gone — drop it from the UI either way.
    if (res.success || res.status === 404) {
      setReplies((prev) => prev.filter((r) => r.id !== reply.id))
      setRepliesTotal((t) => Math.max(0, t - 1))
      return
    }
    setError(res.error)
  }

  const handleReplySuccess = (comment) => {
    setRepliedIds((prev) => new Set(prev).add(comment.id))
    setReplyTarget(null)
    fetchReplies(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comment Replies</h1>
        <p className="text-muted-foreground mt-1">
          Scan an existing post for its comments using a human-like crawl, then reply to any of them.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            {canForce && (
              <button
                onClick={handleForceStopAndRetry}
                disabled={stopping || starting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {stopping || starting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Force stop &amp; retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan settings */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Scan settings</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Account *</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
            <label className="block text-sm font-medium text-foreground mb-1">Post URL *</label>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              disabled={running}
              placeholder="https://www.reddit.com/r/.../comments/..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The scan opens this post and crawls its comment thread.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Max comments</label>
            <input
              type="number"
              value={maxComments}
              min={1}
              step={10}
              onChange={(e) => setMaxComments(Number(e.target.value))}
              disabled={running}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">Stop after collecting this many comments.</p>
          </div>

          <div className="flex gap-3 pt-1">
            {!running ? (
              <button
                onClick={() => handleScan(false)}
                disabled={starting || !accountId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {starting ? 'Starting…' : 'Scan comments'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleStop(false)}
                  disabled={stopping}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  {stopping ? 'Stopping…' : 'Stop scan'}
                </button>
                <button
                  onClick={() => handleStop(true)}
                  disabled={stopping}
                  title="Force-close the browser and clear this account's session"
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  Force
                </button>
              </>
            )}
          </div>

          <div className="pt-1 border-t border-border">
            <button
              onClick={handleStopAll}
              disabled={stoppingAll}
              title="Force-stop every running scan, even ones running under the hood"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 mt-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {stoppingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              {stoppingAll ? 'Stopping all…' : 'Super stop (stop all scans)'}
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">
              Panic button. Halts every active scan, including orphaned sessions the UI lost track of.
            </p>
          </div>
        </div>

        {/* Live console */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-foreground" />
              <h2 className="text-base font-semibold text-foreground">Live console</h2>
              {running && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Scanning
                </span>
              )}
              {status === 'success' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                  <CheckCircle className="w-3 h-3" />
                  Done
                </span>
              )}
              {status === 'failed' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
            </div>
            <button
              onClick={() => setLogs([])}
              disabled={running || logs.length === 0}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30"
              title="Clear console"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {scanResult && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{scanResult.count ?? scanned.length}</span>{' '}
              comments{scanResult.reason ? ` · ${scanResult.reason}` : ''}
            </div>
          )}

          <div
            ref={consoleRef}
            className="flex-1 min-h-[280px] max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-background"
          >
            {logs.length === 0 ? (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6">
                <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Logs will stream here once a scan is running.
                </p>
              </div>
            ) : (
              <div className="py-2">
                {logs.map((line, i) => (
                  <LogLine key={`${line.seq}-${i}`} line={line} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scanned comments */}
      {scanned.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              Scanned comments ({scanned.length})
            </h2>
          </div>
          <div className="space-y-2">
            {scanned.map((comment, i) => (
              <ScannedComment
                key={`${comment.id}-${i}`}
                comment={comment}
                onReply={setReplyTarget}
                isReplying={!!replyTarget}
                replied={repliedIds.has(comment.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Replies history */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Reply history</h2>
          <button
            onClick={() => fetchReplies(repliesPage)}
            disabled={repliesLoading}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${repliesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {repliesLoading && replies.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : replies.length === 0 ? (
          <div className="p-12 text-center">
            <CornerDownRight className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No replies created yet.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Reply</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Account</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {replies.map((reply) => (
                  <tr key={reply.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-md">{reply.content}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {reply.subreddit_name ? `r/${reply.subreddit_name} · ` : ''}
                          <span className="font-mono">{reply.parent_comment_id}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ReplyStatusBadge status={reply.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">u/{reply.reddit_username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{formatRelativeTime(reply.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteReply(reply)}
                        disabled={deletingId === reply.id}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                        title="Delete from history"
                      >
                        {deletingId === reply.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {repliesTotal} repl{repliesTotal === 1 ? 'y' : 'ies'} · Page {repliesPage} of {repliesTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchReplies(repliesPage - 1)}
                  disabled={repliesPage <= 1 || repliesLoading}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => fetchReplies(repliesPage + 1)}
                  disabled={repliesPage >= repliesTotalPages || repliesLoading}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {replyTarget && (
        <ReplyModal
          comment={replyTarget}
          accountId={accountId}
          postUrl={postUrl.trim()}
          onClose={() => setReplyTarget(null)}
          onSuccess={handleReplySuccess}
        />
      )}
    </div>
  )
}
