import { useState, useEffect } from "react";
import { api, formatDate } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Tag,
  Loader2,
  Info,
} from "lucide-react";
import {
  SELECTABLE_GROUP_OPTIONS,
  getGroupMeta,
  TYPE_COLOR_PRESETS,
  DEFAULT_TYPE_COLOR,
} from "../constants/instructionGroups";

const TYPE_GROUP_OPTIONS = SELECTABLE_GROUP_OPTIONS.filter(
  (option) => option.supportsTypes !== false,
);

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TypeBadge({ type, className = "" }) {
  const color = type.color || DEFAULT_TYPE_COLOR;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {type.name}
    </span>
  );
}

function TypeEditor({ organizationId, type, onClose, onSave }) {
  const isEdit = !!type;
  const [name, setName] = useState(type?.name || "");
  const [groupType, setGroupType] = useState(type?.groupType || type?.group_type || "email");
  const [slug, setSlug] = useState(type?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!type?.slug);
  const [color, setColor] = useState(type?.color || DEFAULT_TYPE_COLOR);
  const [description, setDescription] = useState(type?.description || "");
  const [position, setPosition] = useState(
    type?.position != null ? String(type.position) : "0",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleNameChange = (value) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        groupType,
        color,
        description: description.trim(),
        position: Number.isFinite(parseInt(position, 10))
          ? parseInt(position, 10)
          : 0,
      };
      const trimmedSlug = slug.trim();
      if (trimmedSlug) input.slug = trimmedSlug;

      const payload = isEdit ? { input } : { organizationId, input };
      const response = isEdit
        ? await api.put(`/instruction-types/${type.id}`, payload)
        : await api.post("/instruction-types", payload);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
          throw new Error(
            data.error || "A type with this name already exists in this group.",
          );
        }
        throw new Error(data.error || data.message || "Failed to save type");
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
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Type" : "New Type"}
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Warmup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Group *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_GROUP_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = groupType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGroupType(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="warmup"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Position
              </label>
              <input
                type="number"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {TYPE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color?.toLowerCase() === preset.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: preset }}
                  aria-label={`Use color ${preset}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border border-input bg-transparent cursor-pointer p-0"
                aria-label="Custom color"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="Short description of when this type applies"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <TypeBadge type={{ name: name || "Type name", color }} />
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

export default function OrgInstructionTypes({ organizationId }) {
  const { isAdmin } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editType, setEditType] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/instruction-types?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch types");
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.types || [];
      setTypes(
        [...list].sort((a, b) => {
          const ga = (a.groupType || a.group_type || "").localeCompare(
            b.groupType || b.group_type || "",
          );
          if (ga !== 0) return ga;
          return (a.position || 0) - (b.position || 0);
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
      const response = await api.delete(
        `/instruction-types/${deleteItem.id}?organizationId=${organizationId}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete type");
      }
      setDeleteItem(null);
      fetchTypes();
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
          Types are subcategories within a group (for example, an{" "}
          <span className="font-medium text-foreground">Emails</span> group can
          have <span className="font-medium text-foreground">Warmup</span>,{" "}
          <span className="font-medium text-foreground">Follow-up</span> and{" "}
          <span className="font-medium text-foreground">Farewell</span> types).
          An instruction can be attached to several types.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {types.length} type{types.length === 1 ? "" : "s"}
        </p>
        {isAdmin && (
          <button
            onClick={() => {
              setEditType(null);
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Type
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
      ) : types.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No types yet</p>
          {isAdmin && (
            <button
              onClick={() => {
                setEditType(null);
                setShowEditor(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Type
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((item) => {
            const meta = getGroupMeta(item.groupType || item.group_type);
            const GroupIcon = meta.icon;
            const count = item.instructionCount ?? item.instruction_count ?? 0;
            return (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={item} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      <GroupIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count} instruction{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{item.slug}</span>
                    {" · Created "}
                    {formatDate(item.createdAt || item.created_at)}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditType(item);
                        setShowEditor(true);
                      }}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <TypeEditor
          organizationId={organizationId}
          type={editType}
          onClose={() => {
            setShowEditor(false);
            setEditType(null);
          }}
          onSave={() => {
            setShowEditor(false);
            setEditType(null);
            fetchTypes();
          }}
        />
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete Type?
            </h3>
            <p className="text-muted-foreground mb-4">
              Deleting{" "}
              <span className="font-medium text-foreground">
                {deleteItem.name}
              </span>{" "}
              removes the type and its links.{" "}
              <span className="font-medium text-foreground">
                Instructions are not deleted
              </span>{" "}
              — any instruction that only used this type becomes general. This
              cannot be undone.
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

export { TypeBadge };
