import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  LifeBuoy,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { api, formatDate, formatRelativeTime, readError } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useSupportEvents } from '../hooks/useSupportEvents'

const PAGE_SIZE = 20

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_STYLES = {
  open: 'bg-primary/10 text-primary',
  pending: 'bg-warning/15 text-warning',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_STYLES = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-destructive/10 text-destructive',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
      {priority}
    </span>
  )
}

function TicketRow({ ticket, active, onClick }) {
  const unread = ticket.unreadCount > 0
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
        active ? 'bg-primary/5' : 'hover:bg-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm truncate ${unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
            {ticket.subject}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 shrink-0" />
            {ticket.organizationName || 'Unknown organization'}
          </p>
        </div>
        {unread && (
          <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
            {ticket.unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {formatRelativeTime(ticket.lastMessageAt || ticket.createdAt)}
        </span>
      </div>
    </button>
  )
}

function MessageBubble({ message }) {
  const isAdmin = message.senderType === 'admin'
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isAdmin
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
      }`}>
        <div className={`flex items-center gap-1.5 text-xs mb-1 ${isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {isAdmin && <ShieldCheck className="w-3 h-3" />}
          <span className="font-medium">{message.senderName || (isAdmin ? 'Admin' : 'Client')}</span>
          <span>·</span>
          <span>{formatRelativeTime(message.createdAt)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const { user } = useAuth()

  const [stats, setStats] = useState(null)
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketError, setTicketError] = useState(null)

  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const messagesEndRef = useRef(null)

  // Debounce the free-text search like the other admin list pages.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/support/tickets/stats')
      if (response.ok) setStats(await response.json())
    } catch {
      // Non-critical — the counters just stay stale until the next refresh.
    }
  }, [])

  const fetchTickets = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      })
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const response = await api.get(`/admin/support/tickets?${params.toString()}`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to load tickets'))
      const data = await response.json()
      setTickets(data.tickets || [])
      setTotal(data.total || 0)
    } catch (err) {
      setListError(err.message)
    } finally {
      setListLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const fetchTicket = useCallback(async (id) => {
    setTicketLoading(true)
    setTicketError(null)
    try {
      const response = await api.get(`/admin/support/tickets/${id}`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to load the ticket'))
      const data = await response.json()
      setTicket(data.ticket)
    } catch (err) {
      setTicketError(err.message)
    } finally {
      setTicketLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) fetchTicket(selectedId)
    else setTicket(null)
  }, [selectedId, fetchTicket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages?.length])

  // Live updates for the list: a new ticket from any organization, or any
  // ticket getting a new message / status change.
  useSupportEvents('/admin/support-sse/tickets', useMemo(() => ({
    new_ticket: () => {
      fetchStats()
      fetchTickets()
    },
    ticket_updated: (data) => {
      fetchStats()
      fetchTickets()
      if (data?.ticketId && data.ticketId === selectedId) fetchTicket(selectedId)
    },
  }), [fetchStats, fetchTickets, fetchTicket, selectedId]))

  // Live updates for the open ticket: append incoming client messages
  // without waiting for the list-level refresh above.
  useSupportEvents(selectedId ? `/admin/support-sse/tickets/${selectedId}` : null, useMemo(() => ({
    new_message: (data) => {
      if (!data?.message) return
      setTicket((prev) => {
        if (!prev || prev.id !== selectedId) return prev
        if (prev.messages?.some((m) => m.id === data.message.id)) return prev
        return { ...prev, messages: [...(prev.messages || []), data.message] }
      })
    },
  }), [selectedId]))

  const handleSend = async (event) => {
    event.preventDefault()
    const message = replyText.trim()
    if (!message || !selectedId || sending) return
    setSending(true)
    try {
      const response = await api.post(`/admin/support/tickets/${selectedId}/messages`, { message })
      if (!response.ok) throw new Error(await readError(response, 'Failed to send the reply'))
      const data = await response.json()
      setTicket((prev) => (prev ? { ...prev, ...data.ticket, messages: [...(prev.messages || []), data.message] } : prev))
      setReplyText('')
      fetchTickets()
      fetchStats()
    } catch (err) {
      setTicketError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status) => {
    if (!selectedId || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const response = await api.patch(`/admin/support/tickets/${selectedId}`, { status })
      if (!response.ok) throw new Error(await readError(response, 'Failed to update the ticket'))
      const data = await response.json()
      setTicket((prev) => (prev ? { ...prev, ...data.ticket } : prev))
      fetchTickets()
      fetchStats()
    } catch (err) {
      setTicketError(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePriorityChange = async (priority) => {
    if (!selectedId || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const response = await api.patch(`/admin/support/tickets/${selectedId}`, { priority })
      if (!response.ok) throw new Error(await readError(response, 'Failed to update the ticket'))
      const data = await response.json()
      setTicket((prev) => (prev ? { ...prev, ...data.ticket } : prev))
      fetchTickets()
    } catch (err) {
      setTicketError(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId || deleting) return
    if (!window.confirm('Delete this ticket and its whole conversation? This cannot be undone.')) return
    setDeleting(true)
    try {
      const response = await api.delete(`/admin/support/tickets/${selectedId}`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to delete the ticket'))
      setSelectedId(null)
      setTicket(null)
      fetchTickets()
      fetchStats()
    } catch (err) {
      setTicketError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <LifeBuoy className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground mt-1">
            Chat with client organizations — replies deliver in real time on their side too.
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'unanswered', label: 'Needs reply', value: stats?.unanswered },
          { key: 'open', label: 'Open', value: stats?.open },
          { key: 'pending', label: 'Pending', value: stats?.pending },
          { key: 'resolved', label: 'Resolved', value: stats?.resolved },
          { key: 'closed', label: 'Closed', value: stats?.closed },
        ].map((item) => (
          <div key={item.key} className="bg-card rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{item.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-19rem)] min-h-[28rem]">
          {/* Ticket list */}
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0">
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by subject or organization..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setStatusFilter(tab.value)
                      setPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      statusFilter === tab.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {listError ? (
                <div className="p-4 text-sm text-destructive">{listError}</div>
              ) : listLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-9 h-9 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets here.</p>
                </div>
              ) : (
                tickets.map((item) => (
                  <TicketRow
                    key={item.id}
                    ticket={item}
                    active={item.id === selectedId}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))
              )}
            </div>

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">{page} / {pageCount}</span>
                <button
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={page >= pageCount}
                  className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Thread */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <LifeBuoy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Select a ticket to open the conversation.</p>
                </div>
              </div>
            ) : ticketLoading && !ticket ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
            ) : !ticket ? (
              <div className="flex-1 flex items-center justify-center p-8 text-destructive text-sm">
                {ticketError || 'Ticket not found.'}
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" /> {ticket.organizationName}
                      <span>·</span>
                      <Clock className="w-3.5 h-3.5" /> {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={ticket.status}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      disabled={updatingStatus}
                      className="px-2.5 py-1.5 rounded-lg border border-input bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {['open', 'pending', 'resolved', 'closed'].map((value) => (
                        <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>
                      ))}
                    </select>
                    <select
                      value={ticket.priority}
                      onChange={(event) => handlePriorityChange(event.target.value)}
                      disabled={updatingStatus}
                      className="px-2.5 py-1.5 rounded-lg border border-input bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {['low', 'medium', 'high'].map((value) => (
                        <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)} priority</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      title="Delete ticket"
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {(ticket.messages || []).map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {ticketError && (
                  <div className="px-4 py-2 text-sm text-destructive border-t border-border">{ticketError}</div>
                )}

                {ticket.status === 'closed' ? (
                  <div className="p-4 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> This ticket is closed. Reopen it to keep replying.
                    <button
                      onClick={() => handleStatusChange('open')}
                      className="text-primary hover:text-primary/80 font-medium ml-auto"
                    >
                      Reopen
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="p-3 border-t border-border flex items-end gap-2">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          handleSend(event)
                        }
                      }}
                      placeholder={`Reply as ${user?.email || 'admin'}...`}
                      rows={2}
                      className="flex-1 resize-none px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
