import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { Plus, Check, Loader2, Search } from 'lucide-react'
import TagBadge from './TagBadge'

/**
 * Inline tag editor for a single entity (subreddit or proxy).
 * Shows current tags as chips and a "+" button to attach/detach tags
 * via POST/DELETE /tags/:id/assign.
 */
export default function TagSelector({ entityType, entityId, tags = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')
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
      const response = await api.get('/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && allTags.length === 0) loadTags()
  }

  const toggleTag = async (tag) => {
    const isAssigned = assignedIds.has(tag.id)
    setBusyId(tag.id)
    try {
      const method = isAssigned ? 'delete' : 'post'
      const response = await api[method](`/tags/${tag.id}/assign`, {
        entity_type: entityType,
        entity_id: entityId,
      })
      if (response.ok) {
        onChange?.()
      }
    } finally {
      setBusyId(null)
    }
  }

  const removeTag = async (tag) => {
    setBusyId(tag.id)
    try {
      const response = await api.delete(`/tags/${tag.id}/assign`, {
        entity_type: entityType,
        entity_id: entityId,
      })
      if (response.ok) onChange?.()
    } finally {
      setBusyId(null)
    }
  }

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative inline-flex flex-wrap items-center gap-1.5" ref={containerRef}>
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} onRemove={removeTag} />
      ))}

      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        title="Manage tags"
      >
        <Plus className="w-3 h-3" />
        Tag
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-7 pr-2 py-1.5 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                {allTags.length === 0 ? 'No tags yet. Create some in the Tags section.' : 'No matches.'}
              </p>
            ) : (
              filtered.map((tag) => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
