import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RedditAccountsPage from './pages/RedditAccountsPage'
import PostsPage from './pages/PostsPage'
import ProxiesPage from './pages/ProxiesPage'
import UsersPage from './pages/UsersPage'
import AccountPostsPage from './pages/AccountPostsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import SubredditsPage from './pages/SubredditsPage'
import CommentsPage from './pages/CommentsPage'
import TagsPage from './pages/TagsPage'
import FeedPage from './pages/FeedPage'
import CommentRepliesPage from './pages/CommentRepliesPage'

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
                <Route path="/reddit-accounts" element={<RedditAccountsPage />} />
                <Route path="/posts" element={<PostsPage section="all" />} />
                <Route path="/posts/submit" element={<PostsPage section="submit" />} />
                <Route path="/comments" element={<CommentsPage section="all" />} />
                <Route path="/comments/submit" element={<CommentsPage section="submit" />} />
                <Route path="/comment-replies" element={<CommentRepliesPage />} />
                <Route path="/subreddits" element={<SubredditsPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/account-posts" element={<AccountPostsPage />} />
                <Route
                  path="/account-posts/:accountId"
                  element={<AccountDetailPage section="posts" />}
                />
                <Route
                  path="/account-posts/:accountId/settings"
                  element={<AccountDetailPage section="settings" />}
                />
                <Route path="/feed-browse" element={<FeedPage />} />
                <Route path="/proxies" element={<ProxiesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
