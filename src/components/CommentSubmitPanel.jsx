import { useState, useEffect, useRef, useCallback } from 'react'
import { CommentsAPI } from '../utils/postsApi'
import LiveConsole from './LiveConsole'
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'

const POLL_INTERVAL_MS = 1000

// Publish a comment and watch the backend automation live. Publishing now runs
// as a background job: POST /comments returns { job_id, comment_id }, then we
// poll /comments/status/:jobId and stream every log line into the console.
export default function CommentSubmitPanel({ accounts = [], initialComment = null }) {
  const [formData, setFormData] = useState({
    account_id: initialComment?.account_id || '',
    post_url: initialComment?.post_url || '',
    content: initialComment?.content || '',
    parent_comment_id: initialComment?.parent_comment_id || '',
  })

  const [starting, setStarting] = useState(false)
  const [status, setStatus] = useState('idle') // idle | running | success | failed
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [result, setResult] = useState(null)

  const sinceRef = useRef(0)
  const pollRef = useRef(null)
  const commentsApi = useRef(new CommentsAPI()).current

  const running = status === 'running'

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const appendLog = (level, message) =>
    setLogs((prev) => [
      ...prev,
      { seq: -prev.length - 1, level, message, ts: new Date().toISOString() },
    ])

  const poll = useCallback(
    async (jobId) => {
      const res = await commentsApi.jobStatus(jobId, sinceRef.current)
      if (!res.success) {
        if (res.status === 404) {
          stopPolling()
          setStatus((s) => (s === 'running' ? 'failed' : s))
          setError((e) => e || 'Job expired or was not found.')
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
        if (data.result) setResult(data.result)
        if (data.error) {
          const detail = data.error.detail || data.error.message || 'Job failed.'
          setError(detail)
          if (/not logged in|needs_login/i.test(detail)) setNeedsLogin(true)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commentsApi, stopPolling],
  )

  const beginPolling = (jobId) => {
    setStatus('running')
    sinceRef.current = 0
    stopPolling()
    poll(jobId)
    pollRef.current = setInterval(() => poll(jobId), POLL_INTERVAL_MS)
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    if (!formData.account_id || !formData.post_url.trim() || !formData.content.trim()) {
      setError('Account, post URL and comment text are required.')
      return
    }
    setStarting(true)
    setError(null)
    setNeedsLogin(false)
    setResult(null)
    setLogs([])
    sinceRef.current = 0

    try {
      const payload = {
        account_id: formData.account_id,
        post_url: formData.post_url.trim(),
        content: formData.content,
      }
      if (formData.parent_comment_id) payload.parent_comment_id = formData.parent_comment_id.trim()

      appendLog('info', '[v0] Submitting comment…')
      const res = await commentsApi.publish(payload)
      if (!res.success) {
        if (res.error && /not logged in/i.test(res.error)) setNeedsLogin(true)
        throw new Error(res.error)
      }

      const jobId = res.data?.job_id
      if (!jobId) {
        // Backend returned the final result directly (older behavior).
        setStarting(false)
        setStatus(res.data?.status === 'failed' ? 'failed' : 'success')
        setResult(res.data || null)
        return
      }

      if (res.data?.comment_id) {
        appendLog('info', `[v0] Comment record created (id ${res.data.comment_id}).`)
      }
      appendLog('info', `[v0] Publishing started (job ${jobId}). Streaming logs…`)
      setStarting(false)
      beginPolling(jobId)
    } catch (err) {
      setStarting(false)
      setStatus('failed')
      setError(err.message)
    }
  }

  const resetForm = () => {
    stopPolling()
    setStatus('idle')
    setLogs([])
    setError(null)
    setNeedsLogin(false)
    setResult(null)
    sinceRef.current = 0
    setFormData({ account_id: '', post_url: '', content: '', parent_comment_id: '' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-destructive">{error}</p>
              {needsLogin && (
                <p className="text-xs text-destructive/80">
                  This account needs to be reconnected before it can comment.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handlePublish} className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Account *</label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              required
              disabled={running}
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
            <label className="block text-sm font-medium text-foreground mb-1">Post URL *</label>
            <input
              type="url"
              value={formData.post_url}
              onChange={(e) => setFormData({ ...formData, post_url: e.target.value })}
              required
              disabled={running}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="https://reddit.com/r/.../comments/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link to the post or a comment permalink you want to reply to. The subreddit is
              detected automatically.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Parent comment ID</label>
            <input
              type="text"
              value={formData.parent_comment_id}
              onChange={(e) => setFormData({ ...formData, parent_comment_id: e.target.value })}
              disabled={running}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 font-mono text-sm"
              placeholder="Optional — e.g. t1_xxxx to reply to a specific comment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Comment *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              required
              disabled={running}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
              placeholder="Write your reply..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetForm}
              disabled={running}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={starting || running}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {starting || running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {running ? 'Publishing…' : 'Starting…'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish comment
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Live output */}
      <div className="space-y-6">
        <LiveConsole
          logs={logs}
          status={status}
          running={running}
          runningLabel="Publishing"
          onClear={() => setLogs([])}
          emptyHint="Fill in the comment and press Publish — the backend will stream every step here."
        />

        {status === 'success' && result && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              {result.approved === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
                  <Clock className="h-4 w-4" />
                  On moderation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                  <CheckCircle className="h-4 w-4" />
                  Published
                </span>
              )}
              {result.status && (
                <span className="text-xs text-muted-foreground capitalize">{result.status}</span>
              )}
            </div>
            {result.detail && <p className="text-sm text-muted-foreground text-pretty">{result.detail}</p>}
            {(result.comment_url || result.reddit_comment_url) && (
              <a
                href={result.comment_url || result.reddit_comment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                View on Reddit
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
