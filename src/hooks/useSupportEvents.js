import { useEffect, useRef } from 'react'
import { getApiBase, getToken } from '../utils/api'

// Subscribes to a support-chat SSE stream (support-sse.routes.ts on the
// backend) and calls `handlers[eventName](data)` for each frame. The native
// EventSource can't set an Authorization header, so the access token travels
// as `?token=` instead (see resolveSseUser on the backend).
//
// Reconnects automatically (short fixed backoff) if the stream drops —
// EventSource retries network blips on its own, but not once the server has
// cleanly closed the response.
export function useSupportEvents(path, handlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!path) return undefined
    let cancelled = false
    let source
    let retryTimer

    function connect() {
      const token = getToken()
      if (!token) return
      const separator = path.includes('?') ? '&' : '?'
      const url = `${getApiBase()}${path}${separator}token=${encodeURIComponent(token)}`
      source = new EventSource(url)

      for (const eventName of Object.keys(handlersRef.current || {})) {
        source.addEventListener(eventName, (event) => {
          let data = null
          try {
            data = event.data ? JSON.parse(event.data) : null
          } catch {
            return
          }
          handlersRef.current[eventName]?.(data)
        })
      }

      source.onerror = () => {
        source?.close()
        if (!cancelled) retryTimer = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      source?.close()
    }
  }, [path])
}
