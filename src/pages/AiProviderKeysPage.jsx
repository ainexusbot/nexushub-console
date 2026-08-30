import { useState, useEffect } from 'react'
import { api, formatDate, readError } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  KeyRound,
  Loader2,
  CheckCircle2,
  Zap,
} from 'lucide-react'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

function providerLabel(value) {
  return PROVIDERS.find((p) => p.value === value)?.label || value
}

function KeyModal({ apiKey, onClose, onSave }) {
  const isEdit = Boolean(apiKey)
  const [formData, setFormData] = useState({
    provider: apiKey?.provider || 'openai',
    label: apiKey?.label || '',
    apiKey: '',
  })
  // Only offered on create: activate the key right away.
  const [activateNow, setActivateNow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const input = {
        provider: formData.provider,
        label: formData.label.trim(),
      }
      const secret = formData.apiKey.trim()
      // On edit the secret is optional — omit it to keep the existing key.
      if (secret || !isEdit) input.apiKey = secret

      const response = isEdit
        ? await api.put(`/ai-provider-keys/${apiKey.id}`, { input })
        : await api.post('/ai-provider-keys', { input, active: activateNow })

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save key'))
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
            {isEdit ? 'Edit API Key' : 'Add API Key'}
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
            <label className="block text-sm font-medium text-foreground mb-1">Provider *</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, provider: p.value })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.provider === p.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Label *</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Anthropic — prod"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              API Key {isEdit ? '' : '*'}
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              required={!isEdit}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              placeholder={isEdit ? 'Leave blank to keep current key' : 'sk-...'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isEdit
                ? 'Leave blank to keep the current secret, or enter a new one to replace it.'
                : 'Stored securely on the backend and never shown again.'}
            </p>
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activateNow}
                onChange={(e) => setActivateNow(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">
                Activate immediately for this provider
              </span>
            </label>
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

export default function AiProviderKeysPage() {
  const { isAdmin } = useAuth()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editKey, setEditKey] = useState(null)
  const [deleteKey, setDeleteKey] = useState(null)
  const [activatingId, setActivatingId] = useState(null)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const response = await api.get('/ai-provider-keys')
      if (!response.ok) throw new Error(await readError(response, 'Failed to fetch keys'))
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.keys || []
      setKeys(list)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id) => {
    setActivatingId(id)
    try {
      const response = await api.post(`/ai-provider-keys/${id}/activate`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to activate key'))
      await fetchKeys()
    } catch (err) {
      alert(err.message)
    } finally {
      setActivatingId(null)
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/ai-provider-keys/${id}`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to delete key'))
      setDeleteKey(null)
      await fetchKeys()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditKey(null)
    fetchKeys()
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
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Manage provider API keys. One key per provider is active and used when a model has no
            key attached.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditKey(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Key
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No API Keys</h3>
          <p className="text-muted-foreground mb-4">
            Add a provider key so models can generate without backend env vars.
          </p>
          {isAdmin && (
            <button
              onClick={() => {
                setEditKey(null)
                setShowModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Key
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Label</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Key</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{k.label}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {providerLabel(k.provider)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-muted-foreground">{k.keyPreview}</code>
                    </td>
                    <td className="px-4 py-3">
                      {k.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(k.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && !k.isActive && (
                          <button
                            onClick={() => handleActivate(k.id)}
                            disabled={activatingId === k.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                            title="Make this key active for its provider"
                          >
                            {activatingId === k.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            Activate
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditKey(k)
                                setShowModal(true)
                              }}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => setDeleteKey(k)}
                              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </>
                        )}
                        {!isAdmin && <span className="text-xs text-muted-foreground">—</span>}
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
        <KeyModal
          apiKey={editKey}
          onClose={() => {
            setShowModal(false)
            setEditKey(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {deleteKey && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete API Key?</h3>
            <p className="text-muted-foreground mb-4">
              Deleting <span className="font-medium text-foreground">{deleteKey.label}</span> cannot
              be undone. Models attached to this key will fall back to the active key of the
              provider.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteKey(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteKey.id)}
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
