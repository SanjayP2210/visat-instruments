import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <section className="section">
      <div className="container-x max-w-xl text-center">
        <p className="font-display text-7xl font-bold text-accent-500">404</p>
        <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-steel-600">The page you are looking for does not exist or has been moved.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-navy">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link to="/products" className="btn-outline">
            View products
          </Link>
        </div>
      </div>
    </section>
  )
}
