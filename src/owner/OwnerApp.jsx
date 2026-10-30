// Private owner-information area. Loaded lazily and kept out of the public site's
// layout and navigation; all data access is authorised server-side.
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import OwnerLayout from './components/OwnerLayout'
import DraftsPage from './pages/DraftsPage'
import OwnerFormPage from './pages/OwnerFormPage'
import SubmissionDetailPage from './pages/SubmissionDetailPage'
import SubmissionsPage from './pages/SubmissionsPage'

export default function OwnerApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<OwnerLayout />}>
          <Route index element={<OwnerFormPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="submissions/:id" element={<SubmissionDetailPage />} />
          <Route path="*" element={<Navigate to="/owner-information" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
