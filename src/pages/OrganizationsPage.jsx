import { useState, useEffect } from 'react'
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
} from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editOrg, setEditOrg] = useState(null)
  const [deleteOrg, setDeleteOrg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/organizations')
      if (!response.ok) throw new Error('Failed to fetch organizations')
      const data = await response.json()
      setOrganizations(
        Array.isArray(data) ? data : data.organizations || data.results || [],
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <h3 className="text-lg font-medium text-foreground mb-2">No Organizations</h3>
          <p className="text-muted-foreground mb-4">
            Create an organization to start building teams and instructions
          </p>
          {isAdmin && (
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
          )}
        </div>
      ) : (
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

              <h3 className="font-semibold text-foreground text-lg">{org.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 flex-1 line-clamp-2">
                {org.description || 'No description'}
              </p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {formatDate(org.created_at || org.createdAt)}
                </span>
                <button
                  onClick={() => navigate(`/organizations/${org.id}`)}
                  className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 font-medium"
                >
                  Open <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
