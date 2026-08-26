import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Campaign, User } from '../types'
import { EmptyState } from '../components/Layout'

const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

export function HomePage() {
  return <section className="landing-page"><div className="landing-panel"><div className="eyebrow">CEICO opportunities portal</div><h1>Sign in to continue</h1><p>Applicants, referees, evaluators, organizers, and administrators use the same secure sign-in.</p><div className="landing-actions"><Link className="button primary" to="/login">Sign in to the portal <span aria-hidden="true">→</span></Link><a className="button secondary" href="https://ceico.cz">Visit the CEICO website <span aria-hidden="true">↗</span></a></div></div></section>
}

export function OpeningsPage() {
  const query = useQuery<Campaign[]>({ queryKey: ['openings'], queryFn: () => api('/public/campaigns') })
  return <section className="container page"><div className="page-heading"><div><div className="eyebrow">Opportunities</div><h1>Open academic positions</h1></div><p>Applications are reviewed after the advertised deadlines.</p></div>
    {query.data?.length ? <div className="cards">{query.data.map((campaign) => <article className="opening-card" key={campaign.id}><div><span className="tag">Academic position</span><h2>{campaign.title}</h2><p>{campaign.description}</p></div><div className="card-meta"><span>Apply by <strong>{date(campaign.application_deadline)}</strong></span><Link to={`/openings/${campaign.slug}`}>View position →</Link></div></article>)}</div> : !query.isLoading && <EmptyState title="No positions are listed right now">Please check again later or follow a direct link from a job advertisement.</EmptyState>}
  </section>
}

export function OpeningPage({ user }: { user?: User | null }) {
  const { slug } = useParams()
  const query = useQuery<Campaign>({ queryKey: ['opening', slug], queryFn: () => api(`/public/campaigns/${slug}`) })
  if (query.isLoading) return <div className="app-loading">Loading opening…</div>
  if (!query.data) return <EmptyState title="Opening not found">This link may be invalid or the campaign is no longer available.</EmptyState>
  const campaign = query.data
  const now = Date.now()
  const upcoming = now < new Date(campaign.opens_at).getTime()
  const closed = !campaign.active || now >= new Date(campaign.application_deadline).getTime()
  const accepting = !upcoming && !closed
  const statusLabel = upcoming ? 'Applications not yet open' : closed ? 'Applications closed' : 'Open for applications'
  const availabilityMessage = upcoming ? `Applications open on ${date(campaign.opens_at)}.` : `The application deadline was ${date(campaign.application_deadline)}.`
  return <section className="container page narrow"><Link className="back" to="/openings">← All positions</Link><div className="detail-header"><span className="tag">{statusLabel}</span><h1>{campaign.title}</h1><p>{campaign.description}</p>{campaign.description_url && <a href={campaign.description_url} target="_blank">Full job description ↗</a>}</div><div className="deadline-grid"><div><small>Applications close</small><strong>{date(campaign.application_deadline)}</strong></div><div><small>Reference letters due</small><strong>{date(campaign.letter_deadline)}</strong></div><div><small>References required</small><strong>{campaign.required_referees}</strong></div></div>{!accepting && <div className="notice error"><strong>{statusLabel}</strong><p>{availabilityMessage}</p></div>}<div className="detail-actions">{accepting ? <Link className="button primary" to={user ? `/apply/${campaign.slug}` : `/login?next=/apply/${campaign.slug}`}>Start or continue application →</Link> : <Link className="button secondary" to={user ? `/apply/${campaign.slug}` : `/login?next=/apply/${campaign.slug}`}>Sign in to view an existing application →</Link>}<span>{accepting ? 'Your progress is saved automatically.' : 'New applications cannot be started outside the application period.'}</span></div></section>
}
