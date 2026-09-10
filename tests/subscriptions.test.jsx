import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../src/context/AuthContext'
import SubscriptionsPage from '../src/pages/subscriptions/SubscriptionsPage'
import SubscriptionDetailPage from '../src/pages/subscriptions/SubscriptionDetailPage'
import { useResource, number } from '../src/utils/subscriptions'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://test.invalid' })
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
})
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false
}
window.confirm = () => true
const { render, screen, fireEvent, waitFor, cleanup, within } =
  await import('@testing-library/react')
const orgId = '11111111-1111-4111-8111-111111111111',
  userId = '22222222-2222-4222-8222-222222222222',
  periodId = '33333333-3333-4333-8333-333333333333'
const keys = [
  'companies',
  'people',
  'emails',
  'company_analyses',
  'person_analyses',
  'batch_analyses',
  'company_batches',
  'templates',
]
let state, requests, rejectPatch, rejectList
function reply(data, status = 200) {
  return { ok: status < 400, status, json: async () => structuredClone(data) }
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('nexushub_token', 'test-only')
  localStorage.setItem(
    'nexushub_user',
    JSON.stringify({ role: 'admin', email: 'admin@example.test' }),
  )
  requests = []
  rejectPatch = false
  rejectList = false
  state = {
    organizationId: orgId,
    canEditAnchor: false,
    anchorAt: '2026-09-05T00:00:00.000Z',
    endsAt: null,
    blocked: false,
    blockedReason: '',
    revision: 7,
    status: 'active',
    period: {
      id: periodId,
      startsAt: '2026-09-05T00:00:00.000Z',
      endsAt: '2026-10-05T00:00:00.000Z',
    },
    features: keys.map((metric) => ({
      metric,
      limit: 100,
      used: 19,
      reserved: 1,
      remaining: 80,
      blocked: false,
    })),
    tokens: {
      inputTokens: '100000',
      outputTokens: '23000',
      totalTokens: '123000',
      requests: 15,
      incompleteRequests: 1,
    },
  }
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url),
      path = parsed.pathname.replace('/api', ''),
      query = Object.fromEntries(parsed.searchParams),
      method = options.method || 'GET',
      body = options.body ? JSON.parse(options.body) : null
    requests.push({ path, query, method, body })
    if (path === '/admin/subscriptions')
      return rejectList
        ? reply({ error: 'Server unavailable' }, 503)
        : reply({
            subscriptions: query.search
              ? []
              : [{ ...state, organization: { id: orgId, name: 'Northstar Labs' } }],
            total: query.search ? 0 : 1,
          })
    if (path === `/organizations/${orgId}`)
      return reply({ organization: { id: orgId, name: 'Northstar Labs' } })
    const base = `/admin/subscriptions/${orgId}`
    if (path === base && method === 'PATCH') {
      if (rejectPatch || body.revision !== state.revision)
        return reply(
          { code: 'SUBSCRIPTION_CONFLICT', error: 'Another administrator changed these settings.' },
          409,
        )
      state.revision++
      if ('blocked' in body) state.blocked = body.blocked
      if ('blockedReason' in body) state.blockedReason = body.blockedReason
      for (const f of state.features) {
        if (body.limits && f.metric in body.limits) f.limit = body.limits[f.metric]
        if (body.blockedFeatures && f.metric in body.blockedFeatures)
          f.blocked = body.blockedFeatures[f.metric]
      }
      return reply({ subscription: state })
    }
    if (path === base) return reply({ subscription: state })
    if (path === base + '/periods')
      return reply({
        periods: [
          {
            ...state.period,
            limits: Object.fromEntries(keys.map((k) => [k, 100])),
            usage: { emails: { used: 19, reserved: 1 } },
          },
        ],
        total: 1,
      })
    if (path === base + '/users')
      return reply({
        users: [
          {
            id: userId,
            userId,
            name: 'Alex Morgan',
            email: 'alex@example.test',
            currentMember: true,
            operations: 5,
            succeeded: 4,
            failed: 1,
            reserved: 0,
            requests: 6,
            failedRequests: 1,
            incompleteRequests: 1,
            inputTokens: '1000',
            outputTokens: '200',
            totalTokens: '1200',
            lastActiveAt: '2026-09-06T07:00:00Z',
            usage: { emails: { used: 4, reserved: 0 } },
          },
        ],
        total: 1,
      })
    if (path === base + '/usage')
      return reply({
        requests: [],
        summary: {
          requests: 0,
          totalTokens: '0',
          inputTokens: '0',
          outputTokens: '0',
          incompleteRequests: 0,
        },
      })
    if (path === base + '/operations')
      return reply({
        operations: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            userId,
            userName: 'Alex Morgan',
            route: 'POST /api/generate',
            status: 'reserved',
            charges: { emails: 1 },
            createdAt: '2020-01-01T00:00:00Z',
          },
        ],
        total: 1,
      })
    if (path.endsWith('/resolve')) return reply({ ok: true })
    if (path === base + '/audit') return reply({ events: [], total: 0 })
    throw new Error(`Unexpected request ${method} ${path}`)
  }
})
afterEach(() => cleanup())
function mount(path = '/subscriptions') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>Dashboard destination</div>} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}
async function detail() {
  mount(`/subscriptions/${orgId}`)
  await screen.findByRole('heading', { name: 'Billing period' })
}

test('organization list renders actual availability, opens details and locks used start dates', async () => {
  mount()
  await screen.findByRole('link', { name: 'Northstar Labs' })
  assert(screen.getByText('1 reserved · 80 available'))
  fireEvent.click(screen.getByRole('link', { name: 'Northstar Labs' }))
  await screen.findByRole('heading', { name: 'Billing period' })
  assert.equal(screen.getByLabelText('Start date & time (UTC)').disabled, true)
  assert.equal(screen.getByLabelText('Emails & content monthly limit').value, '100')
})
test('saving a changed limit sends only the change and original revision', async () => {
  await detail()
  fireEvent.change(screen.getByLabelText('Emails & content monthly limit'), {
    target: { value: '250' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByText('Subscription settings saved.')
  assert.deepEqual(requests.find((r) => r.method === 'PATCH').body, {
    revision: 7,
    limits: { emails: 250 },
  })
})
test('unlimited is null and explicit blocking requires confirmation', async () => {
  await detail()
  fireEvent.click(screen.getByLabelText('Companies unlimited'))
  fireEvent.click(screen.getByRole('button', { name: 'Block all analyses' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  const dialog = await screen.findByRole('dialog', { name: 'Confirm access restrictions' })
  assert.equal(requests.filter((r) => r.method === 'PATCH').length, 0)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Apply changes' }))
  await screen.findByText('Subscription settings saved.')
  assert.deepEqual(requests.find((r) => r.method === 'PATCH').body, {
    revision: 7,
    limits: { companies: null },
    blockedFeatures: { company_analyses: true, person_analyses: true, batch_analyses: true },
  })
})
test('conflicting admin edit preserves draft and disables stale save', async () => {
  rejectPatch = true
  await detail()
  fireEvent.change(screen.getByLabelText('Emails & content monthly limit'), {
    target: { value: '275' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByText('Another administrator changed these settings.')
  assert.equal(screen.getByLabelText('Emails & content monthly limit').value, '275')
  assert.equal(screen.getByRole('button', { name: 'Save changes' }).disabled, true)
  assert(screen.getByRole('button', { name: 'Discard draft and load latest settings' }))
})
test('draft survives tab changes; individual user selection filters both journals', async () => {
  await detail()
  fireEvent.change(screen.getByLabelText('Emails & content monthly limit'), {
    target: { value: '205' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Users', exact: true }))
  await screen.findByRole('button', { name: 'View usage for Alex Morgan' })
  fireEvent.click(screen.getByRole('button', { name: 'View usage for Alex Morgan' }))
  await screen.findByText('User: Alex Morgan')
  await waitFor(() =>
    assert(
      requests.some(
        (r) =>
          r.path.endsWith('/usage') && r.query.userId === userId && r.query.periodId === periodId,
      ),
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Operations', exact: true }))
  await screen.findByText('POST /api/generate')
  assert(requests.some((r) => r.path.endsWith('/operations') && r.query.userId === userId))
  fireEvent.click(screen.getByRole('button', { name: /Limits & access/ }))
  assert.equal(screen.getByLabelText('Emails & content monthly limit').value, '205')
})
test('all-time period and clear-user action remove filters from requests', async () => {
  mount(`/subscriptions/${orgId}?tab=usage&userId=${userId}&userName=Alex`)
  await screen.findByText('User: Alex')
  fireEvent.change(screen.getByLabelText('Activity period'), { target: { value: 'all' } })
  fireEvent.click(screen.getByRole('button', { name: 'Clear user filter' }))
  await waitFor(() =>
    assert(requests.some((r) => r.path.endsWith('/usage') && !r.query.userId && !r.query.periodId)),
  )
})
test('stale-reservation resolution sends an explicit outcome and reason', async () => {
  mount(`/subscriptions/${orgId}?tab=operations`)
  fireEvent.click(await screen.findByRole('button', { name: 'Resolve stale reservation' }))
  const dialog = await screen.findByRole('dialog', { name: 'Resolve stale reservation' })
  fireEvent.change(within(dialog).getByLabelText('Reason'), {
    target: { value: 'Worker failure confirmed by administrator' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm resolution' }))
  await screen.findByText('Reserved operation resolved. Token history was preserved.')
  assert.deepEqual(requests.find((r) => r.path.endsWith('/resolve')).body, {
    outcome: 'failed',
    reason: 'Worker failure confirmed by administrator',
  })
})
test('API error is visible and is not rendered as a successful empty organization list', async () => {
  rejectList = true
  mount()
  await screen.findByRole('alert')
  assert(screen.getByText('Server unavailable'))
  assert.equal(screen.queryByText('No organizations found.'), null)
})
test('non-admin cannot load the subscription routes', async () => {
  localStorage.setItem('nexushub_user', JSON.stringify({ role: 'manager' }))
  mount(`/subscriptions/${orgId}`)
  await screen.findByText('Dashboard destination')
  assert.equal(requests.length, 0)
})
test('large token counts retain precision', () => {
  assert.equal(number('9007199254740993'), '9,007,199,254,740,993')
})
test('changing filters ignores an older slow response', async () => {
  const pending = {}
  globalThis.fetch = async (url) =>
    new Promise((resolve) => {
      pending[new URL(url).pathname] = resolve
    })
  function Probe({ endpoint }) {
    const resource = useResource(endpoint)
    return <div>{resource.data?.value || 'Loading'}</div>
  }
  const view = render(<Probe endpoint="/first" />)
  await waitFor(() => assert(pending['/api/first']))
  view.rerender(<Probe endpoint="/second" />)
  await waitFor(() => assert(pending['/api/second']))
  pending['/api/second'](reply({ value: 'Latest result' }))
  await screen.findByText('Latest result')
  pending['/api/first'](reply({ value: 'Outdated result' }))
  await waitFor(() => assert.equal(screen.queryByText('Outdated result'), null))
})
