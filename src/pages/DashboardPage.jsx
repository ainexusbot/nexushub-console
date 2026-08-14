import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, formatDate } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import {
  Building2,
  Users,
  FileText,
  ArrowRight,
  Plus,
} from 'lucide-react'

function StatCard({ title, value, subtitle, icon: Icon, href }) {
  const content = (
    <div className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 transition-colors h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  )

  if (href) return <Link to={href}>{content}</Link>
  return content
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgsRes, usersRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/users'),
      ])

      if (orgsRes.ok) {
        const data = await orgsRes.json()
        setOrganizations(Array.isArray(data) ? data : data.results || [])
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(Array.isArray(data) ? data : data.results || [])
      }
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

  const executives = users.filter((u) => u.role === 'executive').length
  const managers = users.filter((u) => u.role === 'manager').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.email ? `, ${user.email}` : ''} — overview of your workspace
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Organizations"
          value={organizations.length}
          subtitle="Active workspaces"
          icon={Building2}
          href="/organizations"
        />
        <StatCard
          title="Project Users"
          value={executives + managers}
          subtitle={`${executives} executive · ${managers} manager`}
          icon={Users}
          href="/users"
        />
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle="Including admins"
          icon={Users}
          href="/users"
        />
      </div>

      {/* Recent Organizations */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Organizations</h2>
          <Link
            to="/organizations"
            className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {organizations.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No organizations yet</p>
            <Link
              to="/organizations"
              className="text-sm text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Create your first organization
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {organizations.slice(0, 6).map((org) => (
              <Link
                key={org.id}
                to={`/organizations/${org.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {org.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground hidden sm:flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {org.instruction_count ?? org.instructionsCount ?? 0}
                  </span>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    {formatDate(org.created_at || org.createdAt)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
