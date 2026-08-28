import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { EmptyState } from '../components/Layout'
import type { AuditEvent, AuditEventPage, Campaign } from '../types'
import './AuditLogPage.css'

const PAGE_SIZE = 50

const actionLabels: Record<string, string> = {
  'application.updated': 'Updated application',
  'application.status_changed': 'Changed application status',
  'application.deleted': 'Removed application',
  'application.override_ready': 'Admitted incomplete application',
  'document.uploaded': 'Uploaded document',
  'referee.invited': 'Invited referee',
  'reference.uploaded': 'Uploaded reference letter',
  'reference.replaced': 'Replaced reference letter',
  'review.assigned': 'Assigned reviewer',
  'review.unassigned': 'Removed reviewer assignment',
  'review.conflict': 'Declared conflict',
  'evaluation.saved': 'Saved evaluation',
  'evaluation.submitted': 'Submitted evaluation',
  'decision.recorded': 'Recorded decision',
  'decision.email_sent': 'Sent decision email',
  'campaign.created': 'Created campaign',
  'campaign.operator_added': 'Added campaign operator',
  'campaign.operator_removed': 'Removed campaign operator',
  'campaign.evaluator_added': 'Added reviewer',
  'campaign.evaluator_removed': 'Removed reviewer',
  'campaign.owner_updated': 'Changed campaign owner',
  'review.opened': 'Opened review',
}

const sentenceCase = (value: string) => {
  const label = value.replaceAll(/[._]/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const actionLabel = (event: AuditEvent) => actionLabels[event.action] || sentenceCase(event.action)
const actorLabel = (event: AuditEvent) => event.actor.name || event.actor.email || 'System'

export function AuditLogPage({ campaignId, campaignTitle, campaignSelector }: { campaignId?: number; campaignTitle?: string; campaignSelector?: ReactNode }) {
  const [page, setPage] = useState(1)
  const global = campaignId === undefined
  const path = global
    ? `/admin/audit-events?page=${page}&page_size=${PAGE_SIZE}`
    : `/campaigns/${campaignId}/audit-events?page=${page}&page_size=${PAGE_SIZE}`
  const query = useQuery<AuditEventPage>({
    queryKey: ['audit-events', global ? 'global' : campaignId, page],
    queryFn: () => api(path),
  })
  const result = query.data

  return <section className="container page audit-page">
    <div className="page-heading audit-heading">
      <div>
        <div className="eyebrow">{global ? 'Portal administration' : 'Campaign workspace'}</div>
        <h1>Audit log</h1>
        <p>{global ? 'Chronological activity across every recruitment campaign.' : `Chronological activity for ${campaignTitle || result?.items[0]?.campaign?.title || 'this campaign'}.`}</p>
        {campaignSelector}
      </div>
      <Link className="button secondary" to={global ? '/admin' : `/organizer?campaign=${campaignId}`}>Back to {global ? 'portal admin' : 'campaign'}</Link>
    </div>

    <section className="panel audit-panel" aria-busy={query.isLoading}>
      {query.isLoading ? <p className="table-empty">Loading audit events…</p> : query.error ? <div className="notice error">{query.error.message}</div> : result?.items.length ? <>
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th>{global && <th scope="col">Campaign</th>}<th scope="col">Application / object</th></tr></thead>
            <tbody>{result.items.map((event) => <tr key={event.id}>
              <td><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></td>
              <td><strong>{actorLabel(event)}</strong>{event.actor.email && event.actor.email !== actorLabel(event) && <small>{event.actor.email}</small>}<span className="audit-role">{sentenceCase(event.actor.role)}</span></td>
              <td><strong>{actionLabel(event)}</strong>{event.metadata.kind && <small>{sentenceCase(String(event.metadata.kind))}</small>}{event.metadata.status && event.metadata.previous_status && event.metadata.status !== event.metadata.previous_status && <small>{sentenceCase(String(event.metadata.previous_status))} → {sentenceCase(String(event.metadata.status))}</small>}</td>
              {global && <td>{event.campaign?.title || 'Portal-wide'}{event.campaign && <small>Campaign #{event.campaign.id}</small>}</td>}
              <td>{event.application_id ? <><strong>Application #{event.application_id}</strong>{event.target.type && <small>{sentenceCase(event.target.type)}{event.target.id ? ` #${event.target.id}` : ''}</small>}</> : event.target.type ? <>{sentenceCase(event.target.type)}{event.target.id ? ` #${event.target.id}` : ''}</> : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <nav className="audit-pagination" aria-label="Audit log pages">
          <span>{result.total ? `${(result.page - 1) * result.page_size + 1}–${Math.min(result.page * result.page_size, result.total)} of ${result.total} events` : 'No events'}</span>
          <div><button type="button" className="button ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" className="button ghost" disabled={page >= result.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
        </nav>
      </> : <EmptyState title="No audit events">Activity will appear here as applicants, reviewers, and campaign staff use the portal.</EmptyState>}
    </section>
  </section>
}

export function CampaignAuditLogPage() {
  const campaignId = Number(useParams().campaignId)
  if (!Number.isInteger(campaignId) || campaignId < 1) return <Navigate to="/organizer" replace />
  return <AuditLogPage campaignId={campaignId} />
}

export function OrganizerAuditLogPage() {
  const campaigns = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api('/campaigns'),
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const campaignId = selectedId || campaigns.data?.[0]?.id
  const campaign = campaigns.data?.find((item) => item.id === campaignId)

  if (campaigns.isLoading) return <section className="container page"><p className="table-empty">Loading campaigns…</p></section>
  if (campaigns.error) return <section className="container page"><div className="notice error">{campaigns.error.message}</div></section>
  if (!campaignId) return <section className="container page"><EmptyState title="No assigned campaigns">Campaign audit activity will be available after a campaign is assigned to you.</EmptyState></section>

  const campaignSelector = <label className="audit-campaign-picker">Campaign<select value={campaignId} onChange={(event) => setSelectedId(Number(event.target.value))}>{campaigns.data?.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
  return <AuditLogPage key={campaignId} campaignId={campaignId} campaignTitle={campaign?.title} campaignSelector={campaignSelector} />
}
