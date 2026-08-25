import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { User } from '../types'

export function Layout({ children, user }: { children: ReactNode; user?: User | null }) {
  return <>
    <header className="site-header">
      <Link to="/" className="brand"><span className="brand-mark">C</span><span>CEICO <small>Academic opportunities</small></span></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/openings">Open positions</NavLink>
        {user && <NavLink to="/dashboard">My dashboard</NavLink>}
        {user?.organizer_approved && <NavLink to="/organizer">Organizer</NavLink>}
        {user ? <span className="user-chip">{user.first_name || user.email}</span> : <Link className="button ghost" to="/login">Sign in</Link>}
      </nav>
    </header>
    <main>{children}</main>
    <footer><span>CEICO Recruitment</span><span>Privacy · Accessibility · Contact</span></footer>
  </>
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status status-${status.replace('_', '-')}`}>{status.replaceAll('_', ' ')}</span>
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><div className="empty-icon">◎</div><h2>{title}</h2><p>{children}</p></div>
}

