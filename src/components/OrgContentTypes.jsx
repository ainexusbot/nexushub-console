import { useState, useEffect } from "react";
import { api, formatDate } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  LayoutGrid,
  Loader2,
  Info,
} from "lucide-react";
import {
  CONTENT_TYPE_ICONS,
  getContentTypeIcon,
  CONTENT_TYPE_COLOR_PRESETS,
  DEFAULT_CONTENT_ICON,
  DEFAULT_CONTENT_COLOR,
} from "../constants/contentTypeIcons";

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A live preview of the button exactly as the client will see it: icon + name
// with the chosen accent color. This is a single-select button on the client.
function ButtonPreview({ name, icon, color }) {
  const Icon = getContentTypeIcon(icon);
  const accent = color || DEFAULT_CONTENT_COLOR;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
      style={{
        borderColor: `${accent}55`,
        backgroundColor: `${accent}12`,
        color: accent,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {name || "Button label"}
    </button>
  );
}

function ContentTypeEditor({ organizationId, type, onClose, onSave }) {
  const isEdit = !!type;
  const [name, setName] = useState(type?.name || "");
  const [slug, setSlug] = useState(type?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!type?.slug);
  const [icon, setIcon] = useState(type?.icon || DEFAULT_CONTENT_ICON);
  const [color, setColor] = useState(type?.color || DEFAULT_CONTENT_COLOR);
  const [description, setDescription] = useState(type?.description || "");
  const [instruction, setInstruction] = useState(type?.instruction || "");
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
        icon,
        color,
        description: description.trim(),
        instruction: instruction.trim(),
        position: Number.isFinite(parseInt(position, 10))
          ? parseInt(position, 10)
          : 0,
      };
      const trimmedSlug = slug.trim();
      if (trimmedSlug) input.slug = trimmedSlug;

      const payload = isEdit ? { input } : { organizationId, input };
      const response = isEdit
        ? await api.put(`/content-types/${type.id}`, payload)
        : await api.post("/content-types", payload);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
          throw new Error(
            data.error ||
              "A button with this name already exists in this organization.",
          );
        }
        throw new Error(data.error || data.message || "Failed to save button");
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
            {isEdit ? "Edit Button" : "New Button"}
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
              placeholder="LinkedIn Post"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Icon *
            </label>
            <div className="grid grid-cols-8 gap-2">
              {CONTENT_TYPE_ICONS.map((opt) => {
                const Icon = opt.icon;
                const active = icon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIcon(opt.key)}
                    title={opt.label}
                    aria-label={opt.label}
                    className={`flex items-center justify-center h-9 rounded-lg border transition-colors ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
                placeholder="linkedin"
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
              Accent color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CONTENT_TYPE_COLOR_PRESETS.map((preset) => (
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
              placeholder="Short label shown under the button"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Instruction *
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              required
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="Write as a public LinkedIn post: a hook in the first line, 3–5 short paragraphs, 3 hashtags at the end."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Injected as the first block of the prompt when a client selects
              this button. Group and global instructions are layered on top.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <ButtonPreview name={name} icon={icon} color={color} />
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

export default function OrgContentTypes({ organizationId }) {
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
        `/content-types?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch buttons");
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.contentTypes || data.types || [];
      setTypes(
        [...list].sort((a, b) => (a.position || 0) - (b.position || 0)),
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
        `/content-types/${deleteItem.id}?organizationId=${organizationId}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete button");
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
          Buttons define{" "}
          <span className="font-medium text-foreground">what</span> the client
          generates content for (
          <span className="font-medium text-foreground">LinkedIn Post</span>,{" "}
          <span className="font-medium text-foreground">Email campaign</span>,{" "}
          <span className="font-medium text-foreground">Event invite</span>).
          The client picks exactly one, and its{" "}
          <span className="font-medium text-foreground">instruction</span> is
          injected first into the prompt. Each button&apos;s set is unique to
          this organization.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {types.length} button{types.length === 1 ? "" : "s"}
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
            New Button
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
          <LayoutGrid className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No buttons yet</p>
          {isAdmin && (
            <button
              onClick={() => {
                setEditType(null);
                setShowEditor(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Button
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((item) => {
            const Icon = getContentTypeIcon(item.icon);
            const accent = item.color || DEFAULT_CONTENT_COLOR;
            return (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${accent}1a`,
                      color: accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <span className="font-mono">#{item.position ?? 0}</span>
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.instruction && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
                        “{item.instruction}”
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{item.slug}</span>
                      {" · Created "}
                      {formatDate(item.createdAt || item.created_at)}
                    </p>
                  </div>
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
        <ContentTypeEditor
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
              Delete Button?
            </h3>
            <p className="text-muted-foreground mb-4">
              Deleting{" "}
              <span className="font-medium text-foreground">
                {deleteItem.name}
              </span>{" "}
              removes this button and its instruction from the client. This
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
