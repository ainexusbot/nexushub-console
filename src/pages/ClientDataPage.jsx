import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { api, formatDate, readError } from "../utils/api";
import TagBadge from "../components/TagBadge";

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
  { value: "memberCount:desc", label: "Most members" },
];

export default function ClientDataPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("createdAt:desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sort, order] = sortValue.split(":");
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
        order,
      });
      if (search) params.set("search", search);
      const response = await api.get(`/admin/organizations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(await readError(response, "Failed to load organizations"));
      }
      const data = await response.json();
      setOrganizations(data.organizations || []);
      setTotal(data.total || 0);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortValue]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const pageCount = pagination?.pageCount || Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = pagination?.page || page;
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, start + organizations.length - 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Data</h1>
          <p className="text-muted-foreground mt-1">
            Browse companies, people, analyses and generated content by organization
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search organizations by name or description..."
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        <select
          value={sortValue}
          onChange={(event) => {
            setSortValue(event.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-11 h-11 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No organizations found</p>
          <p className="text-sm text-muted-foreground mt-1">Try changing the search query.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Organization</th>
                  <th className="text-left font-medium px-4 py-3">Tags</th>
                  <th className="text-left font-medium px-4 py-3">Members</th>
                  <th className="text-left font-medium px-4 py-3">Created</th>
                  <th className="w-12 px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((organization) => (
                  <tr
                    key={organization.id}
                    onClick={() => navigate(`/client-data/${organization.id}`)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-60">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{organization.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-sm">
                            {organization.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 min-w-32">
                        {(organization.tags || []).slice(0, 3).map((tag) => (
                          <TagBadge key={tag.id} tag={tag} />
                        ))}
                        {(organization.tags || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">+{organization.tags.length - 3}</span>
                        )}
                        {(organization.tags || []).length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> {organization.memberCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(organization.createdAt || organization.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="w-4 h-4 text-muted-foreground inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && total > 0 && (
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
    </div>
  );
}
