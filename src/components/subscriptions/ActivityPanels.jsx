import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { api } from '../../utils/api'
import {
  METRICS,
  PAGE_SIZE,
  buttonClass,
  inputClass,
  number,
  periodLabel,
  primaryClass,
  queryString,
  readResponse,
  useResource,
} from '../../utils/subscriptions'
import {
  Cell,
  DateCell,
  Empty,
  ErrorNotice,
  Loading,
  Modal,
  Pagination,
  Stat,
  Status,
  Table,
  UserCell,
} from './Shared'

function UsageBreakdown({ usage }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs py-3 min-w-52">
      {Object.entries(METRICS).map(([key, label]) => (
        <div key={key} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">
            {number(usage?.[key]?.used ?? 0)}{' '}
            <span className="text-muted-foreground">
              + {number(usage?.[key]?.reserved ?? 0)} reserved
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
export function UsersPanel({ id, periodId, refresh, onUser }) {
  const [filters, setFilters] = useState({ search: '', sort: 'tokens', page: 1 })
  const { data, loading, error } = useResource(
    `/admin/subscriptions/${id}/users?${queryString({ periodId, search: filters.search, sort: filters.sort, limit: PAGE_SIZE, offset: (filters.page - 1) * PAGE_SIZE })}`,
    refresh,
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          aria-label="Search users"
          className={inputClass}
          maxLength={200}
          placeholder="Find a user by name or email…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <select
          aria-label="Sort users"
          className={`${inputClass} sm:max-w-56`}
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
        >
          <option value="tokens">Most tokens</option>
          <option value="operations">Most operations</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Usage belongs to the person who performed the operation. Limits are shared by the
        organization. Former members with activity remain in the report.
      </p>
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            <Table
              headings={[
                'User',
                'Operations',
                'AI requests',
                'Tokens',
                'Last activity (UTC)',
                'Explore',
              ]}
            >
              {data?.users.map((row) => (
                <tr key={row.id}>
                  <Cell>
                    <UserCell row={row} onClick={() => onUser(row)} />
                    {!row.currentMember && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.userId ? 'Former member' : 'Deleted users (combined)'}
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-primary">
                        Usage by type
                      </summary>
                      <UsageBreakdown usage={row.usage} />
                    </details>
                  </Cell>
                  <Cell>
                    <p className="font-medium">{number(row.succeeded)} successful</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {number(row.reserved)} reserved · {number(row.failed)} failed
                    </p>
                  </Cell>
                  <Cell>
                    {number(row.requests)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {number(row.failedRequests)} failed
                    </p>
                  </Cell>
                  <Cell>
                    <p className="font-medium tabular-nums">{number(row.totalTokens)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {number(row.inputTokens)} in / {number(row.outputTokens)} out
                    </p>
                    {row.incompleteRequests > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        {number(row.incompleteRequests)} incomplete
                      </p>
                    )}
                  </Cell>
                  <Cell>
                    <DateCell value={row.lastActiveAt} />
                  </Cell>
                  <Cell>
                    <button
                      className={buttonClass}
                      aria-label={`View usage for ${row.name}`}
                      onClick={() => onUser(row)}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </Cell>
                </tr>
              ))}
            </Table>
            {!data?.users.length && <Empty>No users match this search.</Empty>}
            <Pagination
              page={filters.page}
              total={data?.total || 0}
              onPage={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )
      )}
    </div>
  )
}

export function ActivityPanel({
  id,
  kind,
  periodId,
  userId,
  refresh,
  onUser,
  onChanged,
  allowRecovery = true,
}) {
  const [filters, setFilters] = useState({ page: 1, metric: '', status: '' })
  const [recover, setRecover] = useState(null)
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState('failed')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const isAI = kind === 'usage'
  const { data, loading, error } = useResource(
    `/admin/subscriptions/${id}/${kind}?${queryString({ periodId, userId, metric: filters.metric, status: filters.status, limit: PAGE_SIZE, offset: (filters.page - 1) * PAGE_SIZE })}`,
    refresh,
  )
  const rows = isAI ? data?.requests : data?.operations
  async function resolveOperation(event) {
    event.preventDefault()
    setBusy(true)
    setActionError(null)
    try {
      await readResponse(
        await api.post(`/admin/subscriptions/${id}/operations/${recover.id}/resolve`, {
          outcome,
          reason,
        }),
      )
      setRecover(null)
      onChanged('Reserved operation resolved. Token history was preserved.')
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">
          Feature
          <select
            className={`${inputClass} mt-1`}
            value={filters.metric}
            onChange={(e) => setFilters((f) => ({ ...f, metric: e.target.value, page: 1 }))}
          >
            <option value="">All features</option>
            {Object.entries(METRICS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Status
          <select
            className={`${inputClass} mt-1`}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          >
            <option value="">All statuses</option>
            {(isAI ? ['running', 'succeeded', 'failed'] : ['reserved', 'succeeded', 'failed']).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            {isAI && (
              <>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Stat
                    label="AI requests · selected filters"
                    value={number(data?.summary?.requests)}
                  />
                  <Stat
                    label="Total tokens · selected filters"
                    value={number(data?.summary?.totalTokens)}
                    detail={`${number(data?.summary?.inputTokens)} input / ${number(data?.summary?.outputTokens)} output`}
                  />
                  <Stat
                    label="Incomplete usage reports"
                    value={number(data?.summary?.incompleteRequests)}
                    detail="Failed or unfinished calls may have additional unreported tokens."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cache tokens are included in input tokens. Token usage includes completed steps of
                  failed requests.
                </p>
              </>
            )}
            <Table
              headings={
                isAI
                  ? [
                      'Started (UTC)',
                      'User',
                      'Feature / model',
                      'Status',
                      'Input',
                      'Output',
                      'Total tokens',
                      'Details',
                    ]
                  : ['Started (UTC)', 'User', 'Operation', 'Status', 'Usage', 'Details']
              }
            >
              {rows?.map((row) => (
                <tr key={row.id}>
                  <Cell>
                    <DateCell value={row.createdAt} />
                  </Cell>
                  <Cell>
                    <UserCell
                      row={row}
                      onClick={() =>
                        onUser({
                          id: row.userId || 'deleted',
                          name: row.userName,
                          email: row.userEmail,
                        })
                      }
                    />
                  </Cell>
                  {isAI ? (
                    <>
                      <Cell>
                        <p className="font-medium whitespace-nowrap">
                          {METRICS[row.metric] || row.metric}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {row.provider} · {row.model}
                        </p>
                      </Cell>
                      <Cell>
                        <Status value={row.status} />
                        {!row.usageComplete && (
                          <p className="text-xs text-amber-700 mt-1">Usage incomplete</p>
                        )}
                      </Cell>
                      <Cell className="tabular-nums">{number(row.inputTokens)}</Cell>
                      <Cell className="tabular-nums">{number(row.outputTokens)}</Cell>
                      <Cell className="font-medium tabular-nums">{number(row.totalTokens)}</Cell>
                      <Cell>
                        <details>
                          <summary className="text-primary cursor-pointer">Details</summary>
                          <dl className="space-y-1 text-xs mt-2 min-w-44">
                            <dt>Steps / tool calls</dt>
                            <dd>
                              {row.steps} / {row.toolCalls}
                            </dd>
                            <dt>Cache read / write</dt>
                            <dd>
                              {number(row.cacheReadTokens)} / {number(row.cacheWriteTokens)}
                            </dd>
                            <dt>Finished (UTC)</dt>
                            <dd>
                              <DateCell value={row.finishedAt} />
                            </dd>
                            <dt>Operation</dt>
                            <dd className="break-all">{row.operationId}</dd>
                            <dt>Request</dt>
                            <dd className="break-all">{row.id}</dd>
                            <dt>Route</dt>
                            <dd>{row.route}</dd>
                            {row.errorCode && <dd className="text-destructive">{row.errorCode}</dd>}
                          </dl>
                        </details>
                      </Cell>
                    </>
                  ) : (
                    <>
                      <Cell>
                        <span className="text-xs whitespace-nowrap">{row.route}</span>
                      </Cell>
                      <Cell>
                        <Status value={row.status} />
                      </Cell>
                      <Cell>
                        <div className="min-w-36 space-y-1">
                          {Object.entries(row.charges).map(([key, count]) => (
                            <p key={key} className="text-xs">
                              {METRICS[key] || key}: <strong>{number(count)}</strong>
                            </p>
                          ))}
                          {row.status === 'failed' && (
                            <p className="text-xs text-muted-foreground">Allowance released</p>
                          )}
                        </div>
                      </Cell>
                      <Cell>
                        <details>
                          <summary className="text-primary cursor-pointer">Details</summary>
                          <div className="text-xs mt-2 space-y-2 max-w-56">
                            <p className="break-all">ID: {row.id}</p>
                            {row.savedEntityId && (
                              <p className="break-all">Saved record: {row.savedEntityId}</p>
                            )}
                            <p>
                              Finished: <DateCell value={row.finishedAt} />
                            </p>
                          </div>
                        </details>
                        {row.status === 'reserved' &&
                          Date.now() - new Date(row.createdAt).getTime() > 86400000 && (
                            <button
                              className="text-xs text-primary mt-3 underline disabled:opacity-50"
                              disabled={!allowRecovery}
                              title={
                                !allowRecovery
                                  ? 'Save or reset your settings draft first'
                                  : undefined
                              }
                              onClick={() => {
                                setRecover(row)
                                setReason('')
                                setOutcome('failed')
                                setActionError(null)
                              }}
                            >
                              Resolve stale reservation
                            </button>
                          )}
                      </Cell>
                    </>
                  )}
                </tr>
              ))}
            </Table>
            {!rows?.length && <Empty />}
            <Pagination
              page={filters.page}
              total={isAI ? data?.summary?.requests || 0 : data?.total || 0}
              onPage={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )
      )}
      {recover && (
        <Modal title="Resolve stale reservation" busy={busy} onClose={() => setRecover(null)}>
          <form onSubmit={resolveOperation} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Only resolve this after checking what happened. Releasing allowance does not remove
              recorded token usage.
            </p>
            <label className="block text-sm">
              Outcome
              <select
                className={`${inputClass} mt-1`}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={busy}
              >
                <option value="failed">Release allowance — operation failed</option>
                <option value="succeeded">Keep allowance charged — operation completed</option>
              </select>
            </label>
            <label className="block text-sm">
              Reason
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${inputClass} mt-1`}
                disabled={busy}
              />
            </label>
            <ErrorNotice error={actionError} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() => setRecover(null)}
              >
                Cancel
              </button>
              <button className={primaryClass} disabled={busy || reason.trim().length < 5}>
                {busy ? 'Resolving…' : 'Confirm resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function ChangeDescription({ event }) {
  if (event.action === 'operation_resolved')
    return (
      <div className="text-sm">
        <p>{event.after?.outcome === 'failed' ? 'Allowance released' : 'Allowance charged'}</p>
        <p className="text-muted-foreground text-xs mt-1">{event.after?.reason}</p>
      </div>
    )
  const before = event.before || {},
    after = event.after || {},
    changes = []
  for (const [key, label] of [
    ['blocked', 'Organization paused'],
    ['blocked_reason', 'Reason'],
    ['anchor_at', 'Start'],
    ['ends_at', 'End'],
  ]) {
    if (before[key] !== after[key])
      changes.push(`${label}: ${String(before[key] ?? 'None')} → ${String(after[key] ?? 'None')}`)
  }
  for (const [key, label] of Object.entries(METRICS)) {
    if (before.limits?.[key] !== after.limits?.[key])
      changes.push(
        `${label}: ${before.limits?.[key] ?? 'Unlimited'} → ${after.limits?.[key] ?? 'Unlimited'}`,
      )
    if (!!before.blocked_features?.[key] !== !!after.blocked_features?.[key])
      changes.push(`${label}: ${after.blocked_features?.[key] ? 'blocked' : 'unblocked'}`)
  }
  return (
    <ul className="space-y-1 text-xs max-w-xl">
      {changes.length ? (
        changes.map((line, i) => (
          <li key={i} className="break-words">
            {line}
          </li>
        ))
      ) : (
        <li>Settings updated</li>
      )}
    </ul>
  )
}
export function HistoryPanel({ id, kind, refresh, onPeriod }) {
  const [page, setPage] = useState(1)
  const { data, error, loading } = useResource(
    `/admin/subscriptions/${id}/${kind}?${queryString({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })}`,
    refresh,
  )
  const periods = kind === 'periods',
    rows = periods ? data?.periods : data?.events
  return (
    <div className="space-y-4">
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            <Table
              headings={
                periods
                  ? ['Period (UTC)', 'Allowances & usage', 'Explore']
                  : ['Changed (UTC)', 'Administrator', 'Changes']
              }
            >
              {rows?.map((row) => (
                <tr key={row.id}>
                  {periods ? (
                    <>
                      <Cell>
                        <p className="text-xs min-w-56">{periodLabel(row)}</p>
                      </Cell>
                      <Cell>
                        <details>
                          <summary className="text-primary cursor-pointer text-sm">
                            View all allowances
                          </summary>
                          <div className="py-2 space-y-1 min-w-60">
                            {Object.entries(METRICS).map(([key, label]) => (
                              <p key={key} className="text-xs">
                                {label}: {number(row.usage?.[key]?.used ?? 0)} used +{' '}
                                {number(row.usage?.[key]?.reserved ?? 0)} reserved /{' '}
                                {row.limits[key] === null ? 'Unlimited' : number(row.limits[key])}
                              </p>
                            ))}
                          </div>
                        </details>
                      </Cell>
                      <Cell>
                        <button className={buttonClass} onClick={() => onPeriod(row)}>
                          View activity <ArrowRight size={16} />
                        </button>
                      </Cell>
                    </>
                  ) : (
                    <>
                      <Cell>
                        <DateCell value={row.createdAt} />
                      </Cell>
                      <Cell>
                        <UserCell row={row} />
                      </Cell>
                      <Cell>
                        <ChangeDescription event={row} />
                      </Cell>
                    </>
                  )}
                </tr>
              ))}
            </Table>
            {!rows?.length && (
              <Empty>{periods ? 'No periods yet.' : 'No administrative changes yet.'}</Empty>
            )}
            <Pagination total={data?.total || 0} page={page} onPage={setPage} />
          </>
        )
      )}
    </div>
  )
}
