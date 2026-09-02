import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationDetailPage from './pages/OrganizationDetailPage'
import UsersPage from './pages/UsersPage'
import TagsPage from './pages/TagsPage'
import AiModelsPage from './pages/AiModelsPage'
import AiProviderKeysPage from './pages/AiProviderKeysPage'
import ClientDataPage from './pages/ClientDataPage'
import ClientOrganizationDataPage from './pages/ClientOrganizationDataPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
                <Route path="/client-data" element={<ClientDataPage />} />
                <Route path="/client-data/:id" element={<ClientOrganizationDataPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/ai-models" element={<AiModelsPage />} />
                <Route path="/ai-provider-keys" element={<AiProviderKeysPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
