import { useState, useEffect, useRef, useCallback } from 'react'
import PostsAPI from '../utils/postsApi'
import LiveConsole from './LiveConsole'
import RedditPostsVerifier from './RedditPostsVerifier'
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Copy,
  Eye,
  ExternalLink,
} from 'lucide-react'

const POLL_INTERVAL_MS = 1000

function PostTypeIcon({ postType }) {
  const icons = { text: MessageSquare, link: Copy, image: Eye }
  const Icon = icons[postType] || MessageSquare
  return <Icon className="w-4 h-4" />
}

// Submit a post and watch the backend automation live. Publishing now runs as a
// background job: create draft -> submit (gets a confirmation token) -> confirm
// (returns a job_id) -> poll /posts/status/:jobId, streaming every log line the
// backend emits into the console.
export default function PostSubmitPanel({ accounts = [], subreddits = [], initialPost = null }) {
  const [formData, setFormData] = useState({
    account_id: initialPost?.account_id || '',
    title: initialPost?.title || '',
    content: initialPost?.content || '',
    url: initialPost?.url || '',
    image_url: initialPost?.image_url || '',
    post_type: initialPost?.post_type || 'text',
    target_type: initialPost?.target_type || 'subreddit',
    target_value: initialPost?.target_value || '',
  })
  const [subredditMode, setSubredditMode] = useState(
    initialPost?.target_type === 'subreddit' &&
      initialPost?.target_value &&
      !subreddits.some((s) => s.name === initialPost.target_value)
      ? 'manual'
      : 'select',
  )
  // Existing draft id we can reuse instead of creating a new one each publish.
  const [postId, setPostId] = useState(initialPost?.id || null)

  const [starting, setStarting] = useState(false)
  const [status, setStatus] = useState('idle') // idle | running | success | failed
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [result, setResult] = useState(null)
  // Bumped every time a publish finishes so the embedded verifier remounts and
  // re-fetches the live Reddit feed for the just-created post.
  const [publishSeq, setPublishSeq] = useState(0)

  const sinceRef = useRef(0)
  const pollRef = useRef(null)
  const postsApi = useRef(new PostsAPI()).current

  const running = status === 'running'
  const selectedAccount = accounts.find((acc) => String(acc.id) === String(formData.account_id))

  // When posting to a user profile, auto-fill the target with the account's username.
  useEffect(() => {
    if (formData.target_type === 'user' && selectedAccount) {
      if (formData.target_value !== selectedAccount.reddit_username) {
        setFormData((prev) => ({ ...prev, target_value: selectedAccount.reddit_username }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.target_type, formData.account_id])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

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
    if (postId) payload.post_id = postId
    return payload
  }

  const appendLog = (level, message) =>
    setLogs((prev) => [
      ...prev,
      { seq: -prev.length - 1, level, message, ts: new Date().toISOString() },
    ])

  const poll = useCallback(
    async (jobId) => {
      const res = await postsApi.jobStatus(jobId, sinceRef.current)
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
        const finalStatus = data.status || 'success'
        setStatus(finalStatus)
        if (data.result) setResult(data.result)
        if (data.error) {
          const detail = data.error.detail || data.error.message || 'Job failed.'
          setError(detail)
          if (/not logged in|needs_login/i.test(detail)) setNeedsLogin(true)
        }
        // Reveal the live verifier for this account once publishing wraps up.
        if (finalStatus !== 'failed') setPublishSeq((n) => n + 1)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [postsApi, stopPolling],
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
    if (!formData.account_id || !formData.title.trim() || !formData.target_value.trim()) {
      setError('Account, title and target are required.')
      return
    }
    setStarting(true)
    setError(null)
    setNeedsLogin(false)
    setResult(null)
    setLogs([])
    sinceRef.current = 0

    try {
      // 1. Ensure a saved draft exists (reuse the id on subsequent attempts).
      const draftRes = await postsApi.createDraft(buildPayload())
      if (!draftRes.success) throw new Error(draftRes.error)
      const id = draftRes.data?.id || draftRes.data?.post_id || postId
      if (!id) throw new Error('Could not determine the post id after saving the draft.')
      setPostId(id)
      appendLog('info', `[v0] Draft saved (post ${id}). Requesting submission…`)

      // 2. Submit -> confirmation token (synchronous, no automation yet).
      const submitRes = await postsApi.submit(id)
      if (!submitRes.success) throw new Error(submitRes.error)
      const token = submitRes.data?.confirmation_token

      // 3. Confirm -> kicks off the background job and returns a job_id.
      if (!token) {
        // No token: submit already returned a job or a final verdict.
        const jobId = submitRes.data?.job_id
        if (jobId) {
          appendLog('info', `[v0] Submission started (job ${jobId}). Streaming logs…`)
          setStarting(false)
          beginPolling(jobId)
          return
        }
        // Fall back to whatever was returned.
        setStarting(false)
        setStatus('success')
        setResult(submitRes.data || null)
        return
      }

      appendLog('info', '[v0] Confirmation token received. Confirming…')
      const confirmRes = await postsApi.confirm(id, token)
      if (!confirmRes.success) throw new Error(confirmRes.error)

      const jobId = confirmRes.data?.job_id
      if (!jobId) {
        // Backend returned the final result directly (older behavior).
        setStarting(false)
        setStatus(confirmRes.data?.status === 'failed' ? 'failed' : 'success')
        setResult(confirmRes.data || null)
        return
      }

      appendLog('info', `[v0] Publishing started (job ${jobId}). Streaming logs…`)
      setStarting(false)
      beginPolling(jobId)
    } catch (err) {
      setStarting(false)
      setStatus('failed')
      setError(err.message)
      if (err.message && /not logged in/i.test(err.message)) setNeedsLogin(true)
    }
  }

  const resetForm = () => {
    stopPolling()
    setStatus('idle')
    setLogs([])
    setError(null)
    setNeedsLogin(false)
    setResult(null)
    setPostId(null)
    sinceRef.current = 0
    setFormData({
      account_id: '',
      title: '',
      content: '',
      url: '',
      image_url: '',
      post_type: 'text',
      target_type: 'subreddit',
      target_value: '',
    })
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
                  This account&apos;s session expired. Reconnect it before publishing.
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
            <label className="block text-sm font-medium text-foreground mb-1">Post Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {['text', 'link', 'image'].map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={running}
                  onClick={() => setFormData({ ...formData, post_type: type })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
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
                disabled={running}
                onClick={() => setFormData({ ...formData, target_type: 'subreddit', target_value: '' })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  formData.target_type === 'subreddit'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                r/ Subreddit
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() =>
                  setFormData({
                    ...formData,
                    target_type: 'user',
                    target_value: selectedAccount?.reddit_username || '',
                  })
                }
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
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
                  disabled={running}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                    disabled={running}
                    onClick={() => {
                      setSubredditMode('select')
                      setFormData({ ...formData, target_value: '' })
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      subredditMode === 'select'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Choose from list
                  </button>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => {
                      setSubredditMode('manual')
                      setFormData({ ...formData, target_value: '' })
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
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
                  disabled={running}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                    disabled={running}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
              disabled={running}
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                rows={6}
                disabled={running}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
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
                disabled={running}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                disabled={running}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="https://..."
              />
            </div>
          )}

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
                  Publish post
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
          emptyHint="Fill in the post and press Publish — the backend will stream every step here."
        />

        {status === 'success' && result && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              {result.approved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
                  <Clock className="h-4 w-4" />
                  On moderation
                </span>
              )}
              {result.status && (
                <span className="text-xs text-muted-foreground capitalize">{result.status}</span>
              )}
            </div>
            {result.detail && <p className="text-sm text-muted-foreground text-pretty">{result.detail}</p>}
            {result.target && (
              <p className="text-sm text-muted-foreground">
                Target: <span className="text-foreground">{result.target}</span>
              </p>
            )}
            {result.post_url && (
              <a
                href={result.post_url}
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

        {/* After publishing, surface the live Reddit feed for this account right
            here so the new post can be confirmed/edited/deleted without leaving
            the Submit tab. It auto-loads and remounts on each new publish. */}
        {status === 'success' && selectedAccount && (
          <RedditPostsVerifier
            key={publishSeq}
            account={selectedAccount}
            defaultOpen
            autoVerify
          />
        )}
      </div>
    </div>
  )
}
