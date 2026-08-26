import { Link, NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { User } from '../types'

export function Layout({ children, user }: { children: ReactNode; user?: User | null }) {
  const client = useQueryClient()
  const location = useLocation()
  const isLandingPage = location.pathname === '/'
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' })
    client.setQueryData(['me'], null)
    window.location.assign('/')
  }
  const name = user && [user.first_name, user.last_name].filter(Boolean).join(' ')
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` || user.email[0].toUpperCase() : ''
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
        {user?.organizer_approved && <NavLink to="/organizer">Organizer</NavLink>}
        {user?.is_system_admin && <NavLink to="/admin">Portal admin</NavLink>}
        {user ? <details className="user-menu"><summary><span className="user-avatar">{initials}</span><span className="user-identity"><strong>{name || user.email}</strong><small>{user.email}</small></span><span aria-hidden="true">⌄</span></summary><div className="user-menu-panel"><div className="user-role">{user.is_system_admin ? 'Portal administrator' : user.organizer_approved ? 'Organizer' : 'Signed in'}</div><Link to="/dashboard">My dashboard</Link>{user.organizer_approved && <Link to="/organizer">Campaigns</Link>}{user.is_system_admin && <Link to="/admin">People and roles</Link>}<button type="button" onClick={logout}>Sign out</button></div></details> : <Link className="button ghost" to="/login">Sign in</Link>}
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
