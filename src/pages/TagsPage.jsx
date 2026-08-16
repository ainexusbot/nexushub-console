import { useState, useEffect } from 'react'
import { api, formatDate } from '../utils/api'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Search,
  Tag as TagIcon,
  Loader2,
} from 'lucide-react'
import TagBadge from '../components/TagBadge'

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#ec4899',
  '#64748b',
]

function TagModal({ tag, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    color: tag?.color || PRESET_COLORS[3],
    description: tag?.description || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description || undefined,
      }

      const response = tag
        ? await api.patch(`/tags/${tag.id}`, payload)
        : await api.post('/tags', payload)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message = data.error || data.detail || data.message
        if (response.status === 409) {
          throw new Error(message || 'A tag with this name already exists')
        }
        throw new Error(message || 'Failed to save tag')
      }

      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {tag ? 'Edit Tag' : 'Create Tag'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="high-traffic"
            />
            <p className="text-xs text-muted-foreground mt-1">Must be unique (case-insensitive).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    formData.color === color ? 'scale-110 border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-7 h-7 rounded-full border border-border bg-transparent cursor-pointer p-0"
                title="Custom color"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <TagBadge tag={{ name: formData.name || 'tag-name', color: formData.color }} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TagsPage() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTag, setEditTag] = useState(null)
  const [deleteTag, setDeleteTag] = useState(null)

  useEffect(() => {
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      const response = await api.get(`/tags${query}`)
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/tags/${id}`)
      if (!response.ok) throw new Error('Failed to delete tag')
      setTags(tags.filter((t) => t.id !== id))
      setDeleteTag(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditTag(null)
    fetchTags()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tags</h1>
          <p className="text-muted-foreground mt-1">
            Reusable labels for organizing users and entities. Use them to filter and sort.
          </p>
        </div>
        <button
          onClick={() => {
            setEditTag(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Tag
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm"
        >
          Search
        </button>
      </form>

      {tags.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <TagIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Tags</h3>
          <p className="text-muted-foreground mb-4">Create a tag to start labeling users and entities</p>
          <button
            onClick={() => {
              setEditTag(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Tag
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tag</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Usage</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <TagBadge tag={tag} size="md" />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {tag.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {tag.usage_count ?? 0} total
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(tag.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditTag(tag)
                            setShowModal(true)
                          }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteTag(tag)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <TagModal
          tag={editTag}
          onClose={() => {
            setShowModal(false)
            setEditTag(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {deleteTag && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Tag?</h3>
            <p className="text-muted-foreground mb-4">
              Deleting <span className="font-medium text-foreground">{deleteTag.name}</span> will remove it from all
              {' '}
              {(deleteTag.usage_count ?? 0)} linked items. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTag(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTag.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
