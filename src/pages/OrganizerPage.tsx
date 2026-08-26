import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { EmptyState, StatusPill } from '../components/Layout'
import type { Application, Campaign, CampaignEvaluator, ResearchField } from '../types'
import './OrganizerPage.css'

type EvaluatorSuggestion = Omit<CampaignEvaluator, 'assignments'>

type CampaignOperator = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'owner' | 'operator'
}

const iso = (days: number) => {
  const date = new Date(Date.now() + days * 86400000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const APPLICANTS_PER_PAGE = 20

export function OrganizerPage({ canCreate }: { canCreate: boolean }) {
  const client = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedCampaignId = Number(searchParams.get('campaign'))
  const campaigns = useQuery<Campaign[]>({ queryKey: ['campaigns'], queryFn: () => api('/campaigns') })
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(Number.isInteger(requestedCampaignId) && requestedCampaignId > 0 ? requestedCampaignId : canCreate ? 'new' : null)
  useEffect(() => {
    if (!canCreate && selectedId === null && campaigns.data?.length) setSelectedId(campaigns.data[0].id)
  }, [campaigns.data, canCreate, selectedId])
  const selected = campaigns.data?.find((item) => item.id === selectedId)
  return <section className="organizer-shell"><aside className="organizer-nav"><div><div className="eyebrow">Administration</div><h1>Recruitment campaigns</h1></div>{canCreate && <button className="button primary full" onClick={() => setSelectedId('new')}>+ New campaign</button>}<div className="campaign-nav">{campaigns.data?.map((item) => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span className={`campaign-dot ${item.review_open ? 'review' : ''}`} /><span><strong>{item.title}</strong><small>{item.review_open ? 'Review open' : 'Collecting applications'}</small></span></button>)}</div></aside><div className="organizer-content">{selected ? <CampaignWorkspace key={selected.id} campaign={selected} /> : canCreate ? <CampaignCreator onCreated={(campaign) => { client.invalidateQueries({ queryKey: ['campaigns'] }); setSelectedId(campaign.id) }} /> : campaigns.isLoading ? <div className="table-empty">Loading campaigns…</div> : <EmptyState title="No assigned campaigns">Campaigns assigned to you will appear here.</EmptyState>}</div></section>
}

function CampaignCreator({ onCreated }: { onCreated: (campaign: Campaign) => void }) {
  const fields = useQuery<ResearchField[]>({ queryKey: ['research-fields'], queryFn: () => api('/research-fields') })
  const [form, setForm] = useState({ title: '', slug: '', description: '', description_url: '', timezone: 'Europe/Prague', opens_at: iso(0), application_deadline: iso(30), letter_deadline: iso(37), evaluation_deadline: iso(60), retention_at: iso(365), required_referees: 3, is_listed: false })
  const [fieldIds, setFieldIds] = useState<number[]>([])
  const [rubric, setRubric] = useState([{ title: 'Scientific excellence', description: 'Quality, originality, and significance of the candidate’s research.', minimum: 1, maximum: 5, weight: 1 }])
  const mutation = useMutation({ mutationFn: () => {
    const schedule = Object.fromEntries((['opens_at', 'application_deadline', 'letter_deadline', 'evaluation_deadline', 'retention_at'] as const).map((key) => [key, new Date(form[key]).toISOString()]))
    return api<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify({ ...form, ...schedule, research_field_ids: fieldIds, requirements: {}, questions: [], rubric }) })
  }, onSuccess: onCreated })
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate() }
  return <form className="campaign-form" onSubmit={submit}><div className="page-heading"><div><div className="eyebrow">Campaign setup</div><h1>Create an opening</h1><p>Configure deadlines, application choices, and the review rubric.</p></div><button className="button primary" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create campaign'}</button></div><Panel title="Position details"><div className="form-grid two"><OrgField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v, slug: form.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /><OrgField label="URL slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} /><label className="field span-2">Short description<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><OrgField label="Job description URL" value={form.description_url} onChange={(v) => setForm({ ...form, description_url: v })} /><OrgField label="Required referees" type="number" value={String(form.required_referees)} onChange={(v) => setForm({ ...form, required_referees: Number(v) })} /></div><label className="consent compact"><input type="checkbox" checked={form.is_listed} onChange={(e) => setForm({ ...form, is_listed: e.target.checked })} />List this position on the public openings page</label></Panel><Panel title="Schedule"><div className="form-grid two">{(['opens_at', 'application_deadline', 'letter_deadline', 'evaluation_deadline', 'retention_at'] as const).map((key) => <OrgField key={key} label={key.replaceAll('_', ' ')} type="datetime-local" value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />)}</div></Panel><Panel title="Research fields"><p className="muted">Choose the options applicants can select as primary or secondary interests.</p><div className="check-grid catalog">{fields.data?.map((field) => <label key={field.id}><input type="checkbox" checked={fieldIds.includes(field.id)} onChange={() => setFieldIds((values) => values.includes(field.id) ? values.filter((id) => id !== field.id) : [...values, field.id])} />{field.name}</label>)}</div></Panel><Panel title="Evaluation rubric">{rubric.map((item, index) => <div className="rubric-editor" key={index}><OrgField label="Criterion" value={item.title} onChange={(v) => setRubric((rows) => rows.map((row, i) => i === index ? { ...row, title: v } : row))} /><OrgField label="Description" value={item.description} onChange={(v) => setRubric((rows) => rows.map((row, i) => i === index ? { ...row, description: v } : row))} /><OrgField label="Weight" type="number" value={String(item.weight)} onChange={(v) => setRubric((rows) => rows.map((row, i) => i === index ? { ...row, weight: Number(v) } : row))} /></div>)}<button type="button" className="text-button" onClick={() => setRubric((items) => [...items, { title: '', description: '', minimum: 1, maximum: 5, weight: 1 }])}>+ Add criterion</button></Panel>{mutation.error && <div className="notice error">{mutation.error.message}</div>}</form>
}

function CampaignWorkspace({ campaign }: { campaign: Campaign }) {
  const client = useQueryClient()
  const query = useQuery<Application[]>({ queryKey: ['campaign-applications', campaign.id], queryFn: () => api(`/campaigns/${campaign.id}/applications`) })
  const evaluators = useQuery<CampaignEvaluator[]>({ queryKey: ['campaign-evaluators', campaign.id], queryFn: () => api(`/campaigns/${campaign.id}/evaluators`) })
  const [selected, setSelected] = useState<Application | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [applicantPage, setApplicantPage] = useState(0)
  const applicantUrl = `${window.location.origin}/openings/${encodeURIComponent(campaign.slug)}`
  const stats = useMemo(() => ({ total: query.data?.length || 0, ready: query.data?.filter((a) => ['review_ready', 'override_ready'].includes(a.status)).length || 0, awaiting: query.data?.filter((a) => a.status === 'awaiting_references').length || 0 }), [query.data])
  const applicantCount = query.data?.length || 0
  const applicantPageCount = Math.max(1, Math.ceil(applicantCount / APPLICANTS_PER_PAGE))
  const currentApplicantPage = Math.min(applicantPage, applicantPageCount - 1)
  const visibleApplicants = query.data?.slice(currentApplicantPage * APPLICANTS_PER_PAGE, (currentApplicantPage + 1) * APPLICANTS_PER_PAGE) || []
  const openReview = async () => { if (window.confirm('Open review and email every assigned evaluator?')) { await api(`/campaigns/${campaign.id}/open-review`, { method: 'POST' }); client.invalidateQueries({ queryKey: ['campaigns'] }) } }
  const copyApplicantUrl = async () => {
    await navigator.clipboard.writeText(applicantUrl)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 2000)
  }
  const removeApplication = async (application: Application) => {
    const applicantName = [application.applicant.first_name, application.applicant.last_name].filter(Boolean).join(' ') || application.applicant.email
    if (!window.confirm(`Remove the application from ${applicantName} (${application.applicant.email})?\n\nThis permanently deletes the application, uploaded documents, reference letters, evaluator assignments, evaluations, and any recorded decision. This cannot be undone.`)) return
    try {
      await api(`/campaigns/${campaign.id}/applications/${application.id}`, { method: 'DELETE' })
      if (selected?.id === application.id) setSelected(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['campaign-applications', campaign.id] }),
        client.invalidateQueries({ queryKey: ['campaign-evaluators', campaign.id] }),
      ])
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Could not remove the application')
    }
  }
  return <><div className="page-heading"><div><div className="eyebrow">Campaign workspace</div><h1>{campaign.title}</h1><p>Applications close {new Date(campaign.application_deadline).toLocaleString()}</p></div>{!campaign.review_open && <button className="button primary" onClick={openReview}>Open review</button>}</div><div className="applicant-link"><a className="applicant-url" href={applicantUrl} target="_blank" rel="noreferrer">{applicantUrl}</a><button type="button" className="text-button" onClick={copyApplicantUrl}>{linkCopied ? 'Copied' : 'Copy link'}</button></div><div className="stats"><div><strong>{stats.total}</strong><span>Applications</span></div><div><strong>{stats.ready}</strong><span>Ready for review</span></div><div><strong>{stats.awaiting}</strong><span>Awaiting letters</span></div><div><strong>{campaign.review_open ? 'Open' : 'Closed'}</strong><span>Review</span></div></div><OperatorPanel campaign={campaign} /><EvaluatorPanel campaign={campaign} evaluators={evaluators.data} /><Panel title="Applicants">{query.data?.length ? <><div className="data-table"><div className="data-row applicant-data-row header"><span>Applicant</span><span>Institution</span><span>Status</span><span>References</span><span>Actions</span></div>{visibleApplicants.map((item) => { const applicantName = [item.applicant.first_name, item.applicant.last_name].filter(Boolean).join(' ') || item.applicant.email; return <div className="data-row applicant-data-row" key={item.id}><span className="applicant-cell"><strong>{item.applicant.first_name || 'Unnamed'} {item.applicant.last_name}</strong><small>{item.applicant.email}</small></span><span className="institution-cell" title={item.profile.present_institution || undefined}>{item.profile.present_institution || '—'}</span><span><StatusPill status={item.status} /></span><span>{item.referees.filter((r) => r.status === 'submitted').length} / {campaign.required_referees}</span><span className="applicant-actions"><button type="button" className="manage-applicant" title={`Manage ${applicantName}`} aria-label={`Manage ${applicantName}`} onClick={() => setSelected(item)}><span aria-hidden="true">⚙</span></button><button type="button" className="remove-applicant" title={`Remove ${applicantName}`} aria-label={`Remove ${applicantName}`} onClick={() => removeApplication(item)}>×</button></span></div> })}</div>{applicantCount > APPLICANTS_PER_PAGE && <nav className="applicant-pagination" aria-label="Applicant table pages"><span>{currentApplicantPage * APPLICANTS_PER_PAGE + 1}–{Math.min((currentApplicantPage + 1) * APPLICANTS_PER_PAGE, applicantCount)} of {applicantCount} applicants</span><span>Page {currentApplicantPage + 1} of {applicantPageCount}</span><div><button type="button" className="button ghost" disabled={currentApplicantPage === 0} onClick={() => setApplicantPage(currentApplicantPage - 1)}>Previous</button><button type="button" className="button ghost" disabled={currentApplicantPage >= applicantPageCount - 1} onClick={() => setApplicantPage(currentApplicantPage + 1)}>Next</button></div></nav>}</> : <EmptyState title="No applications yet">Applications submitted through the campaign link will appear here.</EmptyState>}</Panel>{selected && <ApplicantDrawer application={selected} campaign={campaign} canRecordDecisions={Boolean(campaign.can_record_decisions)} close={() => setSelected(null)} refresh={() => client.invalidateQueries({ queryKey: ['campaign-applications', campaign.id] })} />}</>
}

function OperatorPanel({ campaign }: { campaign: Campaign }) {
  const client = useQueryClient()
  const operators = useQuery<CampaignOperator[]>({ queryKey: ['campaign-operators', campaign.id], queryFn: () => api(`/campaigns/${campaign.id}/operators`) })
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const addOperator = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await api(`/campaigns/${campaign.id}/operators`, { method: 'POST', body: JSON.stringify({ email }) })
      setEmail('')
      await client.invalidateQueries({ queryKey: ['campaign-operators', campaign.id] })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add operator') }
  }
  const removeOperator = async (operator: CampaignOperator) => {
    const operatorName = [operator.first_name, operator.last_name].filter(Boolean).join(' ') || operator.email
    if (!window.confirm(`Remove ${operatorName} (${operator.email}) as a campaign operator?`)) return
    setError('')
    try {
      await api(`/campaigns/${campaign.id}/operators/${operator.id}`, { method: 'DELETE' })
      await client.invalidateQueries({ queryKey: ['campaign-operators', campaign.id] })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove operator') }
  }
  return <Panel title="Campaign operators">{campaign.can_manage_operators && <form className="operator-form" onSubmit={addOperator}><label className="field">Operator email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@institution.org" /></label><button className="button secondary">Add operator</button></form>}{error && <div className="notice error">{error}</div>}{operators.data?.length ? <div className="data-table"><div className="data-row operator-data-row header"><span>Operator</span><span>Role</span><span>Actions</span></div>{operators.data.map((operator) => { const operatorName = [operator.first_name, operator.last_name].filter(Boolean).join(' ') || operator.email; return <div className="data-row operator-data-row" key={`${operator.role}-${operator.id}`}><span className="applicant-cell"><strong>{operatorName}</strong><small>{operator.email}</small></span><span>{operator.role === 'owner' ? 'Campaign owner' : 'Operator'}</span><span className="roster-actions">{campaign.can_manage_operators && operator.role === 'operator' && <button type="button" className="remove-roster-member" title={`Remove ${operatorName}`} aria-label={`Remove ${operatorName}`} onClick={() => removeOperator(operator)}>×</button>}</span></div> })}</div> : operators.isLoading ? <div className="table-empty">Loading operators…</div> : <div className="table-empty">No campaign operators assigned.</div>}</Panel>
}

function EvaluatorPanel({ campaign, evaluators }: { campaign: Campaign; evaluators?: CampaignEvaluator[] }) {
  const client = useQueryClient()
  const suggestions = useQuery<EvaluatorSuggestion[]>({ queryKey: ['evaluator-suggestions', campaign.id], queryFn: () => api(`/campaigns/${campaign.id}/evaluator-suggestions`) })
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const addEvaluator = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await api(`/campaigns/${campaign.id}/evaluators`, { method: 'POST', body: JSON.stringify({ email }) })
      setEmail('')
      await Promise.all([
        client.invalidateQueries({ queryKey: ['campaign-evaluators', campaign.id] }),
        client.invalidateQueries({ queryKey: ['evaluator-suggestions', campaign.id] }),
      ])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add evaluator') }
  }
  const removeEvaluator = async (evaluator: CampaignEvaluator) => {
    const evaluatorName = [evaluator.first_name, evaluator.last_name].filter(Boolean).join(' ') || evaluator.email
    if (!window.confirm(`Remove ${evaluatorName} (${evaluator.email}) as an evaluator?\n\nAny assignments must be cleared in the assignment matrix first.`)) return
    setError('')
    try {
      await api(`/campaigns/${campaign.id}/evaluators/${evaluator.id}`, { method: 'DELETE' })
      await Promise.all([
        client.invalidateQueries({ queryKey: ['campaign-evaluators', campaign.id] }),
        client.invalidateQueries({ queryKey: ['evaluator-suggestions', campaign.id] }),
      ])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove evaluator') }
  }
  return <Panel title="Evaluators" action={<Link className="button secondary" to={`/organizer/campaigns/${campaign.id}/assignments`}>Assignment matrix</Link>}><form className="operator-form" onSubmit={addEvaluator}><label className="field">Evaluator email<input required type="email" list={`known-evaluators-${campaign.id}`} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="evaluator@institution.org" autoComplete="off" /></label><button className="button secondary">Add evaluator</button></form><datalist id={`known-evaluators-${campaign.id}`}>{suggestions.data?.map((evaluator) => <option value={evaluator.email} key={evaluator.id}>{[evaluator.first_name, evaluator.last_name].filter(Boolean).join(' ')}</option>)}</datalist><datalist id={`campaign-evaluators-${campaign.id}`}>{evaluators?.map((evaluator) => <option value={evaluator.email} key={evaluator.id}>{[evaluator.first_name, evaluator.last_name].filter(Boolean).join(' ')}</option>)}</datalist>{error && <div className="notice error">{error}</div>}{evaluators === undefined ? <div className="table-empty">Loading evaluators…</div> : evaluators.length ? <div className="data-table"><div className="data-row evaluator-data-row header"><span>Evaluator</span><span>Progress</span><span>Actions</span></div>{evaluators.map((evaluator) => { const submitted = evaluator.assignments.filter((item) => item.status === 'submitted').length; const conflicts = evaluator.assignments.filter((item) => item.status === 'conflict').length; const evaluatorName = [evaluator.first_name, evaluator.last_name].filter(Boolean).join(' ') || evaluator.email; return <div className="data-row evaluator-data-row" key={evaluator.id}><span className="applicant-cell"><strong>{evaluatorName}</strong><small>{evaluator.email}</small></span><span>{submitted} / {evaluator.assignments.length} submitted{conflicts ? ` · ${conflicts} conflict${conflicts === 1 ? '' : 's'}` : ''}</span><span className="roster-actions"><button type="button" className="remove-roster-member" title={`Remove ${evaluatorName}`} aria-label={`Remove ${evaluatorName}`} onClick={() => removeEvaluator(evaluator)}>×</button></span></div>})}</div> : <div className="table-empty">No evaluators added yet.</div>}</Panel>
}

function ApplicantDrawer({ application, campaign, canRecordDecisions, close, refresh }: { application: Application; campaign: Campaign; canRecordDecisions: boolean; close: () => void; refresh: () => void }) {
  const client = useQueryClient()
  const [email, setEmail] = useState('')
  const assign = async (event: FormEvent) => { event.preventDefault(); await api(`/campaigns/${campaign.id}/assignments`, { method: 'POST', body: JSON.stringify({ application_id: application.id, evaluator_email: email }) }); setEmail(''); await client.invalidateQueries({ queryKey: ['campaign-evaluators', campaign.id] }); window.alert('Evaluator assigned') }
  const override = async () => { const reason = window.prompt('Record the reason for admitting this incomplete application'); if (reason) { await api(`/applications/${application.id}/override`, { method: 'POST', body: JSON.stringify({ reason }) }); refresh(); close() } }
  const decision = async (outcome: string) => {
    await api(`/applications/${application.id}/decision`, { method: 'PUT', body: JSON.stringify({ outcome, notes: '' }) })
    if (window.confirm(`Decision recorded as ${outcome}. Send the outcome email now?`)) {
      await api(`/applications/${application.id}/decision/send`, { method: 'POST' })
      window.alert('Outcome email sent')
    }
  }
  return <div className="drawer-backdrop" onMouseDown={close}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><button className="drawer-close" onClick={close}>×</button><div className="eyebrow">Applicant #{application.id}</div><h2>{application.applicant.first_name} {application.applicant.last_name}</h2><p>{application.applicant.email}</p><StatusPill status={application.status} /><dl className="profile-list"><div><dt>Institution</dt><dd>{application.profile.present_institution || '—'}</dd></div><div><dt>Primary research</dt><dd>{application.primary_field_label || '—'}</dd></div><div><dt>Reference letters</dt><dd>{application.referees.filter((r) => r.status === 'submitted').length} / {campaign.required_referees}</dd></div></dl>{!['review_ready', 'override_ready'].includes(application.status) && <button className="button secondary full" onClick={override}>Admit incomplete application</button>}<form onSubmit={assign} className="drawer-section"><h3>Assign evaluator</h3><label className="field">Verified email<input required type="email" list={`campaign-evaluators-${campaign.id}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reviewer@institution.edu" autoComplete="off" /></label><button className="button primary full" disabled={!['review_ready', 'override_ready'].includes(application.status)}>Assign</button></form>{canRecordDecisions && <div className="drawer-section"><h3>Final decision</h3><div className="decision-grid">{['selected', 'waitlisted', 'rejected'].map((item) => <button className="button ghost" onClick={() => decision(item)} key={item}>{item}</button>)}</div></div>}</aside></div>
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="panel organizer-panel"><div className="organizer-panel-heading"><h2>{title}</h2>{action}</div>{children}</section> }
function OrgField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) { return <label className="field">{label}<input required type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label> }
