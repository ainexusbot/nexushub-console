import { useEffect, useRef } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { buttonClass, date, number } from '../../utils/subscriptions'

const tones = {
  active: 'bg-green-50 text-green-700',
  succeeded: 'bg-green-50 text-green-700',
  blocked: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
  expired: 'bg-amber-50 text-amber-800',
  reserved: 'bg-amber-50 text-amber-800',
  running: 'bg-blue-50 text-blue-700',
  scheduled: 'bg-blue-50 text-blue-700',
}
export function Status({ value }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tones[value] || 'bg-secondary text-muted-foreground'}`}
    >
      {value}
    </span>
  )
}
export function ErrorNotice({ error, onRetry }) {
  if (!error) return null
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex gap-3 items-start"
    >
      <AlertCircle className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p>{error.message || error}</p>
        {onRetry && (
          <button onClick={onRetry} className="underline mt-2">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex justify-center items-center p-16 text-muted-foreground gap-2"
    >
      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
    </div>
  )
}
export function Empty({ children = 'No activity for these filters.' }) {
  return <div className="p-12 text-center text-muted-foreground text-sm">{children}</div>
}
export function Pagination({ total, page, onPage, size = 25 }) {
  const pages = Math.max(1, Math.ceil(total / size))
  return (
    <div className="flex flex-wrap gap-3 justify-between items-center py-4 text-sm text-muted-foreground">
      <span>
        {number(total)} results · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button className={buttonClass} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} /> Previous
        </button>
        <button className={buttonClass} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
export function Table({ headings, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {headings.map((h) => (
              <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}
export function Cell({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
}
export function UserCell({ row, onClick }) {
  return (
    <div className="min-w-36">
      <button
        disabled={!onClick}
        onClick={onClick}
        className="font-medium text-left hover:text-primary disabled:hover:text-foreground"
      >
        {row.userName || row.name || row.userEmail || row.email || 'Deleted user'}
      </button>
      {(row.userEmail || row.email) && (
        <div className="text-xs text-muted-foreground mt-1 break-all">
          {row.userEmail || row.email}
        </div>
      )}
    </div>
  )
}
export function DateCell({ value }) {
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{date(value)}</span>
}
export function Stat({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-2 tabular-nums break-words">{value}</p>
      {detail && <p className="text-xs text-muted-foreground mt-2">{detail}</p>}
    </div>
  )
}
export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    node.showModal()
    return () => node.close()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex justify-between items-center gap-4 mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button disabled={busy} aria-label="Close dialog" onClick={onClose} className={buttonClass}>
          <X size={16} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
