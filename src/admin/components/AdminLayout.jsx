import {
  Award,
  ChartColumn,
  Globe,
  History,
  Building2,
  FileText,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  MousePointerClick,
  Package,
  Palette,
  Search,
  ServerCrash,
  Tags,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export const NAV = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    group: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/brands', label: 'Brands', icon: Award },
      { to: '/admin/services', label: 'Services', icon: Wrench },
      { to: '/admin/gallery', label: 'Gallery', icon: Images },
    ],
  },
  {
    group: 'Business',
    items: [
      { to: '/admin/business-profile', label: 'Business profile', icon: Building2 },
      { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
      { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
    ],
  },
  {
    group: 'Website settings',
    items: [
      { to: '/admin/content', label: 'Website content', icon: FileText },
      { to: '/admin/seo', label: 'SEO settings', icon: Search },
      { to: '/admin/branding', label: 'Branding & Media', icon: Palette },
    ],
  },
  {
    group: 'Analytics & Logs',
    adminOnly: true,
    items: [
      { to: '/admin/analytics', label: 'Overview', icon: ChartColumn, end: true },
      { to: '/admin/analytics/visitors', label: 'Visitor analytics', icon: Globe },
      { to: '/admin/analytics/activity', label: 'Visitor activity', icon: MousePointerClick },
      { to: '/admin/logs/system', label: 'System logs', icon: ServerCrash },
      { to: '/admin/logs/admin-activity', label: 'Admin activity', icon: History },
    ],
  },
  { group: 'Administration', adminOnly: true, items: [{ to: '/admin/users', label: 'Users', icon: Users }] },
]

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-navy-100/75 hover:bg-white/5 hover:text-white'}`

function Sidebar({ isAdmin, onNavigate }) {
  return (
    <nav aria-label="Admin" className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5">
      {NAV.filter((g) => !g.adminOnly || isAdmin).map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[11px] font-bold tracking-widest text-navy-100/50 uppercase">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={navClass} onClick={onNavigate}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const brand = (
    <Link to="/admin" className="flex items-center gap-2.5 px-4 py-4" aria-label="VISAT INSTRUMENTS admin home">
      <img src="/images/branding/visat-instruments-logo-160.png" alt="" className="h-10 w-10 rounded-md bg-white object-contain p-0.5" />
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold text-white">VISAT INSTRUMENTS</span>
        <span className="block text-[11px] font-semibold tracking-wider text-accent-400 uppercase">Admin panel</span>
      </span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-navy-50 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-navy-950 lg:flex">
        {brand}
        <Sidebar isAdmin={isAdmin} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-950">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-white hover:bg-white/10" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <Sidebar isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-steel-200 bg-white px-4 sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-md hover:bg-navy-50 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to="/" target="_blank" rel="noopener noreferrer" className="hidden text-sm font-semibold text-steel-600 hover:text-navy-900 sm:inline">
            View website ↗
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-right leading-tight">
              <span className="block text-sm font-semibold text-navy-900">{user?.name}</span>
              <span className="block text-xs text-steel-500 capitalize">{user?.role}</span>
            </span>
            <button type="button" onClick={logout} className="btn-outline px-3 py-2 text-xs">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

