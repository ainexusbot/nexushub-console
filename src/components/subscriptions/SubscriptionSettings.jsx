import { useEffect, useState } from 'react'
import { Save, Shield } from 'lucide-react'
import { api } from '../../utils/api'
import {
  ANALYSES,
  METRICS,
  buttonClass,
  inputClass,
  number,
  primaryClass,
  readResponse,
} from '../../utils/subscriptions'
import { Cell, ErrorNotice, Modal, Table } from './Shared'

const utcInput = (value) => (value ? new Date(value).toISOString().slice(0, 19) : '')
function draftFrom(sub) {
  return {
    anchor: utcInput(sub.anchorAt),
    end: utcInput(sub.endsAt),
    indefinite: !sub.endsAt,
    blocked: sub.blocked,
    reason: sub.blockedReason || '',
    features: Object.fromEntries(
      sub.features.map((f) => [
        f.metric,
        { limit: String(f.limit ?? 100), unlimited: f.limit === null, blocked: f.blocked },
      ]),
    ),
  }
}
function buildPatch(sub, draft) {
  const patch = { revision: sub.revision }
  const limits = {},
    blockedFeatures = {}
  for (const f of sub.features) {
    const value = draft.features[f.metric]
    if (!value.unlimited && (!/^\d+$/.test(value.limit) || Number(value.limit) > 1_000_000_000))
      throw new Error(`${METRICS[f.metric]}: enter a whole number from 0 to 1,000,000,000.`)
    const limit = value.unlimited ? null : Number(value.limit)
    if (limit !== f.limit) limits[f.metric] = limit
    if (value.blocked !== f.blocked) blockedFeatures[f.metric] = value.blocked
  }
  if (Object.keys(limits).length) patch.limits = limits
  if (Object.keys(blockedFeatures).length) patch.blockedFeatures = blockedFeatures
  if (draft.blocked !== sub.blocked) patch.blocked = draft.blocked
  if (draft.reason !== (sub.blockedReason || '')) patch.blockedReason = draft.reason
  if (draft.anchor !== utcInput(sub.anchorAt))
    patch.anchorAt = new Date(draft.anchor + 'Z').toISOString()
  const end = draft.indefinite ? null : draft.end
  if (end !== (sub.endsAt ? utcInput(sub.endsAt) : null))
    patch.endsAt = end ? new Date(end + 'Z').toISOString() : null
  if (
    !draft.indefinite &&
    (!draft.end || new Date(draft.end + 'Z') <= new Date(draft.anchor + 'Z'))
  )
    throw new Error('The end date must be later than the start date.')
  return patch
}

export default function SubscriptionSettings({ subscription, onSaved, onDirtyChange, onReload }) {
  const [draft, setDraft] = useState(() => draftFrom(subscription))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(subscription))
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const unload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const navigate = (event) => {
      if (
        event.target.closest?.('a[href]') &&
        !window.confirm('Leave this page and discard unsaved subscription changes?')
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigate, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('click', navigate, true)
    }
  }, [dirty])
  function featureChange(metric, changes) {
    setDraft((d) => ({
      ...d,
      features: { ...d.features, [metric]: { ...d.features[metric], ...changes } },
    }))
  }
  async function save(patch) {
    setBusy(true)
    setError(null)
    try {
      await readResponse(
        await api.patch(`/admin/subscriptions/${subscription.organizationId}`, patch),
      )
      setPending(null)
      onSaved('Subscription settings saved.')
    } catch (err) {
      setPending(null)
      setError(err)
    } finally {
      setBusy(false)
    }
  }
  function submit(event) {
    event.preventDefault()
    setError(null)
    try {
      const patch = buildPatch(subscription, draft)
      if (Object.keys(patch).length === 1) return
      if (patch.blocked === true || Object.values(patch.blockedFeatures || {}).some(Boolean))
        setPending(patch)
      else save(patch)
    } catch (err) {
      setError(err)
    }
  }
  const allAnalysesBlocked = ANALYSES.every((key) => draft.features[key]?.blocked)
  return (
    <form onSubmit={submit} className="space-y-5">
      <ErrorNotice error={error} />
      {error?.code === 'SUBSCRIPTION_CONFLICT' && (
        <button type="button" className={buttonClass} onClick={onReload}>
          Discard draft and load latest settings
        </button>
      )}
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Billing period</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly allowances renew on the original start day. All dates below use UTC.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mt-4">
            <label className="text-sm">
              Start date & time (UTC)
              <input
                aria-label="Start date & time (UTC)"
                type="datetime-local"
                step="1"
                required
                disabled={subscription.canEditAnchor === false}
                value={draft.anchor}
                onChange={(e) => setDraft((d) => ({ ...d, anchor: e.target.value }))}
                className={`${inputClass} mt-1.5`}
              />
              <span className="text-xs text-muted-foreground block mt-1">
                {subscription.canEditAnchor === false
                  ? 'Start date is locked because this organization has usage history.'
                  : 'Set the start before the first operation.'}
              </span>
            </label>
            <div>
              <label className="text-sm">
                End date & time (UTC)
                <input
                  aria-label="End date & time (UTC)"
                  type="datetime-local"
                  step="1"
                  disabled={draft.indefinite}
                  required={!draft.indefinite}
                  value={draft.end}
                  onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={draft.indefinite}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      indefinite: e.target.checked,
                      end: d.end || utcInput(subscription.period.endsAt),
                    }))
                  }
                />{' '}
                Renew monthly without an end date
              </label>
              <button
                type="button"
                className="text-xs text-primary mt-2 hover:underline"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    indefinite: false,
                    end: utcInput(subscription.period.endsAt),
                  }))
                }
              >
                End after the current period
              </button>
            </div>
          </div>
        </div>
        <div
          className={`rounded-xl border p-5 ${draft.blocked ? 'border-red-200 bg-red-50/50' : 'border-border bg-card'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold flex gap-2 items-center">
                <Shield size={18} /> Organization access
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pause all new creations and AI generations. Existing data stays readable.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
              <input
                type="checkbox"
                checked={draft.blocked}
                onChange={(e) => setDraft((d) => ({ ...d, blocked: e.target.checked }))}
              />{' '}
              Paused
            </label>
          </div>
          <label className="block text-sm mt-4">
            Reason (optional)
            <input
              maxLength={1000}
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="Why is this subscription paused?"
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>
        <div>
          <div className="flex flex-wrap justify-between gap-3 items-center mb-3">
            <div>
              <h2 className="font-semibold">Allowances & feature access</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Shared across the organization. Reserved operations count against availability.
              </p>
            </div>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  features: Object.fromEntries(
                    Object.entries(d.features).map(([key, value]) => [
                      key,
                      ANALYSES.includes(key) ? { ...value, blocked: !allAnalysesBlocked } : value,
                    ]),
                  ),
                }))
              }
            >
              {allAnalysesBlocked ? 'Unblock all analyses' : 'Block all analyses'}
            </button>
          </div>
          <Table
            headings={['Feature', 'Used', 'Reserved', 'Monthly limit', 'Unlimited', 'Blocked']}
          >
            {subscription.features.map((f) => (
              <tr key={f.metric}>
                <Cell>
                  <p className="font-medium min-w-36">{METRICS[f.metric]}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.remaining === null ? 'Unlimited' : `${number(f.remaining)} available`} now
                  </p>
                </Cell>
                <Cell>{number(f.used)}</Cell>
                <Cell>{number(f.reserved)}</Cell>
                <Cell>
                  <input
                    aria-label={`${METRICS[f.metric]} monthly limit`}
                    type="number"
                    min="0"
                    max="1000000000"
                    step="1"
                    required
                    disabled={draft.features[f.metric].unlimited}
                    className={`${inputClass} min-w-28 max-w-40`}
                    value={draft.features[f.metric].limit}
                    onChange={(e) => featureChange(f.metric, { limit: e.target.value })}
                  />
                </Cell>
                <Cell>
                  <input
                    aria-label={`${METRICS[f.metric]} unlimited`}
                    type="checkbox"
                    checked={draft.features[f.metric].unlimited}
                    onChange={(e) => featureChange(f.metric, { unlimited: e.target.checked })}
                  />
                </Cell>
                <Cell>
                  <input
                    aria-label={`${METRICS[f.metric]} blocked`}
                    type="checkbox"
                    checked={draft.features[f.metric].blocked}
                    onChange={(e) => featureChange(f.metric, { blocked: e.target.checked })}
                  />
                </Cell>
              </tr>
            ))}
          </Table>
          <p className="text-xs text-muted-foreground mt-2">
            0 stops new operations. Deleting a record does not restore allowance. A saved generation
            is not charged twice.
          </p>
        </div>
        <div className="sticky bottom-0 rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {dirty
              ? 'Unsaved changes — access changes apply when saved.'
              : 'Settings are up to date.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={!dirty}
              onClick={() => {
                setDraft(draftFrom(subscription))
                setError(null)
              }}
            >
              Reset
            </button>
            <button
              type="submit"
              className={primaryClass}
              disabled={!dirty || (!!error?.code && error.code === 'SUBSCRIPTION_CONFLICT')}
            >
              <Save size={16} />
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </fieldset>
      {pending && (
        <Modal title="Confirm access restrictions" busy={busy} onClose={() => setPending(null)}>
          <p className="text-sm text-muted-foreground">
            {pending.blocked
              ? 'All new creations and AI generations will be paused for this organization.'
              : `These features will be blocked: ${Object.entries(pending.blockedFeatures || {})
                  .filter(([, value]) => value)
                  .map(([key]) => METRICS[key])
                  .join(', ')}.`}{' '}
            Already running provider calls may finish.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              className={buttonClass}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              className={primaryClass}
              onClick={() => save(pending)}
            >
              {busy ? 'Saving…' : 'Apply changes'}
            </button>
          </div>
        </Modal>
      )}
    </form>
  )
}
