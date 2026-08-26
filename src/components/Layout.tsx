import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { User } from '../types'
import './Layout.css'

export function Layout({ children, user }: { children: ReactNode; user?: User | null }) {
  const client = useQueryClient()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const isLandingPage = location.pathname === '/'
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' })
    client.setQueryData(['me'], null)
    window.location.assign('/')
  }
  const name = user && [user.first_name, user.last_name].filter(Boolean).join(' ')
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` || user.email[0].toUpperCase() : ''
  const cancelMenuClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const scheduleMenuClose = () => {
    cancelMenuClose()
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 500)
  }
  const handleMenuBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleMenuClose()
  }
  useEffect(() => () => cancelMenuClose(), [])
  return <>
    <header className="site-header">
      {isLandingPage ? <a href="https://ceico.cz" className="brand" aria-label="Visit the CEICO institutional website">
        <img src="/brand/ceico-logo-color-negative.svg" alt="CEICO" />
        <span>Academic opportunities</span>
      </a> : <Link to="/" className="brand" aria-label="CEICO opportunities portal home">
        <img src="/brand/ceico-logo-color-negative.svg" alt="CEICO" />
        <span>Academic opportunities</span>
      </Link>}
      {!isLandingPage && <nav aria-label="Main navigation">
        <NavLink to="/openings">Open positions</NavLink>
        {user && <NavLink to="/dashboard">My dashboard</NavLink>}
        {user && (user.organizer_approved || user.campaign_operator) && <NavLink to="/organizer">Campaigns</NavLink>}
        {user?.is_system_admin && <NavLink to="/admin">Portal admin</NavLink>}
        {user ? <div className="user-menu" onMouseEnter={cancelMenuClose} onMouseLeave={scheduleMenuClose} onFocus={cancelMenuClose} onBlur={handleMenuBlur} onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false) }}><button type="button" className="user-menu-trigger" aria-expanded={menuOpen} aria-controls="user-menu-panel" onClick={() => setMenuOpen((open) => !open)}><span className="user-avatar">{initials}</span><span className="user-identity"><strong>{name || user.email}</strong><small>{user.email}</small></span><span aria-hidden="true">⌄</span></button>{menuOpen && <div className="user-menu-panel" id="user-menu-panel">{user.can_edit_profile && <><Link to="/profile" onClick={() => setMenuOpen(false)}>My profile</Link><div className="user-menu-divider" role="separator" /></>}<div className="user-role">{user.is_system_admin ? 'Portal administrator' : user.organizer_approved ? 'Organizer' : user.campaign_operator ? 'Campaign operator' : 'Signed in'}</div><Link to="/dashboard" onClick={() => setMenuOpen(false)}>My dashboard</Link>{(user.organizer_approved || user.campaign_operator) && <Link to="/organizer" onClick={() => setMenuOpen(false)}>Campaigns</Link>}{user.is_system_admin && <Link to="/admin" onClick={() => setMenuOpen(false)}>People and roles</Link>}<button type="button" onClick={logout}>Sign out</button></div>}</div> : <Link className="button ghost" to="/login">Sign in</Link>}
      </nav>}
    </header>
    <main>{children}</main>
    <footer><span>(c) CEICO 2026</span><span>Privacy · Accessibility · Contact</span></footer>
  </>
}

export function StatusPill({ status }: { status: string }) {
  const positive = ['review_ready', 'override_ready', 'submitted', 'selected'].includes(status)
  const caution = ['awaiting_references', 'assigned', 'invited', 'waitlisted'].includes(status)
  const negative = ['conflict', 'withdrawn', 'rejected'].includes(status)
  const symbol = positive ? '✓' : caution ? '◷' : negative ? '!' : '•'
  return <span className={`status status-${status.replaceAll('_', '-')}`}><span aria-hidden="true">{symbol}</span>{status.replaceAll('_', ' ')}</span>
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><div className="empty-icon">◎</div><h2>{title}</h2><p>{children}</p></div>
}
