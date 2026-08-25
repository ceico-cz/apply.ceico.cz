import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Campaign, User } from '../types'
import { EmptyState } from '../components/Layout'

const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

export function HomePage() {
  return <>
    <section className="hero"><div className="eyebrow">Research with impact</div><h1>Join the next generation<br />of scientific discovery.</h1><p>Explore open academic positions and manage every step of your application in one secure place.</p><Link className="button primary" to="/openings">Explore open positions <span>→</span></Link></section>
    <section className="feature-grid container"><article><span>01</span><h2>Simple application</h2><p>Save your progress, upload PDFs, and update your materials until the deadline.</p></article><article><span>02</span><h2>Clear reference tracking</h2><p>Know when invitations are delivered and when confidential letters arrive.</p></article><article><span>03</span><h2>Passwordless access</h2><p>Secure email links keep your applications and review tasks together.</p></article></section>
  </>
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
  return <section className="container page narrow"><Link className="back" to="/openings">← All positions</Link><div className="detail-header"><span className="tag">Open for applications</span><h1>{campaign.title}</h1><p>{campaign.description}</p>{campaign.description_url && <a href={campaign.description_url} target="_blank">Full job description ↗</a>}</div><div className="deadline-grid"><div><small>Applications close</small><strong>{date(campaign.application_deadline)}</strong></div><div><small>Reference letters due</small><strong>{date(campaign.letter_deadline)}</strong></div><div><small>References required</small><strong>{campaign.required_referees}</strong></div></div><div className="detail-actions"><Link className="button primary" to={user ? `/apply/${campaign.slug}` : `/login?next=/apply/${campaign.slug}`}>Start or continue application →</Link><span>Your progress is saved automatically.</span></div></section>
}

