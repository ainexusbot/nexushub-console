import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'
import { FeedAPI } from '../utils/postsApi'
import {
  Play,
  Square,
  Loader2,
  Terminal,
  Trash2,
  AlertCircle,
  CheckCircle,
  Activity,
  MousePointerClick,
  Clock,
  ArrowBigUp,
  Compass,
  Timer,
  OctagonX,
  ExternalLink,
  Search,
} from 'lucide-react'

const DEFAULT_CONFIG = {
  mode: 'feed', // 'feed' | 'search'
  feed_url: '',
  search_query: '',
  search_type: 'posts',
  search_sort: 'relevance',
  search_time: 'all',
  duration_sec: 60,
  enter_posts: true,
  enter_posts_count: 2,
  enter_posts_per: 20,
  min_post_dwell_ms: 2000,
  max_post_dwell_ms: 15000,
  like_in_posts: true,
  likes_count: 2,
  likes_per: 30,
}

const SEARCH_TYPE_OPTIONS = [
  { value: 'posts', label: 'Posts' },
  { value: 'all', label: 'All' },
  { value: 'communities', label: 'Communities' },
  { value: 'comments', label: 'Comments' },
  { value: 'media', label: 'Media' },
  { value: 'people', label: 'Profiles' },
]

const SEARCH_SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'hot', label: 'Hot' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
  { value: 'comments', label: 'Comments' },
]

const SEARCH_TIME_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'year', label: 'Past year' },
  { value: 'month', label: 'Past month' },
  { value: 'week', label: 'Past week' },
  { value: 'day', label: 'Past day' },
  { value: 'hour', label: 'Past hour' },
]

const POLL_INTERVAL_MS = 1000

function formatClock(ms) {
  if (ms == null || ms < 0) ms = 0
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function NumberField({ label, value, onChange, min = 0, step = 1, disabled, suffix }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  )
}

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

function VisitedItem({ nav }) {
  const time = nav.ts ? new Date(nav.ts).toLocaleTimeString() : ''
  const dwell = typeof nav.dwell_ms === 'number' ? `${(nav.dwell_ms / 1000).toFixed(1)}s` : null
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/40 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{time}</span>
        {nav.subreddit && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium shrink-0">
            {nav.subreddit}
          </span>
        )}
        {dwell && (
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">{dwell}</span>
        )}
      </div>
      <p className="text-sm text-foreground line-clamp-2 break-words">{nav.title || 'Untitled'}</p>
      {nav.url && (
        <a
          href={nav.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{nav.url}</span>
        </a>
      )}
    </div>
  )
}

export default function FeedPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [config, setConfig] = useState(DEFAULT_CONFIG)

  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | success | failed
  const [logs, setLogs] = useState([])
  const [navigations, setNavigations] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stoppingAll, setStoppingAll] = useState(false)
  const [forceStop, setForceStop] = useState(false)

  const [maxDurationMs, setMaxDurationMs] = useState(null)
  const [remainingMs, setRemainingMs] = useState(null)

  const sinceRef = useRef(0)
  const sinceNavRef = useRef(0)
  const deadlineRef = useRef(null)
  const pollRef = useRef(null)
  const countdownRef = useRef(null)
  const consoleRef = useRef(null)
  const visitedRef = useRef(null)
  const feedApi = useRef(new FeedAPI()).current

  const running = status === 'running'

  useEffect(() => {
    api
      .get('/reddit-accounts')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
  }, [])

  // Auto-scroll the consoles to the newest line.
  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  useEffect(() => {
    const el = visitedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [navigations])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      stopPolling()
      stopCountdown()
    },
    [stopPolling, stopCountdown],
  )

  const poll = useCallback(
    async (id) => {
      const res = await feedApi.status(id, sinceRef.current, sinceNavRef.current)
      if (!res.success) {
        // 404/expired just means the job is gone — stop quietly.
        if (res.status === 404) {
          stopPolling()
          stopCountdown()
          setStatus((s) => (s === 'running' ? 'failed' : s))
          setError((e) => e || 'Job expired or was not found.')
        }
        return
      }
      const data = res.data
      if (Array.isArray(data.logs) && data.logs.length) {
        setLogs((prev) => [...prev, ...data.logs])
      }
      if (Array.isArray(data.navigations) && data.navigations.length) {
        setNavigations((prev) => [...prev, ...data.navigations])
      }
      if (typeof data.next_since === 'number') sinceRef.current = data.next_since
      if (typeof data.next_since_nav === 'number') sinceNavRef.current = data.next_since_nav

      if (data.done) {
        stopPolling()
        stopCountdown()
        setRemainingMs(0)
        // Reaching the configured time limit is a normal auto-finish.
        setStatus(data.status || 'success')
        if (data.result) setResult(data.result)
        if (data.error) setError(data.error.detail || 'Feed browse failed.')
      }
    },
    [feedApi, stopPolling, stopCountdown],
  )

  const startCountdown = useCallback(
    (durationMs) => {
      stopCountdown()
      if (!durationMs || durationMs <= 0) {
        setMaxDurationMs(null)
        setRemainingMs(null)
        deadlineRef.current = null
        return
      }
      setMaxDurationMs(durationMs)
      deadlineRef.current = Date.now() + durationMs
      setRemainingMs(durationMs)
      countdownRef.current = setInterval(() => {
        const left = deadlineRef.current - Date.now()
        setRemainingMs(left > 0 ? left : 0)
        if (left <= 0) stopCountdown()
      }, 250)
    },
    [stopCountdown],
  )

  const handleStart = async () => {
    if (!accountId) {
      setError('Select an account first.')
      return
    }
    setStarting(true)
    setError(null)
    setResult(null)
    setLogs([])
    setNavigations([])
    setMaxDurationMs(null)
    setRemainingMs(null)
    sinceRef.current = 0
    sinceNavRef.current = 0

    const { mode, search_query, search_type, search_sort, search_time, feed_url, ...rest } =
      config
    const isSearch = mode === 'search'

    if (isSearch && !search_query.trim()) {
      setStarting(false)
      setError('Enter a search query, or switch back to Feed mode.')
      return
    }

    const payload = { account_id: accountId, ...rest }
    if (isSearch) {
      payload.search_query = search_query.trim()
      payload.search_type = search_type
      payload.search_sort = search_sort
      payload.search_time = search_time
    } else if (feed_url) {
      payload.feed_url = feed_url
    }

    const res = await feedApi.start(payload)
    setStarting(false)

    if (!res.success) {
      setError(res.error)
      return
    }

    const id = res.data.job_id
    setJobId(id)
    setStatus('running')

    // Backend reports the effective time limit for this run.
    const durationMs =
      res.data.max_duration_ms ??
      (config.duration_sec ? config.duration_sec * 1000 : null)
    startCountdown(durationMs)

    setLogs([
      {
        seq: -1,
        level: 'info',
        message: `[v0] Feed: browse started for account ${accountId} (job ${id})${
          durationMs ? ` — time limit ${formatClock(durationMs)}` : ''
        }`,
        ts: new Date().toISOString(),
      },
    ])

    stopPolling()
    poll(id)
    pollRef.current = setInterval(() => poll(id), POLL_INTERVAL_MS)
  }

  const handleStop = async () => {
    setStopping(true)
    const res = await feedApi.stop(accountId, forceStop)
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
        message: forceStop
          ? '[v0] Feed: force stop requested — killing session…'
          : '[v0] Feed: stop requested — finishing current action…',
        ts: new Date().toISOString(),
      },
    ])
  }

  const handleStopAll = async () => {
    setStoppingAll(true)
    const res = await feedApi.stopAll(true)
    setStoppingAll(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    stopCountdown()
    setRemainingMs(0)
    setLogs((prev) => [
      ...prev,
      {
        seq: -3,
        level: 'error',
        message: '[v0] Super stop: halting ALL sessions (live feed, scrolling, everything)…',
        ts: new Date().toISOString(),
      },
    ])
  }

  const updateConfig = (patch) => setConfig((c) => ({ ...c, ...patch }))

  const countdownTone =
    remainingMs != null && maxDurationMs
      ? remainingMs <= 10000
        ? 'text-destructive'
        : remainingMs <= maxDurationMs * 0.25
          ? 'text-warning'
          : 'text-foreground'
      : 'text-foreground'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feed Browse</h1>
          <p className="text-muted-foreground mt-1">
            Run a human-like browsing simulation: scroll the feed, open posts, dwell, and upvote.
          </p>
        </div>
        {/* Super stop — halts everything, even sessions running under the hood. */}
        <button
          onClick={handleStopAll}
          disabled={stoppingAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
        >
          {stoppingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <OctagonX className="w-4 h-4" />}
          {stoppingAll ? 'Stopping all…' : 'Stop all'}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Settings</h2>

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

          {/* Mode: feed vs search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Mode</label>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              {[
                { value: 'feed', label: 'Feed' },
                { value: 'search', label: 'Search' },
              ].map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={running}
                  onClick={() => updateConfig({ mode: opt.value })}
                  className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    i > 0 ? 'border-l border-border' : ''
                  } ${
                    config.mode === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground hover:bg-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {config.mode === 'search' ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-foreground" />
                <p className="text-sm font-medium text-foreground">Search</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Query
                </label>
                <input
                  type="text"
                  value={config.search_query}
                  maxLength={128}
                  onChange={(e) => updateConfig({ search_query: e.target.value })}
                  disabled={running}
                  placeholder="e.g. cats"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Type
                  </label>
                  <select
                    value={config.search_type}
                    onChange={(e) => updateConfig({ search_type: e.target.value })}
                    disabled={running}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {SEARCH_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Sort
                  </label>
                  <select
                    value={config.search_sort}
                    onChange={(e) => updateConfig({ search_sort: e.target.value })}
                    disabled={running}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {SEARCH_SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Time
                  </label>
                  <select
                    value={config.search_time}
                    onChange={(e) => updateConfig({ search_time: e.target.value })}
                    disabled={running}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {SEARCH_TIME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Scrolls the Reddit search results for your query. Entering posts and upvoting only
                apply when Type is Posts or All; other types are scroll-only.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Feed URL</label>
              <input
                type="url"
                value={config.feed_url}
                onChange={(e) => updateConfig({ feed_url: e.target.value })}
                disabled={running}
                placeholder="https://www.reddit.com/ (default home feed)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to browse the home feed, or paste a subreddit URL.
              </p>
            </div>
          )}

          {/* Time limit */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-foreground" />
              <p className="text-sm font-medium text-foreground">Time limit</p>
            </div>
            <NumberField
              label="Run for"
              value={config.duration_sec}
              onChange={(v) => updateConfig({ duration_sec: v })}
              min={0}
              step={10}
              suffix="sec"
              disabled={running}
            />
            <p className="text-xs text-muted-foreground">
              The browse auto-finishes after {config.duration_sec || 0}s. Set 0 for no limit.
            </p>
          </div>

          {/* Enter posts */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enter posts</p>
                <p className="text-xs text-muted-foreground">Open a sample of posts while scrolling</p>
              </div>
              <Toggle
                checked={config.enter_posts}
                onChange={(v) => updateConfig({ enter_posts: v })}
                disabled={running}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Open count"
                value={config.enter_posts_count}
                onChange={(v) => updateConfig({ enter_posts_count: v })}
                min={1}
                disabled={running || !config.enter_posts}
              />
              <NumberField
                label="Per every N posts"
                value={config.enter_posts_per}
                onChange={(v) => updateConfig({ enter_posts_per: v })}
                min={1}
                disabled={running || !config.enter_posts}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Open {config.enter_posts_count} of every {config.enter_posts_per} posts scrolled.
            </p>
          </div>

          {/* Dwell time */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Dwell time per post</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Min"
                value={config.min_post_dwell_ms}
                onChange={(v) => updateConfig({ min_post_dwell_ms: v })}
                min={0}
                step={500}
                suffix="ms"
                disabled={running}
              />
              <NumberField
                label="Max"
                value={config.max_post_dwell_ms}
                onChange={(v) => updateConfig({ max_post_dwell_ms: v })}
                min={0}
                step={500}
                suffix="ms"
                disabled={running}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stay {(config.min_post_dwell_ms / 1000).toFixed(1)}–
              {(config.max_post_dwell_ms / 1000).toFixed(1)}s in each opened post (random).
            </p>
          </div>

          {/* Likes */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Upvote posts</p>
                <p className="text-xs text-muted-foreground">Upvote a sample of opened posts</p>
              </div>
              <Toggle
                checked={config.like_in_posts}
                onChange={(v) => updateConfig({ like_in_posts: v })}
                disabled={running}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Upvote count"
                value={config.likes_count}
                onChange={(v) => updateConfig({ likes_count: v })}
                min={1}
                disabled={running || !config.like_in_posts}
              />
              <NumberField
                label="Per every N opened"
                value={config.likes_per}
                onChange={(v) => updateConfig({ likes_per: v })}
                min={1}
                disabled={running || !config.like_in_posts}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Up to {config.likes_count} upvotes per {config.likes_per} opened posts.
            </p>
          </div>

          {/* Force stop option */}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={forceStop}
              onChange={(e) => setForceStop(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            Force stop this account (kill session immediately instead of finishing the current action)
          </label>

          <div className="flex gap-3 pt-1">
            {!running ? (
              <button
                onClick={handleStart}
                disabled={starting || !accountId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {starting ? 'Starting…' : 'Start Browse'}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                {stopping ? 'Stopping…' : forceStop ? 'Force Stop' : 'Stop Browse'}
              </button>
            )}
          </div>
        </div>

        {/* Live output: console + visited */}
        <div className="space-y-6">
          {/* Countdown */}
          {maxDurationMs != null && (
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Time remaining</p>
                <p className={`text-lg font-semibold tabular-nums ${countdownTone}`}>
                  {formatClock(remainingMs)}
                </p>
              </div>
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((remainingMs ?? 0) / maxDurationMs) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Live console */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Live console</h2>
                {running && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Running
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

            {result && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Activity} label="Scrolls" value={result.scrolls ?? 0} />
                <StatCard icon={MousePointerClick} label="Posts opened" value={result.postsOpened ?? 0} />
                <StatCard icon={ArrowBigUp} label="Upvotes" value={result.upvotes ?? 0} />
              </div>
            )}

            <div
              ref={consoleRef}
              className="flex-1 min-h-[260px] max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-background"
            >
              {logs.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Logs will stream here once a browse is running.
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

          {/* Visited — navigations console */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Visited</h2>
                {navigations.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground tabular-nums">
                    {navigations.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setNavigations([])}
                disabled={running || navigations.length === 0}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30"
                title="Clear visited"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div
              ref={visitedRef}
              className="flex-1 min-h-[200px] max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-background"
            >
              {navigations.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6">
                  <Compass className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Posts and subreddits the account visits will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  {navigations.map((nav, i) => (
                    <VisitedItem key={`${nav.url || nav.title}-${i}`} nav={nav} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
