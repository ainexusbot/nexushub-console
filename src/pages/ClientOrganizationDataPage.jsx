import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Building2,
  FileText,
  ListChecks,
  Loader2,
  Mail,
  Users,
} from "lucide-react";
import AdminDataCollection, {
  DateCell,
  Pill,
  TextPreview,
} from "../components/AdminDataCollection";
import { api, readError } from "../utils/api";

const NEWEST_SORT = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
];

const DATA_CONFIGS = {
  companies: {
    label: "Companies",
    icon: Building2,
    endpoint: "companies",
    collectionKey: "companies",
    detailKey: "company",
    detailEndpoint: (row) => `companies/${row.id}`,
    getTitle: (row) => row.name,
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search by company, industry or website...",
    filters: [
      {
        key: "source",
        label: "Source",
        options: [
          { value: "manual", label: "Manual" },
          { value: "bulk", label: "Bulk upload" },
        ],
      },
    ],
    sortOptions: [
      ...NEWEST_SORT,
      { value: "name:asc", label: "Name A–Z" },
      { value: "name:desc", label: "Name Z–A" },
      { value: "industry:asc", label: "Industry A–Z" },
    ],
    columns: [
      { key: "name", label: "Company", render: (row) => <span className="font-medium">{row.name}</span> },
      {
        key: "source",
        label: "Source",
        render: (row) => <Pill tone={row.source === "bulk" ? "warning" : "primary"}>{row.source || "manual"}</Pill>,
      },
      { key: "website", label: "Website", render: (row) => <TextPreview>{row.website}</TextPreview> },
      { key: "industry", label: "Industry", render: (row) => row.industry || "—" },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  batches: {
    label: "Company Lists",
    icon: Boxes,
    endpoint: "company-batches",
    collectionKey: "batches",
    detailKey: "batch",
    detailEndpoint: (row) => `company-batches/${row.id}`,
    getTitle: (row) => row.name,
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search company lists...",
    sortOptions: [
      ...NEWEST_SORT,
      { value: "name:asc", label: "Name A–Z" },
      { value: "name:desc", label: "Name Z–A" },
      { value: "updatedAt:desc", label: "Recently updated" },
    ],
    columns: [
      { key: "name", label: "List", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "companyCount", label: "Companies", render: (row) => row.companyCount ?? 0 },
      {
        key: "latestAnalysisId",
        label: "Analysis",
        render: (row) => row.latestAnalysisId ? <Pill tone="success">Available</Pill> : <span className="text-muted-foreground">Not run</span>,
      },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  people: {
    label: "People",
    icon: Users,
    endpoint: "people",
    collectionKey: "people",
    detailKey: "person",
    detailEndpoint: (row) => `people/${row.id}`,
    getTitle: (row) => row.name,
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search by person, role or company...",
    sortOptions: [
      ...NEWEST_SORT,
      { value: "name:asc", label: "Name A–Z" },
      { value: "name:desc", label: "Name Z–A" },
      { value: "role:asc", label: "Role A–Z" },
    ],
    columns: [
      { key: "name", label: "Person", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "role", label: "Role", render: (row) => row.role || "—" },
      { key: "companyName", label: "Company", render: (row) => row.companyName || "—" },
      { key: "website", label: "Website", render: (row) => <TextPreview>{row.website}</TextPreview> },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  analyses: {
    label: "Analyses",
    icon: BarChart3,
    endpoint: "analyses",
    collectionKey: "analyses",
    detailKey: "analysis",
    detailEndpoint: (row) => `analyses/${row.id}`,
    getTitle: (row) => row.companyName || row.batchName || row.personNames?.join(", ") || "Analysis",
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search analyses by company or person...",
    filters: [
      {
        key: "subject",
        label: "Subject",
        options: [
          { value: "company", label: "Company" },
          { value: "person", label: "Person" },
          { value: "batch", label: "Company list" },
        ],
      },
    ],
    sortOptions: [
      ...NEWEST_SORT,
      { value: "companyName:asc", label: "Company A–Z" },
      { value: "subject:asc", label: "Subject A–Z" },
    ],
    columns: [
      {
        key: "subject",
        label: "Type",
        render: (row) => <Pill tone={row.subject === "batch" ? "warning" : "primary"}>{row.subject}</Pill>,
      },
      {
        key: "entity",
        label: "Subject",
        render: (row) => <span className="font-medium">{row.companyName || row.batchName || row.personNames?.join(", ") || "—"}</span>,
      },
      {
        key: "result",
        label: "Result",
        render: (row) => <TextPreview>{row.result?.analysis}</TextPreview>,
      },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  emails: {
    label: "Generated Content",
    icon: Mail,
    endpoint: "emails",
    collectionKey: "emails",
    detailKey: "email",
    detailEndpoint: (row) => `emails/${row.id}`,
    getTitle: (row) => row.contentLabel || row.companyName || "Generated content",
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search by company, person, label or content...",
    filters: [{ key: "contentType", label: "Content type", type: "text" }],
    sortOptions: [
      ...NEWEST_SORT,
      { value: "companyName:asc", label: "Company A–Z" },
      { value: "personName:asc", label: "Person A–Z" },
      { value: "contentLabel:asc", label: "Label A–Z" },
      { value: "contentType:asc", label: "Type A–Z" },
    ],
    columns: [
      { key: "contentType", label: "Type", render: (row) => <Pill tone="primary">{row.contentLabel || row.contentType}</Pill> },
      { key: "companyName", label: "Company", render: (row) => row.companyName || "—" },
      { key: "personName", label: "Person", render: (row) => row.personName || "—" },
      { key: "text", label: "Content", render: (row) => <TextPreview>{row.text}</TextPreview> },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  templates: {
    label: "Templates",
    icon: FileText,
    endpoint: "templates",
    collectionKey: "templates",
    getTitle: (row) => row.name,
    defaultSort: "createdAt:desc",
    searchPlaceholder: "Search template name or text...",
    sortOptions: [
      ...NEWEST_SORT,
      { value: "name:asc", label: "Name A–Z" },
      { value: "name:desc", label: "Name Z–A" },
    ],
    columns: [
      { key: "name", label: "Template", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "text", label: "Text", render: (row) => <TextPreview>{row.text}</TextPreview> },
      { key: "createdAt", label: "Created", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
  members: {
    label: "Members",
    icon: Users,
    endpoint: "members",
    collectionKey: "members",
    getTitle: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.email,
    searchable: false,
    paginated: false,
    columns: [
      {
        key: "name",
        label: "Member",
        render: (row) => (
          <div>
            <p className="font-medium">{`${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unnamed user"}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        ),
      },
      { key: "orgRole", label: "Organization role", render: (row) => <Pill>{row.orgRole || row.org_role}</Pill> },
      { key: "createdAt", label: "Joined", render: (row) => <DateCell value={row.createdAt || row.created_at} /> },
    ],
  },
};

const TABS = [
  { id: "companies", label: "Companies", icon: Building2, count: "companies" },
  { id: "batches", label: "Company Lists", icon: Boxes, count: "companyBatches" },
  { id: "people", label: "People", icon: Users, count: "people" },
  { id: "analyses", label: "Analyses", icon: BarChart3, count: "analyses" },
  { id: "emails", label: "Content", icon: Mail, count: "emails" },
  { id: "templates", label: "Templates", icon: FileText, count: "templates" },
  { id: "members", label: "Members", icon: Users, count: null },
];

function CountCard({ label, value, detail, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-card rounded-xl border p-4 transition-colors ${
        active ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value ?? 0}</p>
          {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
        </div>
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
      </div>
    </button>
  );
}

export default function ClientOrganizationDataPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = DATA_CONFIGS[requestedTab] ? requestedTab : "companies";
  const [organization, setOrganization] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/admin/organizations/${id}`);
        if (!response.ok) throw new Error(await readError(response, "Failed to load organization data"));
        const data = await response.json();
        if (!cancelled) {
          setOrganization(data.organization);
          setCounts(data.counts || {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const selectTab = (value) => setSearchParams({ tab: value });

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !organization) {
    return (
      <div className="space-y-4">
        <Link to="/client-data" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to client data
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error || "Organization not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/client-data" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to client data
      </Link>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Client workspace data</p>
          <h1 className="text-2xl font-bold text-foreground truncate">{organization.name}</h1>
          <p className="text-muted-foreground mt-1">{organization.description || "No description"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <CountCard
          label="Companies"
          value={counts?.companies}
          detail={`${counts?.manualCompanies || 0} manual · ${counts?.bulkCompanies || 0} bulk`}
          icon={Building2}
          active={tab === "companies"}
          onClick={() => selectTab("companies")}
        />
        <CountCard label="Lists" value={counts?.companyBatches} icon={ListChecks} active={tab === "batches"} onClick={() => selectTab("batches")} />
        <CountCard label="People" value={counts?.people} icon={Users} active={tab === "people"} onClick={() => selectTab("people")} />
        <CountCard
          label="Analyses"
          value={counts?.analyses}
          detail={`${counts?.companyAnalyses || 0} companies · ${counts?.personAnalyses || 0} people`}
          icon={BarChart3}
          active={tab === "analyses"}
          onClick={() => selectTab("analyses")}
        />
        <CountCard label="Content" value={counts?.emails} icon={Mail} active={tab === "emails"} onClick={() => selectTab("emails")} />
        <CountCard label="Templates" value={counts?.templates} icon={FileText} active={tab === "templates"} onClick={() => selectTab("templates")} />
      </div>

      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => selectTab(item.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 -mb-px text-sm font-medium transition-colors ${
                tab === item.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.count && (
                <span className="px-1.5 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  {counts?.[item.count] || 0}
                </span>
              )}
              {item.id === "members" && (
                <span className="px-1.5 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
                  {organization.memberCount || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AdminDataCollection
        key={tab}
        organizationId={id}
        config={DATA_CONFIGS[tab]}
      />
    </div>
  );
}
