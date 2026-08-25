import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL, api } from '../api'
import { EmptyState, StatusPill } from '../components/Layout'
import type { Application, Campaign } from '../types'

type Assignment = { id: number; status: string; application: Application; campaign: Campaign; evaluation: { scores: Record<string, number>; comments: string; submitted_at: string | null; normalized_total: number } | null }
export function EvaluatorPage() {
  const query = useQuery<Assignment[]>({ queryKey: ['evaluator-assignments'], queryFn: () => api('/evaluator/assignments') })
  const [selected, setSelected] = useState<number | null>(null)
  const assignment = query.data?.find((item) => item.id === selected) || query.data?.[0]
  return <section className="review-shell"><aside className="review-list"><div className="eyebrow">Review queue</div><h1>Assigned applicants</h1>{query.data?.map((item) => <button key={item.id} className={assignment?.id === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}><span className="avatar">{item.application.applicant.first_name[0]}{item.application.applicant.last_name[0]}</span><span><strong>{item.application.applicant.first_name} {item.application.applicant.last_name}</strong><small>{item.campaign.title}</small></span><StatusPill status={item.status} /></button>)}</aside><div className="review-content">{assignment ? <EvaluationForm assignment={assignment} /> : !query.isLoading && <EmptyState title="No assigned reviews">New assignments will appear after a campaign owner opens review.</EmptyState>}</div></section>
}
function EvaluationForm({ assignment }: { assignment: Assignment }) {
  const client = useQueryClient()
  const [scores, setScores] = useState<Record<string, number>>(assignment.evaluation?.scores || {})
  const [comments, setComments] = useState(assignment.evaluation?.comments || '')
  const [conflict, setConflict] = useState(false)
  const save = async (submit: boolean) => { await api(`/evaluator/assignments/${assignment.id}/evaluation`, { method: 'PUT', body: JSON.stringify({ scores, comments, submit }) }); client.invalidateQueries({ queryKey: ['evaluator-assignments'] }) }
  const decline = async () => { const reason = window.prompt('Briefly describe the conflict of interest'); if (reason) { await api(`/evaluator/assignments/${assignment.id}/conflict`, { method: 'POST', body: JSON.stringify({ reason }) }); setConflict(true); client.invalidateQueries({ queryKey: ['evaluator-assignments'] }) } }
  const app = assignment.application
  return <><div className="review-header"><div><div className="eyebrow">Candidate evaluation</div><h1>{app.applicant.first_name} {app.applicant.last_name}</h1><p>{app.profile.present_institution}</p></div><button className="button danger ghost" onClick={decline}>Declare conflict</button></div><div className="candidate-summary"><div><small>Primary research</small><strong>{app.primary_field_label}</strong></div><div><small>Application status</small><StatusPill status={app.status} /></div><a className="button secondary" href={`${API_URL}/api/v1/applications/${app.id}/packet`} target="_blank">Download review PDF</a></div><section className="evaluation-panel"><h2>Evaluation rubric</h2>{assignment.campaign.rubric.map((criterion) => <div className="criterion" key={criterion.id}><div><label htmlFor={`score-${criterion.id}`}>{criterion.title}</label><p>{criterion.description}</p></div><div className="score-scale">{Array.from({ length: criterion.maximum - criterion.minimum + 1 }, (_, i) => i + criterion.minimum).map((value) => <button id={value === criterion.minimum ? `score-${criterion.id}` : undefined} className={scores[String(criterion.id)] === value ? 'selected' : ''} key={value} onClick={() => setScores({ ...scores, [String(criterion.id)]: value })}>{value}</button>)}</div></div>)}<label className="field">Confidential comments<textarea rows={7} value={comments} onChange={(e) => setComments(e.target.value)} /></label><div className="form-actions"><button className="button secondary" onClick={() => save(false)}>Save draft</button><button className="button primary" disabled={conflict || assignment.status === 'submitted'} onClick={() => save(true)}>Submit evaluation</button></div></section></>
}
