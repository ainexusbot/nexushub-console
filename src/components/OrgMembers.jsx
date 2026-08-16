import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  UserPlus,
  Trash2,
  X,
  AlertCircle,
  Users,
  Loader2,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'

function OrgRoleBadge({ orgRole }) {
  const isAdmin = orgRole === 'admin'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isAdmin ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
      }`}
    >
      {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
      {isAdmin ? 'Org Admin' : 'Member'}
    </span>
  )
}

function AddMemberModal({ organizationId, existingIds, onClose, onSave }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userId, setUserId] = useState('')
  const [orgRole, setOrgRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users')
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data)
            ? data
            : data.users || data.results || []
          setUsers(list.filter((u) => !existingIds.includes(u.id)))
        }
      } catch {
        // ignore
      } finally {
        setLoadingUsers(false)
      }
    }
    load()
  }, [existingIds])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/organizations/${organizationId}/members`, {
        userId,
        orgRole,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to add member')
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
      <div className="bg-card rounded-xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Member</h2>
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
            <label className="block text-sm font-medium text-foreground mb-1">User *</label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
              </div>
            ) : (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} {u.role ? `(${u.role})` : ''}
                  </option>
                ))}
              </select>
            )}
            {!loadingUsers && users.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                All users are already members.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role in org</label>
            <div className="flex gap-2">
              {[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Org Admin' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOrgRole(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orgRole === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
              disabled={loading || !userId}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OrgMembers({ organizationId }) {
  const { isAdmin } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    fetchMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/organizations/${organizationId}/members`)
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(
        Array.isArray(data) ? data : data.members || data.results || []
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (member) => {
    const memberUserId = member.userId || member.user_id || member.id
    if (!confirm(`Remove ${member.email || 'this member'} from the organization?`)) return
    setRemovingId(memberUserId)
    try {
      const response = await api.delete(
        `/organizations/${organizationId}/members/${memberUserId}`
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove member')
      }
      fetchMembers()
    } catch (err) {
      alert(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const existingIds = members.map((m) => m.userId || m.user_id || m.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? '' : 's'}
        </p>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Global Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Org Role</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const mid = m.userId || m.user_id || m.id
                  return (
                    <tr key={mid} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{m.email || mid}</div>
                        {(m.firstName || m.first_name || m.lastName || m.last_name) && (
                          <div className="text-sm text-muted-foreground">
                            {[m.firstName || m.first_name, m.lastName || m.last_name]
                              .filter(Boolean)
                              .join(' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.role || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <OrgRoleBadge orgRole={m.orgRole || m.org_role} />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleRemove(m)}
                              disabled={removingId === mid}
                              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-40"
                              title="Remove member"
                            >
                              {removingId === mid ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddMemberModal
          organizationId={organizationId}
          existingIds={existingIds}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            fetchMembers()
          }}
        />
      )}
    </div>
  )
}
