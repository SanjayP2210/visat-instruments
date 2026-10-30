import { MapPin, Menu, Phone, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { business } from '../../data/business'
import Logo from '../common/Logo'
import { navLinks } from './navigation'

const desktopLinkClass = ({ isActive }) =>
  `relative px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3 ${
    isActive
      ? 'text-navy-900 after:absolute after:inset-x-2.5 after:-bottom-[17px] after:h-0.5 after:bg-accent-500'
      : 'text-steel-600 hover:text-navy-900'
  }`

const mobileLinkClass = ({ isActive }) =>
  `flex items-center justify-between rounded-md px-4 py-3 text-base font-semibold ${
    isActive ? 'bg-navy-50 text-navy-900' : 'text-steel-600 hover:bg-navy-50 hover:text-navy-900'
  }`

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <div className="hidden bg-navy-950 text-xs text-navy-100/80 md:block">
        <div className="container-x flex h-9 items-center justify-between">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            Chandlodiya, Ahmedabad, Gujarat
          </p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" aria-hidden="true" />
              {business.rating.value.toFixed(1)} on {business.rating.source} ({business.rating.count} reviews)
            </span>
            <a href={`tel:${business.phone.tel}`} className="flex items-center gap-1.5 font-semibold text-white hover:text-accent-400">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {business.phone.display}
            </a>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow ${
          scrolled ? 'border-steel-200 shadow-[0_6px_20px_-12px_rgb(11_31_58/0.25)]' : 'border-transparent'
        }`}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className={desktopLinkClass}>
                    <span className="xl:hidden">{link.shortLabel ?? link.label}</span>
                    <span className="hidden xl:inline">{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/contact" className="btn-primary hidden py-2.5 sm:inline-flex">
              Get a Quote
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md text-navy-900 hover:bg-navy-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise become the
          containing block for this fixed overlay and clip it. */}
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="animate-fade-in fixed inset-0 z-50 overflow-y-auto bg-white lg:hidden"
        >
          <div className="container-x flex h-16 items-center justify-between border-b border-steel-200">
            <Logo />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md text-navy-900 hover:bg-navy-50"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              autoFocus
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-x py-4">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} className={mobileLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 border-t border-steel-200 pt-6">
              <a href={`tel:${business.phone.tel}`} className="btn-navy">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {business.phone.display}
              </a>
              <Link to="/contact" className="btn-primary">
                Get a Quote
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
