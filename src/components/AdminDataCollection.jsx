import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { api, formatDate, readError } from "../utils/api";

const PAGE_SIZE = 20;

function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function DetailValue({ value }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "number") return <span>{value}</span>;
  if (typeof value === "string") {
    const isLong = value.length > 180 || value.includes("\n");
    return isLong ? (
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/60 border border-border p-3 text-sm font-sans max-h-80 overflow-y-auto">
        {value}
      </pre>
    ) : (
      <span className="break-words">{value}</span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    if (value.every((item) => ["string", "number"].includes(typeof item))) {
      return <span className="break-words">{value.join(", ")}</span>;
    }
  }
  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/60 border border-border p-3 text-xs max-h-96 overflow-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function RecordModal({ title, record, loading, error, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Record details
            </p>
            <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-73px)]">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              {error}
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-x-5 gap-y-4">
              {Object.entries(record || {}).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-sm font-medium text-muted-foreground md:pt-0.5">
                    {humanize(key)}
                  </dt>
                  <dd className="text-sm text-foreground min-w-0">
                    <DetailValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function defaultTitle(row, config) {
  return (
    config.getTitle?.(row) ||
    row?.name ||
    row?.title ||
    row?.companyName ||
    row?.email ||
    "Record"
  );
}

export function DateCell({ value }) {
  return <span className="whitespace-nowrap text-muted-foreground">{formatDate(value)}</span>;
}

export function TextPreview({ children, className = "" }) {
  const text = typeof children === "string" ? children : "";
  return (
    <span className={`block max-w-md truncate text-muted-foreground ${className}`} title={text}>
      {text || "—"}
    </span>
  );
}

export function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-amber-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}

export default function AdminDataCollection({ organizationId, config }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState(config.defaultSort || "createdAt:desc");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (config.paginated !== false) {
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
      }
      if (search) params.set("search", search);
      if (sortValue && config.sortOptions?.length) {
        const [sort, order] = sortValue.split(":");
        params.set("sort", sort);
        params.set("order", order || "desc");
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const suffix = params.toString() ? `?${params.toString()}` : "";
      const response = await api.get(
        `/admin/organizations/${organizationId}/${config.endpoint}${suffix}`,
      );
      if (!response.ok) throw new Error(await readError(response, `Failed to load ${config.label.toLowerCase()}`));
      const data = await response.json();
      const list = Array.isArray(data) ? data : data[config.collectionKey] || [];
      setRows(list);
      setTotal(typeof data.total === "number" ? data.total : list.length);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config, filters, organizationId, page, search, sortValue]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openDetail = async (row) => {
    setDetail(row);
    setDetailError(null);
    if (!config.detailEndpoint) return;
    setDetailLoading(true);
    try {
      const response = await api.get(
        `/admin/organizations/${organizationId}/${config.detailEndpoint(row)}`,
      );
      if (!response.ok) throw new Error(await readError(response, "Failed to load record"));
      const data = await response.json();
      setDetail(data[config.detailKey] || data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const pageCount = pagination?.pageCount || Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = pagination?.page || page;
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, start + rows.length - 1);
  const hasToolbar =
    config.searchable !== false ||
    (config.filters || []).length > 0 ||
    (config.sortOptions || []).length > 0;

  return (
    <div className="space-y-4">
      {hasToolbar && (
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col xl:flex-row gap-3 xl:items-center">
        {config.searchable !== false && (
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={config.searchPlaceholder || `Search ${config.label.toLowerCase()}...`}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {(config.filters || []).map((filter) =>
          filter.type === "text" ? (
            <input
              key={filter.key}
              value={filters[filter.key] || ""}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }));
                setPage(1);
              }}
              placeholder={filter.label}
              className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <select
              key={filter.key}
              value={filters[filter.key] || ""}
              onChange={(event) => {
                setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }));
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{filter.label}: All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ),
        )}

        {config.sortOptions?.length > 0 && (
          <select
            value={sortValue}
            onChange={(event) => {
              setSortValue(event.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {config.sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} {config.label.toLowerCase()}
          </p>
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <config.icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No {config.label.toLowerCase()} found</p>
            <p className="text-sm text-muted-foreground mt-1">Try changing the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key} className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                  <th className="w-12 px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDetail(row)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    {config.columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 align-top text-foreground">
                        {column.render ? column.render(row) : row[column.key] || "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Eye className="w-4 h-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {config.paginated !== false && !loading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing {start}–{end} of {total}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-muted-foreground tabular-nums">{currentPage} / {pageCount}</span>
            <button
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {detail && (
        <RecordModal
          title={defaultTitle(detail, config)}
          record={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setDetail(null);
            setDetailError(null);
          }}
        />
      )}
    </div>
  );
}
