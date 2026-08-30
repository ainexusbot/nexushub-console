import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, formatDate } from '../utils/api'
import { ArrowLeft, Building2, Users, FileText, Tag, LayoutGrid } from 'lucide-react'
import OrgMembers from '../components/OrgMembers'
import OrgInstructions from '../components/OrgInstructions'
import OrgInstructionTypes from '../components/OrgInstructionTypes'
import OrgContentTypes from '../components/OrgContentTypes'
import OrgTagSelector from '../components/OrgTagSelector'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'members', label: 'Members', icon: Users },
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'types', label: 'Instruction Types', icon: Tag },
  { id: 'content-types', label: 'Content Buttons', icon: LayoutGrid },
]

export default function OrganizationDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('members')

  useEffect(() => {
    fetchOrg()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchOrg = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/organizations/${id}`)
      if (!response.ok) throw new Error('Failed to load organization')
      const data = await response.json()
      // The single-organization endpoint may wrap the payload (e.g.
      // { organization: {...} } or { data: {...} }) instead of returning the
      // org object at the top level. Unwrap it so name/description/tags resolve.
      const raw = data.organization || data.org || data.data || data
      // Normalize the tags field regardless of the API's naming.
      const tags = raw.tags || raw.tagList || raw.tag_list || []
      setOrg({ ...raw, tags })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="space-y-4">
        <Link
          to="/organizations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to organizations
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error || 'Organization not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to organizations
      </Link>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
          <p className="text-muted-foreground mt-1">{org.description || 'No description'}</p>
          <div className="mt-2">
            <OrgTagSelector
              organizationId={org.id}
              tags={org.tags || []}
              canEdit={isAdmin}
              onChange={(nextTags) => setOrg((prev) => ({ ...prev, tags: nextTags }))}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Created {formatDate(org.created_at || org.createdAt)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'members' && <OrgMembers organizationId={id} />}
      {tab === 'instructions' && <OrgInstructions organizationId={id} />}
      {tab === 'types' && <OrgInstructionTypes organizationId={id} />}
      {tab === 'content-types' && <OrgContentTypes organizationId={id} />}
    </div>
  )
}
