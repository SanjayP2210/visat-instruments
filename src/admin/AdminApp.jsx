// Admin panel (/admin). Lazy-loaded and kept out of the public site's layout; all data
// access is authorised by the backend (session cookie + CSRF token + role checks).
import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AdminLayout from './components/AdminLayout'
import { MediaStatusProvider } from './components/MediaStatus'
import { ToastProvider } from './components/Toast'
import { Spinner } from './components/ui'
import BrandingPage from './pages/BrandingPage'
import BusinessProfilePage from './pages/BusinessProfilePage'
import ContentPage from './pages/ContentPage'
import DashboardPage from './pages/DashboardPage'
import EnquiriesPage from './pages/EnquiriesPage'
import GalleryPage from './pages/GalleryPage'
import LoginPage from './pages/LoginPage'
import { BrandForm, BrandList, CategoryForm, CategoryList, ProductForm, ProductList, ServiceForm, ServiceList, TestimonialForm, TestimonialList, UserForm, UserList } from './pages/resources'
import SeoPage from './pages/SeoPage'

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = 'Admin | VISAT INSTRUMENTS'
    return () => {
      meta.remove()
      document.title = title
    }
  }, [])
}

function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Spinner label="Checking your session…" className="p-10" />
  if (status !== 'signed-in') return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return (
      <div className="card max-w-lg p-6" role="alert">
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-steel-600">Your account (Editor) cannot manage users. Ask an Admin if you need access.</p>
      </div>
    )
  }
  return children
}

const crudRoutes = (path, List, Form) => [
  <Route key={`${path}`} path={path} element={<List />} />,
  <Route key={`${path}-new`} path={`${path}/new`} element={<Form />} />,
  <Route key={`${path}-edit`} path={`${path}/:id`} element={<Form />} />,
]

export default function AdminApp() {
  useNoIndex()
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <MediaStatusProvider>
                  <AdminLayout />
                </MediaStatusProvider>
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            {crudRoutes('products', ProductList, ProductForm)}
            {crudRoutes('categories', CategoryList, CategoryForm)}
            {crudRoutes('brands', BrandList, BrandForm)}
            {crudRoutes('services', ServiceList, ServiceForm)}
            {crudRoutes('reviews', TestimonialList, TestimonialForm)}
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="business-profile" element={<BusinessProfilePage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="seo" element={<SeoPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="users" element={<RequireAdmin><UserList /></RequireAdmin>} />
            <Route path="users/new" element={<RequireAdmin><UserForm /></RequireAdmin>} />
            <Route path="users/:id" element={<RequireAdmin><UserForm /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
