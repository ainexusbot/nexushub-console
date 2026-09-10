import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Gauge, RefreshCw, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  METRICS,
  PAGE_SIZE,
  buttonClass,
  inputClass,
  number,
  periodLabel,
  queryString,
  useResource,
} from '../../utils/subscriptions'
import {
  Cell,
  Empty,
  ErrorNotice,
  Loading,
  Pagination,
  Status,
  Table,
} from '../../components/subscriptions/Shared'

export default function SubscriptionsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ search: '', page: 1 })
  const [metric, setMetric] = useState('emails')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: searchInput.trim(), page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [searchInput])
  const { data, error, loading } = useResource(
    isAdmin
      ? `/admin/subscriptions?${queryString({ search: filters.search, limit: PAGE_SIZE, offset: (filters.page - 1) * PAGE_SIZE })}`
      : null,
    refresh,
  )
  if (authLoading) return <Loading />
  if (!isAdmin) return <Navigate to="/" replace />
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-3">
          <div className="rounded-xl bg-primary/10 p-3 h-fit">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="mt-1 text-muted-foreground">
              Control organization limits and see who uses them.
            </p>
          </div>
        </div>
        <button
          aria-label="Refresh subscriptions"
          className={buttonClass}
          onClick={() => setRefresh((x) => x + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-4">
        <label className="flex-1">
          <span className="text-xs text-muted-foreground block mb-1.5">Organization</span>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              aria-label="Search organizations"
              placeholder="Search by name…"
              maxLength={200}
              className={`${inputClass} pl-9`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </label>
        <label className="sm:w-60">
          <span className="text-xs text-muted-foreground block mb-1.5">Show usage for</span>
          <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {Object.entries(METRICS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice error={error} onRetry={() => setRefresh((x) => x + 1)} />
      {loading ? (
        <Loading />
      ) : (
        !error && (
          <>
            <Table
              headings={[
                'Organization',
                'Status',
                'Current period',
                METRICS[metric],
                'AI tokens',
                'Manage',
              ]}
            >
              {data?.subscriptions.map((sub) => {
                const feature = sub.features.find((f) => f.metric === metric)
                const percent = feature?.limit
                  ? Math.min(100, ((feature.used + feature.reserved) / feature.limit) * 100)
                  : 0
                return (
                  <tr key={sub.organizationId} className="hover:bg-muted/30">
                    <Cell>
                      <Link
                        to={`/subscriptions/${sub.organizationId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {sub.organization.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sub.features.filter((f) => f.blocked).length} features blocked
                      </p>
                    </Cell>
                    <Cell>
                      <Status value={sub.status} />
                    </Cell>
                    <Cell>
                      <span className="text-xs text-muted-foreground block min-w-40 max-w-56">
                        {periodLabel(sub.period)}
                      </span>
                    </Cell>
                    <Cell>
                      <div className="min-w-40">
                        <span className="tabular-nums font-medium">
                          {number(feature?.used)} /{' '}
                          {feature?.limit === null ? 'Unlimited' : number(feature?.limit)}
                        </span>
                        {feature?.blocked && (
                          <span className="ml-2 text-xs text-destructive">Blocked</span>
                        )}
                        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full ${feature?.remaining === 0 ? 'bg-red-500' : 'bg-primary'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {number(feature?.reserved)} reserved ·{' '}
                          {feature?.remaining === null ? 'Unlimited' : number(feature?.remaining)}{' '}
                          available
                        </p>
                      </div>
                    </Cell>
                    <Cell>
                      <p className="tabular-nums font-medium">{number(sub.tokens?.totalTokens)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {number(sub.tokens?.requests)} requests
                        {sub.tokens?.incompleteRequests > 0 ? ' · Partial usage' : ''}
                      </p>
                    </Cell>
                    <Cell>
                      <Link
                        aria-label={`Manage ${sub.organization.name}`}
                        to={`/subscriptions/${sub.organizationId}`}
                        className={buttonClass}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </Cell>
                  </tr>
                )
              })}
            </Table>
            {!data?.subscriptions.length && <Empty>No organizations found.</Empty>}
            <Pagination
              total={data?.total || 0}
              page={filters.page}
              onPage={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )
      )}
    </div>
  )
}
