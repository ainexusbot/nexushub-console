import { useState, useEffect, useRef, useCallback } from 'react'
import { AccountSettingsAPI } from '../utils/postsApi'
import {
  Loader2,
  Terminal,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Compass,
  ExternalLink,
  RefreshCw,
  DownloadCloud,
  Save,
  Square,
  Ban,
  Image as ImageIcon,
  ShieldAlert,
  Link2,
  Smile,
  Check,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'

const POLL_INTERVAL_MS = 1000

// The avatar-scan job result shape can vary (categories of outfits, or a flat
// list). Normalize whatever the backend returns into a flat array of
// { title, image, category } so the UI can render a single grid.
function normalizeOutfits(result) {
  if (!result) return []
  const out = []
  const pushOutfit = (o, category) => {
    if (!o) return
    const title = o.title || o.name || o.label || o.outfit_name || o.outfitName
    if (!title) return
    const image =
      o.image || o.imageUrl || o.image_url || o.src || o.thumbnail || o.preview || ''
    out.push({ title, image, category: category || o.category || o.categoryName || '' })
  }

  // Shape A: { categories: [{ name/title, outfits: [...] }] }
  const categories = result.categories || result.outfit_categories || result.outfitCategories
  if (Array.isArray(categories)) {
    for (const cat of categories) {
      const catName = cat.name || cat.title || cat.category || cat.label || ''
      const outfits = cat.outfits || cat.items || cat.tiles || []
      if (Array.isArray(outfits)) outfits.forEach((o) => pushOutfit(o, catName))
    }
  }

  // Shape B: { outfits: [{ title, image, category }] }
  const flat = result.outfits || result.items || result.tiles || result.avatars
  if (Array.isArray(flat)) flat.forEach((o) => pushOutfit(o))

  return out
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

// A single navigation entry: which settings page/modal the account opened.
function NavItem({ nav }) {
  const time = nav.ts ? new Date(nav.ts).toLocaleTimeString() : ''
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/40 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{time}</span>
        {nav.action && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium shrink-0 capitalize">
            {nav.action}
          </span>
        )}
        {(nav.tab || nav.field) && (
          <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[11px] font-medium shrink-0">
            {nav.tab || nav.field}
          </span>
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

function RowsTable({ title, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={`${row.key || row.label}-${i}`} className="hover:bg-muted/30">
              <td className="px-4 py-3 align-top w-1/3">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                {row.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {row.value || <span className="text-muted-foreground">—</span>}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DISPLAY_NAME_MAX = 90
const DESCRIPTION_MAX = 200

export default function AccountSettingsPanel({ account }) {
  const accountId = account?.id

  // Job state (shared by both scan and update — they are the same job stream).
  const [jobKind, setJobKind] = useState(null) // 'scan' | 'update'
  const [status, setStatus] = useState('idle') // idle | running | success | failed
  const [logs, setLogs] = useState([])
  const [navigations, setNavigations] = useState([])
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [canForce, setCanForce] = useState(false)

  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stoppingAll, setStoppingAll] = useState(false)

  // Scan result
  const [settings, setSettings] = useState(null)
  const [rows, setRows] = useState(null)

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [hasScanned, setHasScanned] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  // When checked, sign out of all other devices after the change (stay_logged_in=false).
  const [logoutEverywhere, setLogoutEverywhere] = useState(false)

  // Avatar (built-in Reddit outfits)
  const [loadingAvatars, setLoadingAvatars] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarOutfits, setAvatarOutfits] = useState([])
  const [hasLoadedAvatars, setHasLoadedAvatars] = useState(false)
  const [selectedOutfit, setSelectedOutfit] = useState(null) // { title, category }

  // Banner (custom image upload)
  const [savingBanner, setSavingBanner] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [bannerError, setBannerError] = useState(null)
  const [bannerDragging, setBannerDragging] = useState(false)
  const bannerInputRef = useRef(null)

  const sinceRef = useRef(0)
  const sinceNavRef = useRef(0)
  const pollRef = useRef(null)
  const consoleRef = useRef(null)
  const navRef = useRef(null)
  const settingsApi = useRef(new AccountSettingsAPI()).current

  const running = status === 'running'

  // Reset everything when the selected account changes.
  useEffect(() => {
    setJobKind(null)
    setStatus('idle')
    setLogs([])
    setNavigations([])
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)
    setSettings(null)
    setRows(null)
    setDisplayName('')
    setDescription('')
    setHasScanned(false)
    setCurrentPassword('')
    setNewPassword('')
    setPasswordChanged(false)
    setAvatarOutfits([])
    setHasLoadedAvatars(false)
    setSelectedOutfit(null)
    setBannerFile(null)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setBannerError(null)
    setBannerDragging(false)
    sinceRef.current = 0
    sinceNavRef.current = 0
  }, [accountId])

  // Release the banner preview object URL on unmount.
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
  }, [bannerPreview])

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  useEffect(() => {
    const el = navRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [navigations])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const poll = useCallback(
    async (kind, id) => {
      const res = await settingsApi.jobStatus(kind, id, sinceRef.current, sinceNavRef.current)
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
      if (Array.isArray(data.navigations) && data.navigations.length) {
        setNavigations((prev) => [...prev, ...data.navigations])
      }
      if (typeof data.next_since === 'number') sinceRef.current = data.next_since
      if (typeof data.next_since_nav === 'number') sinceNavRef.current = data.next_since_nav

      if (data.done) {
        stopPolling()
        setStatus(data.status || 'success')

        if (data.error) {
          const detail = data.error.detail || 'Job failed.'
          setError(detail)
          if (/not logged in|needs_login/i.test(detail)) setNeedsLogin(true)
        }

        if (data.result) {
          if (kind === 'scan' && data.result.settings) {
            setSettings(data.result.settings)
            setRows(data.result.rows || null)
            setDisplayName(data.result.settings.displayName || '')
            setDescription(data.result.settings.description || '')
            setHasScanned(true)
          }
          if (kind === 'update' && data.status === 'success') {
            // Re-read settings after a successful update.
            setTimeout(() => handleScan(false), 400)
          }
          if (kind === 'avatars') {
            setAvatarOutfits(normalizeOutfits(data.result))
            setHasLoadedAvatars(true)
          }
          if (kind === 'avatar' && data.status === 'success') {
            setSelectedOutfit(null)
            // Re-read settings so the avatar preview refreshes.
            setTimeout(() => handleScan(false), 400)
          }
          if (kind === 'banner' && data.status === 'success') {
            setBannerFile(null)
            setBannerPreview((prev) => {
              if (prev) URL.revokeObjectURL(prev)
              return null
            })
            // Re-read settings so the banner preview refreshes.
            setTimeout(() => handleScan(false), 400)
          }
        }

        if (kind === 'password' && data.status === 'success') {
          // Clear the fields — the password has been changed.
          setCurrentPassword('')
          setNewPassword('')
          setPasswordChanged(true)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsApi, stopPolling],
  )

  const beginJob = (kind, id) => {
    setJobKind(kind)
    setStatus('running')
    sinceRef.current = 0
    sinceNavRef.current = 0
    setLogs([
      {
        seq: -1,
        level: 'info',
        message: `[v0] Settings: ${kind} started for account ${accountId} (job ${id})`,
        ts: new Date().toISOString(),
      },
    ])
    setNavigations([])
    stopPolling()
    poll(kind, id)
    pollRef.current = setInterval(() => poll(kind, id), POLL_INTERVAL_MS)
  }

  const handleScan = async (force = false) => {
    if (!accountId) return
    setStarting(true)
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)

    const res = await settingsApi.startScan({ account_id: accountId, force })
    setStarting(false)

    if (!res.success) {
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('scan', res.data.job_id)
  }

  const handleSave = async () => {
    if (!accountId) return
    const dn = displayName.trim()
    const desc = description.trim()
    if (!dn && !desc) {
      setError('Enter a display name or description to save.')
      return
    }
    if (dn.length > DISPLAY_NAME_MAX || desc.length > DESCRIPTION_MAX) {
      setError('One of the fields exceeds its character limit.')
      return
    }
    setSaving(true)
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)

    const payload = { account_id: accountId }
    // Only send fields that actually changed from the last scan.
    if (dn !== (settings?.displayName || '')) payload.display_name = dn
    if (desc !== (settings?.description || '')) payload.description = desc

    if (!payload.display_name && !payload.description) {
      setSaving(false)
      setError('Nothing changed — edit the name or description first.')
      return
    }

    const res = await settingsApi.startUpdate(payload)
    setSaving(false)

    if (!res.success) {
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('update', res.data.job_id)
  }

  const handleLoadAvatars = async () => {
    if (!accountId) return
    setLoadingAvatars(true)
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)

    const res = await settingsApi.startAvatarScan({ account_id: accountId })
    setLoadingAvatars(false)

    if (!res.success) {
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('avatars', res.data.job_id)
  }

  const handleSaveAvatar = async () => {
    if (!accountId || !selectedOutfit) return
    setSavingAvatar(true)
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)

    const res = await settingsApi.startAvatarUpdate({
      account_id: accountId,
      outfit_name: selectedOutfit.title,
      category: selectedOutfit.category || undefined,
    })
    setSavingAvatar(false)

    if (!res.success) {
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('avatar', res.data.job_id)
  }

  const BANNER_MAX_BYTES = 10 * 1024 * 1024 // 10 MB, matches the backend limit.

  const selectBannerFile = (file) => {
    if (!file) return
    setBannerError(null)
    if (!file.type.startsWith('image/')) {
      setBannerError('Please choose an image file.')
      return
    }
    if (file.size > BANNER_MAX_BYTES) {
      setBannerError('Image is too large. The maximum size is 10 MB.')
      return
    }
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setBannerFile(file)
  }

  const handleBannerDrop = (e) => {
    e.preventDefault()
    setBannerDragging(false)
    if (running) return
    const file = e.dataTransfer.files?.[0]
    selectBannerFile(file)
  }

  const clearBanner = () => {
    setBannerFile(null)
    setBannerError(null)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const handleSaveBanner = async (force = false) => {
    if (!accountId || !bannerFile) return
    setSavingBanner(true)
    setError(null)
    setBannerError(null)
    setNeedsLogin(false)
    setCanForce(false)

    const res = await settingsApi.startBanner({
      account_id: accountId,
      file: bannerFile,
      force,
    })
    setSavingBanner(false)

    if (!res.success) {
      // A job is already running for this account — retry once, interrupting it.
      if (!force && (res.status === 409 || res.canForce)) {
        handleSaveBanner(true)
        return
      }
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('banner', res.data.job_id)
  }

  const PASSWORD_MIN = 8

  const handleChangePassword = async (force = false) => {
    if (!accountId) return
    const current = currentPassword
    const next = newPassword
    if (!current || !next) {
      setError('Enter both the current and the new password.')
      return
    }
    if (next.length < PASSWORD_MIN) {
      setError(`New password must be at least ${PASSWORD_MIN} characters.`)
      return
    }
    setChangingPassword(true)
    setError(null)
    setNeedsLogin(false)
    setCanForce(false)
    setPasswordChanged(false)

    const res = await settingsApi.startPasswordChange({
      account_id: accountId,
      current_password: current,
      new_password: next,
      stay_logged_in: !logoutEverywhere,
      force,
    })
    setChangingPassword(false)

    if (!res.success) {
      // A job is already running for this account — retry once, interrupting it.
      if (!force && (res.status === 409 || res.canForce)) {
        handleChangePassword(true)
        return
      }
      setError(res.error)
      if (res.status === 409 || res.canForce) setCanForce(true)
      return
    }
    beginJob('password', res.data.job_id)
  }

  const handleForceStopAndRetry = async () => {
    setStopping(true)
    await settingsApi.stop(accountId, true)
    setStopping(false)
    setCanForce(false)
    handleScan(true)
  }

  const handleStop = async (force = false) => {
    setStopping(true)
    const res = await settingsApi.stop(accountId, force)
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
          ? '[v0] Settings: force stop — closing browser and clearing session…'
          : '[v0] Settings: stop requested — finishing current step…',
        ts: new Date().toISOString(),
      },
    ])
  }

  const handleStopAll = async () => {
    setStoppingAll(true)
    const res = await settingsApi.stopAll(true)
    setStoppingAll(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    stopPolling()
    setStatus((s) => (s === 'running' ? 'failed' : s))
    setLogs((prev) => [
      ...prev,
      {
        seq: -3,
        level: 'error',
        message: '[v0] Super stop: halted all active settings sessions.',
        ts: new Date().toISOString(),
      },
    ])
  }

  const dnRemaining = DISPLAY_NAME_MAX - displayName.length
  const descRemaining = DESCRIPTION_MAX - description.length

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            {needsLogin && (
              <p className="text-xs text-destructive/80">
                This account&apos;s session expired. It needs to be reconnected before settings can
                be read or changed.
              </p>
            )}
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
        {/* Controls + editor */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Account settings</h2>
              {hasScanned && (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="w-3 h-3" />
                  Loaded
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Read this account&apos;s Reddit profile and account settings, then edit the display
              name and description. The account must be active with a valid session.
            </p>

            <div className="flex flex-wrap gap-3">
              {!running ? (
                <button
                  onClick={() => handleScan(false)}
                  disabled={starting || !accountId}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {starting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="w-4 h-4" />
                  )}
                  {starting ? 'Starting…' : hasScanned ? 'Reload settings' : 'Load settings'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleStop(false)}
                    disabled={stopping}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {stopping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {stopping ? 'Stopping…' : 'Stop'}
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
          </div>

          {/* Editable profile fields */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <h2 className="text-base font-semibold text-foreground">Edit profile</h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-foreground">Display name</label>
                <span
                  className={`text-xs tabular-nums ${
                    dnRemaining < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {dnRemaining}
                </span>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={running || !hasScanned}
                maxLength={DISPLAY_NAME_MAX + 20}
                placeholder={hasScanned ? 'Display name' : 'Load settings first'}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-foreground">Description</label>
                <span
                  className={`text-xs tabular-nums ${
                    descRemaining < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {descRemaining}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={running || !hasScanned}
                rows={4}
                placeholder={hasScanned ? 'About this profile' : 'Load settings first'}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || running || !hasScanned}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <p className="text-xs text-muted-foreground">
              The display name and description are edited here. The avatar and banner have their own
              sections below. NSFW and social links are read-only for now.
            </p>
          </div>

          {/* Change password */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Change password</h2>
              </div>
              {passwordChanged && (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="w-3 h-3" />
                  Changed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Set a new Reddit password for this account. The account must be active with a valid
              session. Watch the live console on the right to follow the change.
            </p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={running || !accountId}
                  autoComplete="off"
                  placeholder="Current password"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">New password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={running || !accountId}
                  autoComplete="off"
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-destructive mt-1">
                  New password must be at least 8 characters.
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={logoutEverywhere}
                onChange={(e) => setLogoutEverywhere(e.target.checked)}
                disabled={running || !accountId}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <span>
                Log out of all other devices
                <span className="block text-xs text-muted-foreground">
                  Ends every other active session after the password is changed.
                </span>
              </span>
            </label>

            <button
              onClick={() => handleChangePassword(false)}
              disabled={
                changingPassword ||
                running ||
                !accountId ||
                !currentPassword ||
                newPassword.length < 8
              }
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              {changingPassword ? 'Starting…' : 'Change password'}
            </button>
          </div>

          {/* Change avatar — built-in Reddit outfits */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Change avatar</h2>
              </div>
              {hasLoadedAvatars && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {avatarOutfits.length} outfits
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Load Reddit&apos;s built-in avatar outfits, pick one, and save it to this account. The
              account must be active with a valid session.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLoadAvatars}
                disabled={loadingAvatars || running || !accountId}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {loadingAvatars ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
                {loadingAvatars
                  ? 'Starting…'
                  : hasLoadedAvatars
                    ? 'Reload avatars'
                    : 'Load avatars'}
              </button>
            </div>

            {hasLoadedAvatars && avatarOutfits.length === 0 && !running && (
              <p className="text-sm text-muted-foreground">
                No avatar outfits were found for this account.
              </p>
            )}

            {avatarOutfits.length > 0 && (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                  {avatarOutfits.map((outfit, i) => {
                    const isSelected =
                      selectedOutfit &&
                      selectedOutfit.title === outfit.title &&
                      selectedOutfit.category === outfit.category
                    return (
                      <button
                        key={`${outfit.category}-${outfit.title}-${i}`}
                        onClick={() => setSelectedOutfit(outfit)}
                        disabled={running}
                        title={outfit.title}
                        className={`group relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors disabled:opacity-50 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/40'
                        }`}
                      >
                        <div className="relative w-full aspect-square rounded-md bg-muted overflow-hidden">
                          {outfit.image ? (
                            <img
                              src={outfit.image || '/placeholder.svg'}
                              alt={outfit.title}
                              crossOrigin="anonymous"
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                          {isSelected && (
                            <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-foreground text-center leading-tight line-clamp-2">
                          {outfit.title}
                        </span>
                        {outfit.category && (
                          <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-1">
                            {outfit.category}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={handleSaveAvatar}
                  disabled={savingAvatar || running || !selectedOutfit}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingAvatar
                    ? 'Saving…'
                    : selectedOutfit
                      ? `Save "${selectedOutfit.title}"`
                      : 'Select an avatar to save'}
                </button>
              </>
            )}
          </div>

          {/* Change banner — custom image upload */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-foreground" />
              <h2 className="text-base font-semibold text-foreground">Change banner</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a custom profile banner image. Drag &amp; drop a file or click to browse. Max
              size 10 MB. The account must be active with a valid session.
            </p>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => selectBannerFile(e.target.files?.[0])}
            />

            {bannerPreview ? (
              <div className="space-y-3">
                <div className="relative w-full aspect-[4/1] rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={bannerPreview || '/placeholder.svg'}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground truncate">
                    {bannerFile?.name}
                  </p>
                  <button
                    onClick={clearBanner}
                    disabled={running || savingBanner}
                    className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!running) setBannerDragging(true)
                }}
                onDragLeave={() => setBannerDragging(false)}
                onDrop={handleBannerDrop}
                disabled={running}
                className={`w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors disabled:opacity-50 ${
                  bannerDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground/60" />
                <span className="text-sm text-foreground">
                  Drag &amp; drop an image, or click to browse
                </span>
                <span className="text-xs text-muted-foreground">PNG, JPG or GIF up to 10 MB</span>
              </button>
            )}

            {bannerError && <p className="text-xs text-destructive">{bannerError}</p>}

            <button
              onClick={() => handleSaveBanner(false)}
              disabled={savingBanner || running || !accountId || !bannerFile}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {savingBanner ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savingBanner ? 'Starting…' : 'Save banner'}
            </button>
          </div>

          {/* Read-only summary */}
          {settings && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Other settings (read-only)</h2>
              <div className="flex flex-wrap gap-4">
                {settings.avatarUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={settings.avatarUrl || '/placeholder.svg'}
                      alt="Account avatar"
                      crossOrigin="anonymous"
                      className="w-12 h-12 rounded-full object-cover border border-border"
                    />
                    <span className="text-xs text-muted-foreground">Avatar</span>
                  </div>
                )}
                {settings.bannerUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={settings.bannerUrl || '/placeholder.svg'}
                      alt="Account banner"
                      crossOrigin="anonymous"
                      className="w-20 h-12 rounded-lg object-cover border border-border"
                    />
                    <span className="text-xs text-muted-foreground">Banner</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  NSFW: {settings.nsfw ? 'On' : 'Off'}
                </span>
                {!settings.avatarUrl && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    <ImageIcon className="w-3.5 h-3.5" />
                    No avatar
                  </span>
                )}
              </div>
              {Array.isArray(settings.socialLinks) && settings.socialLinks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Social links</p>
                  <div className="flex flex-col gap-1">
                    {settings.socialLinks.map((link, i) => (
                      <a
                        key={`${link}-${i}`}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
                      >
                        <Link2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live output: console + navigations */}
        <div className="space-y-6">
          {/* Live console */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Live console</h2>
                {running && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {jobKind === 'password'
                      ? 'Changing password'
                      : jobKind === 'update' || jobKind === 'avatar' || jobKind === 'banner'
                        ? 'Saving'
                        : jobKind === 'avatars'
                          ? 'Loading avatars'
                          : 'Reading'}
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

            <div
              ref={consoleRef}
              className="flex-1 min-h-[260px] max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-background"
            >
              {logs.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Logs will stream here once a settings job is running.
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

          {/* Navigations — where the account went */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold text-foreground">Pages visited</h2>
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
                title="Clear list"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div
              ref={navRef}
              className="flex-1 min-h-[200px] max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-background"
            >
              {navigations.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6">
                  <Compass className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Settings pages and modals the account opens will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  {navigations.map((nav, i) => (
                    <NavItem key={`${nav.navSeq ?? nav.title}-${i}`} nav={nav} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Super stop */}
          <button
            onClick={handleStopAll}
            disabled={stoppingAll}
            title="Force-stop every running settings session, even orphaned ones"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {stoppingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            {stoppingAll ? 'Stopping all…' : 'Super stop (stop all sessions)'}
          </button>
        </div>
      </div>

      {/* Raw rows */}
      {rows && (rows.profile?.length > 0 || rows.account?.length > 0) && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Raw settings rows</h2>
            <p className="text-sm text-muted-foreground">
              Every label/value the scan read from the Profile and Account tabs.
            </p>
          </div>
          <RowsTable title="Profile" rows={rows.profile} />
          <RowsTable title="Account" rows={rows.account} />
        </div>
      )}
    </div>
  )
}
