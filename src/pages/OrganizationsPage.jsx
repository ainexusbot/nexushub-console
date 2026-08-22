import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, formatDate } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Building2,
  ArrowRight,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import OrgTagSelector from '../components/OrgTagSelector'
import TagBadge from '../components/TagBadge'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
]

// Read the tags array off an organization regardless of the API field name.
function orgTags(org) {
  return org.tags || org.tagList || org.tag_list || []
}

function OrgModal({ org, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: org?.name || '',
    description: org?.description || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!org

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      }

      const response = isEdit
        ? await api.put(`/organizations/${org.id}`, payload)
        : await api.post('/organizations', payload)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to save organization')
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
            {isEdit ? 'Edit Organization' : 'Create Organization'}
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
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional description"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
              <OrgTagSelector organizationId={org.id} tags={orgTags(org)} />
            </div>
          )}

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

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [organizations, setOrganizations] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editOrg, setEditOrg] = useState(null)
  const [deleteOrg, setDeleteOrg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Server-side query state
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [tagMatch, setTagMatch] = useState('any')
  const [sortValue, setSortValue] = useState('created_at:desc')
  const [page, setPage] = useState(0)

  const [allTags, setAllTags] = useState([])
  const firstLoad = useRef(true)

  // Debounce the search box into the query state.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchTags = useCallback(async () => {
    try {
      const response = await api.get('/organization-tags')
      if (!response.ok) return
      const data = await response.json()
      setAllTags(Array.isArray(data) ? data : data.tags || [])
    } catch {
      // Tag filters are optional; a failure here should not break the list.
    }
  }, [])

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sort, order] = sortValue.split(':')
      const params = new URLSearchParams({
        sort,
        order,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (search) params.set('search', search)
      if (selectedTagIds.length > 0) {
        params.set('tagIds', selectedTagIds.join(','))
        params.set('tagMatch', tagMatch)
      }

      const response = await api.get(`/organizations?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch organizations')
      const data = await response.json()

      const list = Array.isArray(data)
        ? data
        : data.organizations || data.results || []
      setOrganizations(list)
      setTotal(
        typeof data.total === 'number' ? data.total : page * PAGE_SIZE + list.length,
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      firstLoad.current = false
    }
  }, [search, selectedTagIds, tagMatch, sortValue, page])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const toggleTagFilter = (tagId) => {
    setPage(0)
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setSelectedTagIds([])
    setTagMatch('any')
    setSortValue('created_at:desc')
    setPage(0)
  }

  const hasFilters = !!search || selectedTagIds.length > 0

  // Optimistically patch a single organization's tags after inline editing.
  const applyTagChange = (orgId, nextTags) => {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, tags: nextTags } : o)),
    )
    fetchTags()
  }

  const handleDelete = async () => {
    if (!deleteOrg) return
    setDeleting(true)
    try {
      const response = await api.delete(`/organizations/${deleteOrg.id}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete organization')
      }
      setDeleteOrg(null)
      fetchOrganizations()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditOrg(null)
    fetchOrganizations()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min(total, page * PAGE_SIZE + organizations.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Manage workspaces, their teams and analysis instructions
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditOrg(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Organization
          </button>
        )}
      </div>

      {/* Toolbar: search, sort, tag filters */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search organizations by name or description..."
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <select
            value={sortValue}
            onChange={(e) => {
              setSortValue(e.target.value)
              setPage(0)
            }}
            className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">
              Tags
            </span>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {allTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagFilter(tag.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || '#64748b' }}
                    />
                    {tag.name}
                    {tag.usageCount != null && (
                      <span className={active ? 'opacity-80' : 'opacity-60'}>
                        {tag.usageCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedTagIds.length > 1 && (
              <div className="mt-3 inline-flex rounded-lg border border-border overflow-hidden">
                {['any', 'all'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setTagMatch(mode)
                      setPage(0)
                    }}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      tagMatch === mode
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60'
                    }`}
                  >
                    Match {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {hasFilters ? 'No matches' : 'No Organizations'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? 'No organizations match the current search and tag filters.'
              : 'Create an organization to start building teams and instructions'}
          </p>
          {hasFilters ? (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset filters
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={() => {
                  setEditOrg(null)
                  setShowModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Organization
              </button>
            )
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-card rounded-xl border border-border p-5 flex flex-col hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditOrg(org)
                          setShowModal(true)
                        }}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteOrg(org)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>

                <h3
                  onClick={() => navigate(`/organizations/${org.id}`)}
                  className="font-semibold text-foreground text-lg cursor-pointer hover:text-primary transition-colors"
                >
                  {org.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 flex-1 line-clamp-2">
                  {org.description || 'No description'}
                </p>

                <div className="mt-3">
                  {isAdmin ? (
                    <OrgTagSelector
                      organizationId={org.id}
                      tags={orgTags(org)}
                      onChange={(nextTags) => applyTagChange(org.id, nextTags)}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {orgTags(org).map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(org.created_at || org.createdAt)}
                  </span>
                  <button
                    onClick={() => navigate(`/organizations/${org.id}`)}
                    className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    Open <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <OrgModal
          org={editOrg}
          onClose={() => {
            setShowModal(false)
            setEditOrg(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {deleteOrg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Organization?</h3>
            <p className="text-muted-foreground mb-4">
              Deleting <span className="font-medium text-foreground">{deleteOrg.name}</span> will
              remove its members and instructions. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOrg(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
