import { useState, useEffect } from 'react'
import { api, formatDate, readError } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Cpu,
  Loader2,
  CheckCircle2,
  Zap,
} from 'lucide-react'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', keyName: 'OPENAI_API_KEY' },
  { value: 'anthropic', label: 'Anthropic', keyName: 'ANTHROPIC_API_KEY' },
]

// A few common model ids to speed up entry — the field stays free-form so any
// raw provider model id can be typed in.
const MODEL_SUGGESTIONS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
  anthropic: [
    'claude-sonnet-4-5',
    'claude-opus-4-1',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
  ],
}

function providerLabel(value) {
  return PROVIDERS.find((p) => p.value === value)?.label || value
}

function ModelModal({ model, onClose, onSave }) {
  const isEdit = Boolean(model)
  const [formData, setFormData] = useState({
    provider: model?.provider || 'openai',
    model: model?.model || '',
    label: model?.label || '',
    description: model?.description || '',
    position: model?.position ?? 0,
  })
  // Only offered on create: activate the model right away.
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
        model: formData.model.trim(),
        label: formData.label.trim(),
        description: formData.description.trim() || undefined,
        position: Number(formData.position) || 0,
      }

      const response = isEdit
        ? await api.put(`/ai-models/${model.id}`, { input })
        : await api.post('/ai-models', { input, active: activateNow })

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save model'))
      }

      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const suggestions = MODEL_SUGGESTIONS[formData.provider] || []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Model' : 'Add Model'}
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
            <p className="text-xs text-muted-foreground mt-1">
              Requires{' '}
              <code className="text-foreground">
                {PROVIDERS.find((p) => p.value === formData.provider)?.keyName}
              </code>{' '}
              set on the backend.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Model ID *</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              required
              list="model-suggestions"
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              placeholder="gpt-4o-mini"
            />
            <datalist id="model-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground mt-1">
              Raw model id sent to the provider.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Label *</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="GPT-4o mini"
            />
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Position</label>
            <input
              type="number"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">Lower numbers show first.</p>
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activateNow}
                onChange={(e) => setActivateNow(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">Activate immediately</span>
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

export default function AiModelsPage() {
  const { isAdmin } = useAuth()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editModel, setEditModel] = useState(null)
  const [deleteModel, setDeleteModel] = useState(null)
  const [activatingId, setActivatingId] = useState(null)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    setLoading(true)
    try {
      const response = await api.get('/ai-models')
      if (!response.ok) throw new Error(await readError(response, 'Failed to fetch models'))
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.models || []
      list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      setModels(list)
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
      const response = await api.post(`/ai-models/${id}/activate`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to activate model'))
      await fetchModels()
    } catch (err) {
      alert(err.message)
    } finally {
      setActivatingId(null)
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/ai-models/${id}`)
      if (!response.ok) throw new Error(await readError(response, 'Failed to delete model'))
      setDeleteModel(null)
      await fetchModels()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleModalSave = () => {
    setShowModal(false)
    setEditModel(null)
    fetchModels()
  }

  const activeModel = models.find((m) => m.isActive)

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
          <h1 className="text-2xl font-bold text-foreground">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage the model registry. Exactly one model is active and used for all client generations.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditModel(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Model
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {/* Active model banner — the signature element of the page */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Currently Active
          </span>
        </div>
        {activeModel ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xl font-bold text-foreground">{activeModel.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {providerLabel(activeModel.provider)} ·{' '}
                <code className="text-foreground">{activeModel.model}</code>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary text-primary-foreground">
              <CheckCircle2 className="w-4 h-4" />
              Live
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No active model. Activate one below to enable client generations.
          </p>
        )}
      </div>

      {models.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Models</h3>
          <p className="text-muted-foreground mb-4">
            Add a model to start powering client generations.
          </p>
          {isAdmin && (
            <button
              onClick={() => {
                setEditModel(null)
                setShowModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Model
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Model</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{m.label}</div>
                      <div className="text-xs font-mono text-muted-foreground">{m.model}</div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {providerLabel(m.provider)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && !m.isActive && (
                          <button
                            onClick={() => handleActivate(m.id)}
                            disabled={activatingId === m.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                            title="Make this model active"
                          >
                            {activatingId === m.id ? (
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
                                setEditModel(m)
                                setShowModal(true)
                              }}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => setDeleteModel(m)}
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
        <ModelModal
          model={editModel}
          onClose={() => {
            setShowModal(false)
            setEditModel(null)
          }}
          onSave={handleModalSave}
        />
      )}

      {deleteModel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Model?</h3>
            <p className="text-muted-foreground mb-4">
              Deleting <span className="font-medium text-foreground">{deleteModel.label}</span>{' '}
              cannot be undone.
              {deleteModel.isActive && (
                <span className="block mt-2 text-destructive">
                  This is the active model — deleting it may stop client generations until another
                  model is activated.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModel(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModel.id)}
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
