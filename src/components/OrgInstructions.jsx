import { useState, useEffect, useRef } from "react";
import { api, formatDate } from "../utils/api";
import { useAuth } from "../context/AuthContext";
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
  Tag,
} from "lucide-react";
import {
  GLOBAL_OPTION,
  SELECTABLE_GROUP_OPTIONS,
  getGroupMeta,
} from "../constants/instructionGroups";
import { TypeBadge } from "./OrgInstructionTypes";

// Reads the type ids an instruction is currently attached to, tolerating the
// several shapes the API may return (array of objects or array of ids).
function readTypeIds(instruction) {
  const types = instruction?.types;
  if (!Array.isArray(types)) return [];
  return types.map((t) => (typeof t === "string" ? t : t.id)).filter(Boolean);
}

function InstructionEditor({ organizationId, instruction, onClose, onSave }) {
  const [title, setTitle] = useState(instruction?.title || "");
  const [content, setContent] = useState(instruction?.content || "");
  const [groupType, setGroupType] = useState(
    instruction?.group_type || instruction?.groupType || "company",
  );
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState(
    readTypeIds(instruction),
  );

  const isEdit = !!instruction;

  // Types belong to a specific group. Global instructions ("all") have no
  // types, so we only load/show the checkboxes for a concrete group.
  useEffect(() => {
    if (groupType === "all") {
      setTypes([]);
      return;
    }
    let cancelled = false;
    const loadTypes = async () => {
      setTypesLoading(true);
      try {
        const res = await api.get(
          `/instruction-types?organizationId=${organizationId}&group=${groupType}`,
        );
        if (!res.ok) throw new Error("Failed to load types");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.types || [];
        if (!cancelled) setTypes(list);
      } catch {
        if (!cancelled) setTypes([]);
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    };
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, [groupType, organizationId]);

  const toggleType = (id) => {
    setSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  // Types are scoped to a group, so switching groups invalidates the current
  // selection.
  const changeGroup = (value) => {
    if (value === groupType) return;
    setGroupType(value);
    setSelectedTypeIds([]);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.md$/i, ""));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Global instructions have no types; otherwise send the checkbox
      // selection (an empty array clears all type links, making it general).
      const typeIds = groupType === "all" ? [] : selectedTypeIds;
      const input = { title: title.trim(), content, groupType, typeIds };
      const payload = isEdit ? { input } : { organizationId, input };

      const response = isEdit
        ? await api.put(`/instructions/${instruction.id}`, payload)
        : await api.post("/instructions", payload);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || data.message || "Failed to save instruction",
        );
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Instruction" : "New Instruction"}
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Scope *
            </label>
            {(() => {
              const active = groupType === GLOBAL_OPTION.value;
              const Icon = GLOBAL_OPTION.icon;
              return (
                <button
                  type="button"
                  onClick={() => changeGroup(GLOBAL_OPTION.value)}
                  className={`w-full flex items-start gap-2 p-3 rounded-lg border text-left transition-colors mb-2 ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {GLOBAL_OPTION.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {GLOBAL_OPTION.description}
                    </span>
                  </span>
                </button>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              {SELECTABLE_GROUP_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = groupType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changeGroup(opt.value)}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${
                          active ? "text-foreground" : "text-foreground"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {groupType === "all"
                ? "This instruction is global — it applies to every group in this organization."
                : "The instruction applies to all entities of the selected group in this organization."}
            </p>
          </div>

          {groupType !== "all" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Types
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Attach this instruction to one or more types. Leave all
                unchecked to make it a general instruction for the whole group.
              </p>
              {typesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading types...
                </div>
              ) : types.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <Tag className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    No types for this group yet. Create types in the
                    &quot;Instruction Types&quot; tab to categorize instructions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {types.map((t) => {
                    const checked = selectedTypeIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleType(t.id)}
                          className="w-4 h-4 rounded border-input accent-primary shrink-0"
                        />
                        <TypeBadge type={t} />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Title *
            </label>
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
              <label className="block text-sm font-medium text-foreground">
                Content (Markdown) *
              </label>
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
              <p className="text-xs text-muted-foreground mb-1">
                Loaded from: {fileName}
              </p>
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
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InstructionViewer({ instructionId, onClose }) {
  const [instruction, setInstruction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOne();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionId]);

  const fetchOne = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/instructions/${instructionId}`);
      if (!res.ok) throw new Error("Failed to load instruction");
      const data = await res.json();
      setInstruction(data.instruction || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground truncate pr-4">
            {instruction?.title || "Instruction"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded shrink-0"
          >
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
            {(() => {
              const meta = getGroupMeta(
                instruction?.group_type || instruction?.groupType,
              );
              const Icon = meta.icon;
              return (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {meta.value === "all" ? (
                      <>
                        Global instruction — applied to{" "}
                        <span className="font-medium text-foreground">
                          every group
                        </span>{" "}
                        in this organization.
                      </>
                    ) : (
                      <>
                        Applied to all{" "}
                        <span className="font-medium text-foreground">
                          {meta.label.toLowerCase()}
                        </span>{" "}
                        in this organization.
                      </>
                    )}
                  </p>
                </div>
              );
            })()}
            <pre className="whitespace-pre-wrap break-words bg-muted/50 border border-border rounded-lg p-4 text-sm text-foreground font-mono max-h-[60vh] overflow-y-auto">
              {instruction?.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrgInstructions({ organizationId }) {
  const { isAdmin } = useAuth();
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editInstruction, setEditInstruction] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchInstructions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/instructions?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch instructions");
      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data.instructions || data.results || [];
      setInstructions(
        [...list].sort((a, b) => {
          const da = new Date(
            a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0,
          );
          const db = new Date(
            b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0,
          );
          return db - da;
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const response = await api.delete(`/instructions/${deleteItem.id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete instruction");
      }
      setDeleteItem(null);
      fetchInstructions();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Each instruction is bound to an entity group — companies, people,
          emails or analyses — or marked{" "}
          <span className="font-medium text-foreground">global</span> to apply
          across every group in this organization. It is applied automatically
          when generating content for its scope.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {instructions.length} instruction
          {instructions.length === 1 ? "" : "s"}
        </p>
        {isAdmin && (
          <button
            onClick={() => {
              setEditInstruction(null);
              setShowEditor(true);
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
                setEditInstruction(null);
                setShowEditor(true);
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewId(item.id);
                      }}
                      className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left cursor-pointer"
                    >
                      {item.title}
                    </button>
                    {(() => {
                      const meta = getGroupMeta(
                        item.group_type || item.groupType,
                      );
                      const Icon = meta.icon;
                      const isGlobal = meta.value === "all";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isGlobal
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {isGlobal ? "Global" : meta.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {(item.content || "").slice(0, 120) || "Empty document"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDate(
                      item.updated_at ||
                        item.updatedAt ||
                        item.created_at ||
                        item.createdAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewId(item.id);
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
                        e.stopPropagation();
                        setEditInstruction(item);
                        setShowEditor(true);
                      }}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteItem(item);
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
            setShowEditor(false);
            setEditInstruction(null);
          }}
          onSave={() => {
            setShowEditor(false);
            setEditInstruction(null);
            fetchInstructions();
          }}
        />
      )}

      {viewId && (
        <InstructionViewer
          instructionId={viewId}
          onClose={() => setViewId(null)}
        />
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete Instruction?
            </h3>
            <p className="text-muted-foreground mb-4">
              Deleting{" "}
              <span className="font-medium text-foreground">
                {deleteItem.title}
              </span>{" "}
              will remove it from this organization&apos;s instruction library.
              This cannot be undone.
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
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
