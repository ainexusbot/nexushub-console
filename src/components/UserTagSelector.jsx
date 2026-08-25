import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { Plus, Check, Loader2, Search } from 'lucide-react'
import TagBadge from './TagBadge'

/**
 * Inline tag editor for a single user.
 * Users share the same global tag dictionary as organizations, so the pool
 * is read from GET /organization-tags (with a /tags fallback) and assignments
 * are toggled via POST /users/:id/tags/:tagId and
 * DELETE /users/:id/tags/:tagId.
 */
export default function UserTagSelector({ userId, tags = [], onChange, canEdit = true }) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  const assignedIds = new Set(tags.map((t) => t.id))

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const loadTags = async () => {
    setLoading(true)
    try {
      let response = await api.get('/organization-tags')
      if (!response.ok) response = await api.get('/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(Array.isArray(data) ? data : data.tags || [])
      }
    } catch {
      // The tag pool is optional; keep the selector usable if it fails.
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    setError(null)
    if (next) loadTags()
  }

  const toggleTag = async (tag) => {
    if (!userId) return
    const isAssigned = assignedIds.has(tag.id)
    setBusyId(tag.id)
    setError(null)
    try {
      const response = isAssigned
        ? await api.delete(`/users/${userId}/tags/${tag.id}`)
        : await api.post(`/users/${userId}/tags/${tag.id}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to update tags')
      }
      const nextTags = isAssigned ? tags.filter((t) => t.id !== tag.id) : [...tags, tag]
      onChange?.(nextTags)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const createTag = async () => {
    const name = search.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      let response = await api.post('/organization-tags', { name })
      if (!response.ok) response = await api.post('/tags', { name })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to create tag')
      }
      const created = await response.json().catch(() => null)
      const tag = created?.tag || created
      if (tag?.id) {
        setAllTags((prev) => [...prev, tag])
        setSearch('')
        await toggleTag(tag)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const query = search.trim().toLowerCase()
  const filtered = allTags.filter((t) => (t.name || '').toLowerCase().includes(query))
  const exactExists = allTags.some((t) => (t.name || '').toLowerCase() === query)

  return (
    <div className="relative flex flex-wrap items-center gap-1.5" ref={containerRef}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={canEdit ? (t) => toggleTag(t) : undefined}
        />
      ))}

      {canEdit && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Manage tags"
        >
          <Plus className="w-3 h-3" />
          Tag
        </button>
      )}

      {!canEdit && tags.length === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-60 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    if (!exactExists) createTag()
                  }
                }}
                placeholder="Search or create..."
                className="w-full pl-7 pr-2 py-1.5 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && (
            <p className="px-3 py-2 text-xs text-destructive border-b border-border">{error}</p>
          )}

          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                {filtered.map((tag) => {
                  const isAssigned = assignedIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={busyId === tag.id}
                      className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-foreground">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#64748b' }}
                        />
                        {tag.name}
                      </span>
                      {busyId === tag.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : isAssigned ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : null}
                    </button>
                  )
                })}

                {query && !exactExists && (
                  <button
                    type="button"
                    onClick={createTag}
                    disabled={creating}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Create &quot;{search.trim()}&quot;
                  </button>
                )}

                {!query && filtered.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No tags yet. Type a name to create one.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
