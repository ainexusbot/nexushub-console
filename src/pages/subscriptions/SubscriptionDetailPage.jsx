import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Building2, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  buttonClass,
  inputClass,
  number,
  periodLabel,
  useResource,
} from '../../utils/subscriptions'
import { ErrorNotice, Loading, Stat, Status } from '../../components/subscriptions/Shared'
import SubscriptionSettings from '../../components/subscriptions/SubscriptionSettings'
import {
  ActivityPanel,
  HistoryPanel,
  UsersPanel,
} from '../../components/subscriptions/ActivityPanels'

const TABS = {
  settings: 'Limits & access',
  users: 'Users',
  usage: 'AI requests',
  operations: 'Operations',
  periods: 'Periods',
  audit: 'Change history',
}
export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const { isAdmin, loading: authLoading } = useAuth()
  if (authLoading) return <Loading />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Detail key={id} id={id} />
}
function Detail({ id }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS[params.get('tab')] ? params.get('tab') : 'settings'
  const [refresh, setRefresh] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [extraPeriod, setExtraPeriod] = useState(null)
  const summary = useResource(`/admin/subscriptions/${id}`, refresh)
  const organization = useResource(`/organizations/${id}`)
  const periods = useResource(`/admin/subscriptions/${id}/periods?limit=100`, refresh)
  const sub = summary.data?.subscription
  const selectedPeriod = params.get('period') || 'current'
  const periodId =
    selectedPeriod === 'all'
      ? undefined
      : selectedPeriod === 'current'
        ? sub?.period.id
        : selectedPeriod
  const userId = params.get('userId') || undefined
  const userName = params.get('userName') || userId
  const setQuery = (changes) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })
  function reload() {
    if (
      dirty &&
      !window.confirm('Discard unsaved changes and load the latest subscription settings?')
    )
      return
    setRefresh((x) => x + 1)
  }
  function saved(text) {
    setDirty(false)
    setMessage(text)
    setRefresh((x) => x + 1)
  }
  function selectUser(user) {
    setQuery({ userId: user.id, userName: user.name || user.email || 'Deleted user', tab: 'usage' })
  }
  const org =
    organization.data?.organization ||
    organization.data?.org ||
    organization.data?.data ||
    organization.data
  if (summary.loading) return <Loading />
  if (summary.error || !sub)
    return (
      <div className="space-y-4">
        <Link to="/subscriptions" className={buttonClass}>
          <ArrowLeft size={16} /> Subscriptions
        </Link>
        <ErrorNotice error={summary.error || 'Subscription not found.'} onRetry={reload} />
      </div>
    )
  const periodOptions = new Map(
    (periods.data?.periods || []).filter((p) => p.id !== sub.period.id).map((p) => [p.id, p]),
  )
  if (extraPeriod && extraPeriod.id !== sub.period.id)
    periodOptions.set(extraPeriod.id, extraPeriod)
  if (
    selectedPeriod !== 'all' &&
    selectedPeriod !== 'current' &&
    !periodOptions.has(selectedPeriod)
  )
    periodOptions.set(selectedPeriod, {
      id: selectedPeriod,
      label:
        selectedPeriod === sub.period.id ? periodLabel(sub.period) : 'Selected historical period',
    })
  return (
    <div className="space-y-6 min-w-0">
      <Link
        to="/subscriptions"
        className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to subscriptions
      </Link>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl h-fit">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex gap-3 items-center flex-wrap">
              <h1 className="text-2xl font-bold">{org?.name || 'Organization subscription'}</h1>
              <Status value={sub.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Current period: {periodLabel(sub.period)}
            </p>
            <Link
              to={`/organizations/${id}`}
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              Organization settings & members
            </Link>
          </div>
        </div>
        <button onClick={reload} className={buttonClass}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <ErrorNotice error={organization.error} />
      {message && (
        <div
          role="status"
          className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm flex justify-between gap-3"
        >
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat
          label="AI tokens · current period"
          value={number(sub.tokens.totalTokens)}
          detail={`${number(sub.tokens.inputTokens)} input / ${number(sub.tokens.outputTokens)} output`}
        />
        <Stat
          label="AI requests · current period"
          value={number(sub.tokens.requests)}
          detail={`${number(sub.tokens.incompleteRequests)} with incomplete usage`}
        />
        <Stat
          label="Reserved units · current period"
          value={number(sub.features.reduce((sum, f) => sum + f.reserved, 0))}
          detail="Reserved units across all feature allowances"
        />
        <Stat
          label="Feature restrictions"
          value={`${sub.features.filter((f) => f.blocked).length} / ${sub.features.length}`}
          detail={
            sub.blocked ? 'Organization-wide creation is also paused' : 'Individual feature blocks'
          }
        />
      </div>
      <div className="border-b border-border overflow-x-auto">
        <nav aria-label="Subscription sections" className="flex min-w-max gap-1">
          {Object.entries(TABS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setQuery({ tab: key })}
              aria-current={tab === key ? 'page' : undefined}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
            >
              {label}
              {key === 'settings' && dirty ? ' •' : ''}
            </button>
          ))}
        </nav>
      </div>
      {['users', 'usage', 'operations'].includes(tab) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted-foreground flex-1 min-w-0">
              Activity period
              <select
                className={`${inputClass} mt-1`}
                value={selectedPeriod}
                onChange={(e) => setQuery({ period: e.target.value })}
              >
                <option value="current">Current period · {periodLabel(sub.period)}</option>
                <option value="all">All time</option>
                {[...periodOptions.values()].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label || periodLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            {userId && tab !== 'users' && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm flex gap-3 items-center min-w-0">
                <span className="truncate">User: {userName}</span>
                <button
                  aria-label="Clear user filter"
                  onClick={() => setQuery({ userId: null, userName: null })}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <ErrorNotice error={periods.error} />
          {tab === 'users' && (
            <p className="text-xs text-muted-foreground">
              Open a user to inspect their individual AI requests and operations.
            </p>
          )}
        </div>
      )}
      <div hidden={tab !== 'settings'}>
        <SubscriptionSettings
          key={`${id}:${sub.revision}`}
          subscription={sub}
          onSaved={saved}
          onDirtyChange={setDirty}
          onReload={reload}
        />
      </div>
      {tab === 'users' && (
        <UsersPanel
          key={`${id}:${periodId || 'all'}`}
          id={id}
          periodId={periodId}
          refresh={refresh}
          onUser={selectUser}
        />
      )}
      {(tab === 'usage' || tab === 'operations') && (
        <ActivityPanel
          key={`${id}:${tab}:${periodId || 'all'}:${userId || 'all'}`}
          id={id}
          kind={tab}
          periodId={periodId}
          userId={userId}
          refresh={refresh}
          onUser={selectUser}
          onChanged={saved}
          allowRecovery={!dirty}
        />
      )}
      {(tab === 'periods' || tab === 'audit') && (
        <HistoryPanel
          key={`${id}:${tab}`}
          id={id}
          kind={tab}
          refresh={refresh}
          onPeriod={(p) => {
            setExtraPeriod(p)
            setQuery({ period: p.id, tab: 'usage' })
          }}
        />
      )}
    </div>
  )
}
