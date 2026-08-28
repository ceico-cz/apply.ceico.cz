import { useQuery } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, ApiError } from './api'
import { Layout } from './components/Layout'
import { HomePage, OpeningsPage, OpeningPage } from './pages/PublicPages'
import { AuthConsumePage, LoginPage } from './pages/LoginPage'
import { ApplicationPage } from './pages/ApplicationPage'
import { DashboardPage } from './pages/DashboardPage'
import { RefereePage } from './pages/RefereePage'
import { EvaluatorPage } from './pages/EvaluatorPage'
import { OrganizerPage } from './pages/OrganizerPage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { AssignmentMatrixPage } from './pages/AssignmentMatrixPage'
import { AuditLogPage, CampaignAuditLogPage, OrganizerAuditLogPage } from './pages/AuditLogPage'
import type { User } from './types'

export default function App() {
  const me = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: async () => { try { return await api<User>('/auth/me') } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e } },
  })
  if (me.isLoading) return <div className="app-loading">Loading portal…</div>
  const user = me.data
  return <Layout user={user}>
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
      <Route path="/openings" element={<OpeningsPage />} />
      <Route path="/openings/:slug" element={<OpeningPage user={user} />} />
      <Route path="/auth/consume" element={<AuthConsumePage user={user} />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/apply/:slug" element={user ? <ApplicationPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/referee" element={user ? <RefereePage /> : <Navigate to="/login" replace />} />
      <Route path="/referee/:requestId" element={user ? <RefereePage /> : <Navigate to="/login" replace />} />
      <Route path="/evaluate" element={user ? <EvaluatorPage /> : <Navigate to="/login" replace />} />
      <Route path="/organizer/campaigns/:campaignId/assignments" element={user && (user.organizer_approved || user.campaign_operator) ? <AssignmentMatrixPage /> : <Navigate to="/" replace />} />
      <Route path="/organizer/campaigns/:campaignId/audit" element={user && (user.organizer_approved || user.campaign_operator) ? <CampaignAuditLogPage /> : <Navigate to="/" replace />} />
      <Route path="/organizer/audit" element={user && (user.organizer_approved || user.campaign_operator) ? <OrganizerAuditLogPage /> : <Navigate to="/" replace />} />
      <Route path="/organizer/*" element={user && (user.organizer_approved || user.campaign_operator) ? <OrganizerPage canCreate={user.organizer_approved} /> : <Navigate to="/" replace />} />
      <Route path="/admin/audit" element={user?.is_system_admin ? <AuditLogPage /> : <Navigate to="/" replace />} />
      <Route path="/admin" element={user?.is_system_admin ? <AdminPage currentUser={user} /> : <Navigate to="/" replace />} />
      <Route path="/profile" element={user?.can_edit_profile ? <ProfilePage user={user} /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>
}
