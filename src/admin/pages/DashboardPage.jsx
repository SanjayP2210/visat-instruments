import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { NAV } from '../components/AdminLayout'
import { ErrorState, PageHeader, Spinner } from '../components/ui'

const STATS = [
  { key: 'products', label: 'Products', to: '/admin/products' },
  { key: 'categories', label: 'Categories', to: '/admin/categories' },
  { key: 'services', label: 'Services', to: '/admin/services' },
  { key: 'galleryImages', label: 'Gallery images', to: '/admin/gallery' },
  { key: 'pendingEnquiries', label: 'Pending enquiries', to: '/admin/enquiries?status=new', highlight: true },
  { key: 'pendingReviews', label: 'Reviews awaiting approval', to: '/admin/reviews?status=pending', highlight: true },
  { key: 'publishedReviews', label: 'Published reviews', to: '/admin/reviews?published=true' },
]

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const load = () => {
    setError(null)
    api.get('/dashboard').then(({ data }) => setStats(data)).catch(setError)
  }
  useEffect(load, [])

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} description="Overview of the VISAT INSTRUMENTS website content." />
      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : !stats ? (
        <Spinner />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STATS.map((s) => (
            <li key={s.key}>
              <Link to={s.to} className={`card flex items-center justify-between gap-4 p-5 transition-colors hover:border-navy-900 ${s.highlight && stats[s.key] > 0 ? 'border-accent-500' : ''}`}>
                <span>
                  <span className="block text-sm font-semibold text-steel-600">{s.label}</span>
                  <span className="mt-1 block font-display text-4xl font-bold text-navy-900" data-testid={`stat-${s.key}`}>
                    {stats[s.key]}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-steel-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 mb-4 text-xl font-bold">Quick navigation</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {NAV.filter((g) => g.group !== 'Overview' && (!g.adminOnly || isAdmin)).map((g) => (
          <section key={g.group} className="card p-4">
            <h3 className="text-sm font-bold tracking-wider text-steel-500 uppercase">{g.group}</h3>
            <ul className="mt-2 space-y-1">
              {g.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-navy-900 hover:bg-navy-50">
                    <Icon className="h-4 w-4 text-accent-600" aria-hidden="true" /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
