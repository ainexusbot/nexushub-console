import { useState, useEffect } from 'react'
import { api, formatDate } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

function AdminBadge({ isAdmin }) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
        <ShieldCheck className="w-3 h-3" />
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      <Shield className="w-3 h-3" />
      User
    </span>
  )
}

function VerifiedBadge({ isVerified }) {
  const styles = isVerified
    ? 'bg-success/10 text-success'
    : 'bg-muted text-muted-foreground'
  const Icon = isVerified ? CheckCircle : XCircle
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles}`}>
      <Icon className="w-3 h-3" />
      {isVerified ? 'Verified' : 'Unverified'}
    </span>
  )
}

function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    is_admin: user?.is_admin || false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!user

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let response
      if (isEdit) {
        const payload = {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_admin: formData.is_admin,
        }
        if (formData.password) {
          payload.password = formData.password
        }
        response = await api.patch(`/admin/users/${user.id}/`, payload)
      } else {
        const payload = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          is_admin: formData.is_admin,
        }
        response = await api.post('/admin/users/', payload)
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to save user')
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
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit User' : 'Add User'}
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
            <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password {!isEdit && '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!isEdit}
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Петров"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
            <input
              type="checkbox"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Administrator</span>
              <p className="text-xs text-muted-foreground">Grant full admin privileges</p>
            </div>
          </label>

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
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalUser, setModalUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteUser, setDeleteUser] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [search, adminFilter, page])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (adminFilter) params.set('is_admin', adminFilter)
      params.set('page', String(page))
      params.set('page_size', String(pageSize))

      const response = await api.get(`/admin/users/?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.results || [])
      setTotalPages(data.total_pages || 1)
      setCount(data.count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleAdminFilter = (value) => {
    setPage(1)
    setAdminFilter(value)
  }

  const handleToggleAdmin = async (target) => {
    setTogglingId(target.id)
    try {
      const response = await api.patch(`/admin/users/${target.id}/`, {
        is_admin: !target.is_admin,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to update admin role')
      }
      const updated = await response.json()
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      alert(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      const response = await api.delete(`/admin/users/${deleteUser.id}/`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to delete user')
      }
      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const openEditModal = (u) => {
    setModalUser(u)
    setShowModal(true)
  }

  const openAddModal = () => {
    setModalUser(null)
    setShowModal(true)
  }

  const handleModalSave = () => {
    setShowModal(false)
    setModalUser(null)
    fetchUsers()
  }

  const fullName = (u) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ')
    return name || '—'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">Manage admin panel users and permissions</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search by email or name..."
          />
        </form>
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'true', label: 'Admins' },
            { value: 'false', label: 'Users' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleAdminFilter(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                adminFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
      ) : users.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Users Found</h3>
          <p className="text-muted-foreground mb-4">
            {search || adminFilter ? 'Try adjusting your filters' : 'Add a user to get started'}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">{u.email}</div>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{fullName(u)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <AdminBadge isAdmin={u.is_admin} />
                      </td>
                      <td className="px-4 py-3">
                        <VerifiedBadge isVerified={u.is_verified} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            disabled={isSelf || togglingId === u.id}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isSelf ? 'You cannot change your own role' : u.is_admin ? 'Revoke admin' : 'Make admin'}
                          >
                            {togglingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : u.is_admin ? (
                              <ShieldCheck className="w-4 h-4 text-primary" />
                            ) : (
                              <Shield className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteUser(u)}
                            disabled={isSelf}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isSelf ? 'You cannot delete your own account' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {count} user{count === 1 ? '' : 's'} · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <UserModal
          user={modalUser}
          onClose={() => {
            setShowModal(false)
            setModalUser(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete User?</h3>
            <p className="text-muted-foreground mb-4">
              This will permanently delete <span className="font-medium text-foreground">{deleteUser.email}</span>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
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
