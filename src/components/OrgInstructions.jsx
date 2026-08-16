import { useState, useEffect, useRef } from 'react'
import { api, formatDate } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  FileText,
  Upload,
  Loader2,
  Eye,
  Info,
} from 'lucide-react'

function InstructionEditor({ organizationId, instruction, onClose, onSave }) {
  const [title, setTitle] = useState(instruction?.title || '')
  const [content, setContent] = useState(instruction?.content || '')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const isEdit = !!instruction

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setContent(text)
    setFileName(file.name)
    if (!title) setTitle(file.name.replace(/\.md$/i, ''))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = isEdit
        ? { input: { title: title.trim(), content } }
        : { organizationId, input: { title: title.trim(), content } }

      const response = isEdit
        ? await api.put(`/instructions/${instruction.id}`, payload)
        : await api.post('/instructions', payload)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to save instruction')
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
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Instruction' : 'New Instruction'}
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

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This instruction applies to <span className="font-medium text-foreground">every</span> company,
              person and group in this organization automatically. There is no need to attach it to a specific entity.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Company analysis guidelines"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">Content (Markdown) *</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
              >
                <Upload className="w-4 h-4" /> Upload .md
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,text/markdown,text/plain"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            {fileName && (
              <p className="text-xs text-muted-foreground mb-1">Loaded from: {fileName}</p>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={14}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="# Instruction&#10;&#10;Write markdown here or upload a .md file..."
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

function InstructionViewer({ instructionId, onClose }) {
  const [instruction, setInstruction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOne()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionId])

  const fetchOne = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/instructions/${instructionId}`)
      if (!res.ok) throw new Error('Failed to load instruction')
      const data = await res.json()
      setInstruction(data.instruction || data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground truncate pr-4">
            {instruction?.title || 'Instruction'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">Error: {error}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Applied automatically to all companies, people and groups in this organization.
              </p>
            </div>
            <pre className="whitespace-pre-wrap break-words bg-muted/50 border border-border rounded-lg p-4 text-sm text-foreground font-mono max-h-[60vh] overflow-y-auto">
              {instruction?.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrgInstructions({ organizationId }) {
  const { isAdmin } = useAuth()
  const [instructions, setInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editInstruction, setEditInstruction] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchInstructions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const fetchInstructions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/instructions?organizationId=${organizationId}`)
      if (!response.ok) throw new Error('Failed to fetch instructions')
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.instructions || data.results || []
      setInstructions(
        [...list].sort((a, b) => {
          const da = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0)
          const db = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0)
          return db - da
        }),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      const response = await api.delete(`/instructions/${deleteItem.id}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete instruction')
      }
      setDeleteItem(null)
      fetchInstructions()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          These instructions form a single library for this organization. Every instruction here is
          applied automatically to <span className="font-medium text-foreground">all</span> companies,
          people and groups during analysis and content generation — no manual attaching needed.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {instructions.length} instruction{instructions.length === 1 ? '' : 's'}
        </p>
        {isAdmin && (
          <button
            onClick={() => {
              setEditInstruction(null)
              setShowEditor(true)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Instruction
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
      ) : instructions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No instructions yet</p>
          {isAdmin && (
            <button
              onClick={() => {
                setEditInstruction(null)
                setShowEditor(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Instruction
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewId(item.id)}
              className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewId(item.id)
                    }}
                    className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left cursor-pointer"
                  >
                    {item.title}
                  </button>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {(item.content || '').slice(0, 120) || 'Empty document'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(item.updated_at || item.updatedAt || item.created_at || item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewId(item.id)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                  Open
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditInstruction(item)
                        setShowEditor(true)
                      }}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteItem(item)
                      }}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <InstructionEditor
          organizationId={organizationId}
          instruction={editInstruction}
          onClose={() => {
            setShowEditor(false)
            setEditInstruction(null)
          }}
          onSave={() => {
            setShowEditor(false)
            setEditInstruction(null)
            fetchInstructions()
          }}
        />
      )}

      {viewId && (
        <InstructionViewer instructionId={viewId} onClose={() => setViewId(null)} />
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Instruction?</h3>
            <p className="text-muted-foreground mb-4">
              Deleting <span className="font-medium text-foreground">{deleteItem.title}</span> will
              remove it from this organization&apos;s instruction library. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteItem(null)}
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
