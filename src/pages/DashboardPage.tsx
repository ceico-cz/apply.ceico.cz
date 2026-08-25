import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EmptyState, StatusPill } from '../components/Layout'
import type { Application } from '../types'

export function DashboardPage() {
  const applications = useQuery<Application[]>({ queryKey: ['my-applications'], queryFn: () => api('/applications') })
  const refs = useQuery<Array<{ id: number; campaign: string; applicant: string; status: string }>>({ queryKey: ['referee-requests'], queryFn: () => api('/referee/requests') })
  const reviews = useQuery<Array<{ id: number; status: string; campaign: { title: string } }>>({ queryKey: ['evaluator-assignments'], queryFn: () => api('/evaluator/assignments') })
  return <section className="container page"><div className="page-heading"><div><div className="eyebrow">Overview</div><h1>My dashboard</h1></div><Link className="button primary" to="/openings">Find a position</Link></div><DashboardSection title="My applications">{applications.data?.length ? applications.data.map((item) => <div className="task-row" key={item.id}><div><strong>{item.campaign?.title}</strong><small>Application #{item.id}</small></div><StatusPill status={item.status} /><Link to={`/apply/${item.campaign?.slug}`}>Open →</Link></div>) : <EmptyState title="No applications yet">Explore current positions to begin an application.</EmptyState>}</DashboardSection>{Boolean(refs.data?.length) && <DashboardSection title="Reference requests">{refs.data!.map((item) => <div className="task-row" key={item.id}><div><strong>{item.applicant}</strong><small>{item.campaign}</small></div><StatusPill status={item.status} /><Link to="/referee">Open →</Link></div>)}</DashboardSection>}{Boolean(reviews.data?.length) && <DashboardSection title="Evaluation assignments">{reviews.data!.map((item) => <div className="task-row" key={item.id}><div><strong>{item.campaign.title}</strong><small>Evaluation assignment</small></div><StatusPill status={item.status} /><Link to="/evaluate">Review →</Link></div>)}</DashboardSection>}</section>
}
function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="dashboard-section"><h2>{title}</h2><div className="panel">{children}</div></section> }

