import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import {
  X,
  Mail,
  KeyRound,
  Lock,
  Cake,
  Users,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  SkipForward,
  UserCircle,
} from 'lucide-react'

const BASE = '/reddit-accounts/register'

const STEPS = [
  { key: 'email', label: 'Email', icon: Mail, stages: ['email'] },
  { key: 'code', label: 'Code', icon: KeyRound, stages: ['code'] },
  { key: 'password', label: 'Account', icon: Lock, stages: ['password'] },
  {
    key: 'onboarding',
    label: 'Onboarding',
    icon: Sparkles,
    stages: ['onboarding_age', 'onboarding_gender', 'onboarding_interest'],
  },
  { key: 'done', label: 'Done', icon: CheckCircle, stages: ['completed'] },
]

const GENDERS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'OPT_OUT', label: 'Prefer not to say' },
]

function StepIndicator({ stage }) {
  const activeIndex = STEPS.findIndex((s) => s.stages.includes(stage))
  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-border overflow-x-auto">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === activeIndex
        const isDone = i < activeIndex
        return (
          <div key={step.key} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isDone
                    ? 'bg-green-500/15 text-green-500'
                    : 'bg-secondary text-muted-foreground'
              }`}
            >
              {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {step.label}
            </div>
            {i < STEPS.length - 1 && <div className="w-3 h-px bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}

export default function RegisterAccountModal({ proxies, onClose, onComplete }) {
  const [stage, setStage] = useState('email')
  const [sessionId, setSessionId] = useState(null)
  const [accountId, setAccountId] = useState(null)
  const [createdAccount, setCreatedAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form fields
  const [email, setEmail] = useState('')
  const [proxyId, setProxyId] = useState('')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savePassword, setSavePassword] = useState(true)
  const [notes, setNotes] = useState('')
  const [birth, setBirth] = useState({ day: '', month: '', year: '' })
  const [gender, setGender] = useState('')
  const [interests, setInterests] = useState([])
  const [interestsLoading, setInterestsLoading] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState([])

  const activeProxies = proxies.filter((p) => p.status === 'active')

  // Apply a backend response: update stage + capture session/account
  const applyResponse = (data) => {
    if (data.session_id) setSessionId(data.session_id)
    if (data.account?.id) {
      setAccountId(data.account.id)
      setCreatedAccount(data.account)
    }
    if (data.stage) setStage(data.stage)
  }

  // Generic request runner with error handling
  const run = async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fn()
      const data = await response.json().catch(() => ({}))
      if (response.status === 410 || data.stage === 'expired') {
        setStage('expired')
        return null
      }
      if (!response.ok) {
        if (data.username_taken) throw new Error('That username is already taken. Try another.')
        if (data.requires_captcha)
          throw new Error('Reddit requested a captcha. Please try again later or use a proxy.')
        throw new Error(data.detail || 'Something went wrong. Please try again.')
      }
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Load interests when reaching that stage
  useEffect(() => {
    if (stage !== 'onboarding_interest' || !sessionId) return
    let cancelled = false
    setInterestsLoading(true)
    api
      .get(`${BASE}/onboarding/interests?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setInterests(data.interests || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInterestsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [stage, sessionId])

  const handleStart = async (e) => {
    e.preventDefault()
    const data = await run(() =>
      api.post(`${BASE}/start`, { email, proxy_id: proxyId || undefined }),
    )
    if (data) applyResponse(data)
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    const data = await run(() =>
      api.post(`${BASE}/verify-code`, { session_id: sessionId, code }),
    )
    if (data) applyResponse(data)
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()
    const data = await run(() =>
      api.post(`${BASE}/set-password`, {
        session_id: sessionId,
        username,
        password,
        proxy_id: proxyId || undefined,
        notes: notes || undefined,
        save_password: savePassword,
      }),
    )
    if (data) applyResponse(data)
  }

  const handleAge = async (skip) => {
    const body = skip
      ? { session_id: sessionId, skip: true }
      : { session_id: sessionId, day: birth.day, month: birth.month, year: birth.year }
    const data = await run(() => api.post(`${BASE}/onboarding/age`, body))
    if (data) applyResponse(data)
  }

  const handleGender = async (skip) => {
    const body = skip
      ? { session_id: sessionId, skip: true }
      : { session_id: sessionId, gender }
    const data = await run(() => api.post(`${BASE}/onboarding/gender`, body))
    if (data) applyResponse(data)
  }

  const handleInterests = async (skip) => {
    const body = skip
      ? { session_id: sessionId, account_id: accountId, skip: true }
      : { session_id: sessionId, account_id: accountId, topic_ids: selectedInterests }
    const data = await run(() => api.post(`${BASE}/onboarding/interests`, body))
    if (data) applyResponse(data)
  }

  const handleFinishOnboarding = async () => {
    const data = await run(() =>
      api.post(`${BASE}/onboarding/finish`, { session_id: sessionId, account_id: accountId }),
    )
    if (data) applyResponse(data)
  }

  const handleCancel = async () => {
    if (sessionId && stage !== 'completed') {
      api.post(`${BASE}/cancel`, { session_id: sessionId }).catch(() => {})
    }
    onClose()
  }

  const toggleInterest = (id) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const restart = () => {
    setStage('email')
    setSessionId(null)
    setError(null)
    setCode('')
  }

  // Group interests by section
  const groupedInterests = interests.reduce((acc, item) => {
    const section = item.section || 'Other'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Register Reddit Account</h2>
          </div>
          <button onClick={handleCancel} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage !== 'expired' && <StepIndicator stage={stage} />}

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* STAGE: EMAIL */}
          {stage === 'email' && (
            <form onSubmit={handleStart} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the email address for the new Reddit account. A verification code will be sent
                to this inbox.
              </p>
              <ErrorBox message={error} />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="someone@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Proxy (Optional)
                </label>
                <select
                  value={proxyId}
                  onChange={(e) => setProxyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No proxy</option>
                  {activeProxies.map((proxy) => (
                    <option key={proxy.id} value={proxy.id}>
                      {proxy.name || `${proxy.host}:${proxy.port}`} ({proxy.type})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </form>
          )}

          {/* STAGE: CODE */}
          {stage === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code Reddit sent to{' '}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
              <ErrorBox message={error} />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Verification code *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
            </form>
          )}

          {/* STAGE: PASSWORD */}
          {stage === 'password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a username and password. This creates the Reddit account.
              </p>
              <ErrorBox message={error} />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Username *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    u/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="my_cool_name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={savePassword}
                  onChange={(e) => setSavePassword(e.target.checked)}
                  className="rounded border-input"
                />
                Save password in our database
              </label>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Any notes about this account..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCircle className="w-4 h-4" />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* STAGE: ONBOARDING - AGE */}
          {stage === 'onboarding_age' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Cake className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Date of birth</h3>
              </div>
              <p className="text-sm text-muted-foreground">Reddit asks for the account&apos;s birth date.</p>
              <ErrorBox message={error} />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Day</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={birth.day}
                    onChange={(e) => setBirth({ ...birth, day: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="01"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Month</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={birth.month}
                    onChange={(e) => setBirth({ ...birth, month: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Year</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={birth.year}
                    onChange={(e) => setBirth({ ...birth, year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="2001"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAge(true)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleAge(false)}
                  disabled={loading || !birth.day || !birth.month || !birth.year}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STAGE: ONBOARDING - GENDER */}
          {stage === 'onboarding_gender' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Gender</h3>
              </div>
              <ErrorBox message={error} />
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      gender === g.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleGender(true)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleGender(false)}
                  disabled={loading || !gender}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STAGE: ONBOARDING - INTERESTS */}
          {stage === 'onboarding_interest' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Interests</h3>
              </div>
              <ErrorBox message={error} />
              {interestsLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {Object.entries(groupedInterests).map(([section, items]) => (
                    <div key={section}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{section}</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => {
                          const selected = selectedInterests.includes(item.id)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleInterest(item.id)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-foreground hover:bg-secondary'
                              }`}
                            >
                              {item.label || item.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleInterests(true)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleInterests(false)}
                  disabled={loading || selectedInterests.length === 0}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Finish ({selectedInterests.length})
                </button>
              </div>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip entire onboarding
              </button>
            </div>
          )}

          {/* STAGE: COMPLETED */}
          {stage === 'completed' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Account registered!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {createdAccount?.reddit_username
                    ? `u/${createdAccount.reddit_username} is ready to use.`
                    : 'The Reddit account is ready to use.'}
                </p>
              </div>
              <button
                onClick={() => onComplete()}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* STAGE: EXPIRED */}
          {stage === 'expired' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Session expired</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The registration session timed out. Please start again.
                </p>
              </div>
              <button
                onClick={restart}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
