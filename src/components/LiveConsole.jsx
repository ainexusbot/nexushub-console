import { useEffect, useRef } from 'react'
import { Terminal, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

// A single streamed log line. Matches the shape the backend emits:
// { seq, level: 'info'|'warn'|'error', message, ts }
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

// Reusable live console. Streams logs from a pollable backend job. Used by the
// post and comment submit panels — the same mechanism as Feed Browse and
// Account Settings, just rendering whatever the backend streams back.
export default function LiveConsole({
  logs = [],
  status = 'idle',
  running = false,
  runningLabel = 'Running',
  onClear,
  emptyHint = 'Logs will stream here once a job is running.',
}) {
  const consoleRef = useRef(null)

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-foreground" />
          <h2 className="text-base font-semibold text-foreground">Live console</h2>
          {running && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {runningLabel}
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
        {onClear && (
          <button
            onClick={onClear}
            disabled={running || logs.length === 0}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30"
            title="Clear console"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div
        ref={consoleRef}
        className="flex-1 min-h-[320px] max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background"
      >
        {logs.length === 0 ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6">
            <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{emptyHint}</p>
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
  )
}
