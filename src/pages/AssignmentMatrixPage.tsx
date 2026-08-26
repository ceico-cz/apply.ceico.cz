import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { EmptyState } from '../components/Layout'
import type { Application, Campaign, CampaignEvaluator } from '../types'
import './AssignmentMatrixPage.css'

const displayName = (person: { email: string; first_name: string; last_name: string }) =>
  [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email

export function AssignmentMatrixPage() {
  const client = useQueryClient()
  const { campaignId: campaignIdParam } = useParams()
  const campaignId = Number(campaignIdParam)
  const enabled = Number.isInteger(campaignId) && campaignId > 0
  const campaigns = useQuery<Campaign[]>({ queryKey: ['campaigns'], queryFn: () => api('/campaigns') })
  const applications = useQuery<Application[]>({
    queryKey: ['campaign-applications', campaignId],
    queryFn: () => api(`/campaigns/${campaignId}/applications`),
    enabled,
  })
  const evaluators = useQuery<CampaignEvaluator[]>({
    queryKey: ['campaign-evaluators', campaignId],
    queryFn: () => api(`/campaigns/${campaignId}/evaluators`),
    enabled,
  })
  const [pendingCell, setPendingCell] = useState('')
  const [error, setError] = useState('')
  const campaign = campaigns.data?.find((item) => item.id === campaignId)
  const backPath = enabled ? `/organizer?campaign=${campaignId}` : '/organizer'

  const toggleAssignment = async (application: Application, evaluator: CampaignEvaluator) => {
    const assignment = evaluator.assignments.find((item) => item.application_id === application.id)
    if (assignment && assignment.status !== 'assigned') return
    const cellKey = `${application.id}-${evaluator.id}`
    setPendingCell(cellKey)
    setError('')
    try {
      if (assignment) {
        await api(`/campaigns/${campaignId}/assignments/${assignment.id}`, { method: 'DELETE' })
      } else {
        await api(`/campaigns/${campaignId}/assignments`, {
          method: 'POST',
          body: JSON.stringify({
            application_id: application.id,
            evaluator_email: evaluator.email,
          }),
        })
      }
      await client.invalidateQueries({ queryKey: ['campaign-evaluators', campaignId] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the assignment')
    } finally {
      setPendingCell('')
    }
  }

  if (!enabled) return <section className="container page"><div className="notice error">Invalid campaign.</div></section>
  if (campaigns.isLoading || applications.isLoading || evaluators.isLoading) return <div className="app-loading">Loading assignment matrix…</div>
  const queryError = campaigns.error || applications.error || evaluators.error
  if (queryError) return <section className="container page"><Link className="back" to={backPath}>← Back to campaigns</Link><div className="notice error">{queryError.message}</div></section>
  if (!campaign) return <section className="container page"><Link className="back" to="/organizer">← Back to campaigns</Link><EmptyState title="Campaign not available">This campaign does not exist or is not assigned to you.</EmptyState></section>

  const applicantRows = applications.data || []
  const evaluatorColumns = evaluators.data || []

  return <section className="container assignment-matrix-page page"><Link className="back" to={backPath}>← Back to campaign</Link><div className="page-heading"><div><div className="eyebrow">Campaign workspace</div><h1>Evaluator assignments</h1><p>{campaign.title}. Click an empty cell to assign an evaluator; click an untouched assignment again to remove it.</p></div></div>{error && <div className="notice error">{error}</div>}{!evaluatorColumns.length ? <EmptyState title="No evaluators added">Add evaluators in the campaign workspace before assigning applications.</EmptyState> : !applicantRows.length ? <EmptyState title="No applicants yet">Applications will appear here after they are created.</EmptyState> : <><div className="matrix-legend" aria-label="Assignment status legend"><span><b>✓</b> Assigned</span><span><b>✓</b> Submitted</span><span><b>!</b> Conflict</span><span><b>—</b> Not ready</span></div><div className="assignment-matrix-scroll"><table className="assignment-matrix"><thead><tr><th className="matrix-corner" scope="col">Applicant · assigned</th>{evaluatorColumns.map((evaluator) => <th className="matrix-evaluator" scope="col" key={evaluator.id}><div className="matrix-evaluator-heading" title={`${displayName(evaluator)} · ${evaluator.email}`}><span>{displayName(evaluator)}</span></div></th>)}</tr></thead><tbody>{applicantRows.map((application) => { const applicantName = displayName(application.applicant); const assignedCount = evaluatorColumns.filter((evaluator) => evaluator.assignments.some((item) => item.application_id === application.id)).length; const ready = ['review_ready', 'override_ready'].includes(application.status); return <tr key={application.id}><th className="matrix-applicant" scope="row"><div><strong>{applicantName}</strong><span className="matrix-count" aria-label={`${assignedCount} evaluators assigned`}>{assignedCount}</span></div><small>{application.applicant.email}</small></th>{evaluatorColumns.map((evaluator) => { const assignment = evaluator.assignments.find((item) => item.application_id === application.id); const cellKey = `${application.id}-${evaluator.id}`; const protectedAssignment = assignment && assignment.status !== 'assigned'; const disabled = pendingCell !== '' || (!ready && !assignment) || Boolean(protectedAssignment); const action = assignment ? `Remove ${displayName(evaluator)} from ${applicantName}` : `Assign ${displayName(evaluator)} to ${applicantName}`; const state = assignment?.status || 'unassigned'; const label = protectedAssignment ? `${displayName(evaluator)} and ${applicantName}: ${assignment.status} assignment cannot be removed` : !ready && !assignment ? `${applicantName} is not ready for evaluator assignment` : action; return <td key={evaluator.id}><button type="button" className={`matrix-cell matrix-cell-${state}`} aria-label={label} aria-pressed={Boolean(assignment)} aria-busy={pendingCell === cellKey} disabled={disabled} onClick={() => toggleAssignment(application, evaluator)}><span aria-hidden="true">{pendingCell === cellKey ? '…' : assignment?.status === 'conflict' ? '!' : assignment ? '✓' : ready ? '' : '—'}</span></button></td>})}</tr>})}</tbody></table></div></>}
  </section>
}
