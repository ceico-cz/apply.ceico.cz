import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { StatusPill } from '../components/Layout'
import { DocumentKind, RefereeRequestStatus } from '../types'
import type { ApplicantDocumentKind, Application } from '../types'

const steps = ['Personal details', 'Academic profile', 'Research & documents', 'Referees', 'Review & consent']

export function ApplicationPage() {
  const { slug } = useParams()
  const client = useQueryClient()
  const query = useQuery<Application>({ queryKey: ['application', slug], queryFn: () => api(`/applications/by-campaign/${slug}`) })
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Record<string, string>>({})
  const [career, setCareer] = useState<Array<Record<string, string>>>([])
  const [responses, setResponses] = useState<Record<string, string | string[] | boolean>>({})
  const [primary, setPrimary] = useState<number | null>(null)
  const [secondary, setSecondary] = useState<number[]>([])
  const [other, setOther] = useState('')
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!query.data) return
    setProfile(query.data.profile || {}); setCareer(query.data.career || [])
    setResponses(query.data.responses || {}); setPrimary(query.data.primary_field_id)
    setSecondary(query.data.secondary_fields.map((f) => f.id)); setOther(query.data.other_research || '')
    setConsent(Boolean(query.data.consent_at))
  }, [query.data])

  const save = useMutation({
    mutationFn: () => api<Application>(`/applications/${query.data!.id}`, { method: 'PUT', body: JSON.stringify({ profile, career, responses, primary_field_id: primary, secondary_field_ids: secondary, other_research: other, consent }) }),
    onSuccess: (data) => { client.setQueryData(['application', slug], { ...data, campaign: query.data?.campaign }); setMessage('Changes saved'); setTimeout(() => setMessage(''), 2000) },
  })
  if (query.isLoading) return <div className="app-loading">Preparing your application…</div>
  if (query.error) return <div className="container page"><div className="notice error"><strong>Unable to open this application</strong><p>{query.error.message}</p></div></div>
  if (!query.data?.campaign) return <div className="container page"><div className="notice error">Unable to open this application.</div></div>
  const application = query.data, campaign = application.campaign!
  const set = (key: string, value: string) => setProfile((current) => ({ ...current, [key]: value }))
  const upload = async (kind: ApplicantDocumentKind, file?: File) => {
    if (!file) return
    const form = new FormData(); form.append('kind', kind); form.append('file', file)
    await api(`/applications/${application.id}/documents`, { method: 'POST', body: form })
    await client.invalidateQueries({ queryKey: ['application', slug] }); setMessage(`${file.name} uploaded`)
  }
  const next = async () => { await save.mutateAsync(); setStep((value) => Math.min(value + 1, steps.length - 1)); window.scrollTo(0, 0) }
  const doc = (kind: ApplicantDocumentKind) => application.documents.find((item) => item.kind === kind)
  return <section className="application-shell"><aside className="application-aside"><div className="eyebrow">Your application</div><h1>{campaign.title}</h1><StatusPill status={application.status} /><ol>{steps.map((name, index) => <li key={name} className={step === index ? 'active' : index < step ? 'done' : ''}><button onClick={() => setStep(index)}><span>{index < step ? '✓' : index + 1}</span>{name}</button></li>)}</ol><div className="deadline-note"><small>Application deadline</small><strong>{new Date(campaign.application_deadline).toLocaleString()}</strong></div></aside><div className="application-content"><div className="mobile-progress">Step {step + 1} of {steps.length}</div>{message && <div className="save-indicator">✓ {message}</div>}
    {step === 0 && <FormSection title="Personal details" intro="Tell us how to identify and contact you. Your verified email is used for all application updates."><div className="form-grid two"><Field label="First name" required value={profile.first_name} onChange={(v) => set('first_name', v)} /><Field label="Last name" required value={profile.last_name} onChange={(v) => set('last_name', v)} /><Field label="Phone" value={profile.phone} onChange={(v) => set('phone', v)} /><Field label="Email" value={application.applicant.email} disabled onChange={() => undefined} /><label className="field span-2">Postal address<textarea value={profile.address || ''} onChange={(e) => set('address', e.target.value)} rows={3} /></label></div></FormSection>}
    {step === 1 && <FormSection title="Academic profile" intro="Add your current affiliation and academic background."><div className="form-grid two"><Field label="Present institution" required value={profile.present_institution} onChange={(v) => set('present_institution', v)} /><Field label="PhD institution" value={profile.phd_institution} onChange={(v) => set('phd_institution', v)} /><Field label="PhD year" type="number" value={profile.phd_year} onChange={(v) => set('phd_year', v)} /><Field label="INSPIRE profile" value={profile.inspire_profile} onChange={(v) => set('inspire_profile', v)} placeholder="inspirehep.net/authors/…" /></div><div className="section-divider"><h3>Career entries</h3><button className="text-button" onClick={() => setCareer((items) => [...items, { institution: '', role: '', start: '', end: '' }])}>+ Add entry</button></div>{career.map((item, index) => <div className="career-row" key={index}><input aria-label="Institution" placeholder="Institution" value={item.institution} onChange={(e) => setCareer((rows) => rows.map((row, i) => i === index ? { ...row, institution: e.target.value } : row))} /><input aria-label="Role or degree" placeholder="Role or degree" value={item.role} onChange={(e) => setCareer((rows) => rows.map((row, i) => i === index ? { ...row, role: e.target.value } : row))} /><button aria-label="Remove entry" onClick={() => setCareer((rows) => rows.filter((_, i) => i !== index))}>×</button></div>)}</FormSection>}
    {step === 2 && <FormSection title="Research and documents" intro="Select your principal area and upload the requested PDF documents."><label className="field">Primary research field <span>*</span><select required value={primary || ''} onChange={(e) => setPrimary(Number(e.target.value) || null)}><option value="">Choose a field…</option>{campaign.research_fields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select></label><fieldset className="checkbox-field"><legend>Secondary research interests</legend><div className="check-grid">{campaign.research_fields.filter((f) => f.id !== primary).map((field) => <label key={field.id}><input type="checkbox" checked={secondary.includes(field.id)} onChange={() => setSecondary((values) => values.includes(field.id) ? values.filter((id) => id !== field.id) : [...values, field.id])} />{field.name}</label>)}</div></fieldset><Field label="Other research area" value={other} onChange={setOther} placeholder="Optional" /><div className="upload-grid"><UploadCard title="Curriculum vitae" existing={doc(DocumentKind.cv)?.original_name} onFile={(file) => upload(DocumentKind.cv, file)} /><UploadCard title="Research statement" existing={doc(DocumentKind.researchStatement)?.original_name} onFile={(file) => upload(DocumentKind.researchStatement, file)} /></div></FormSection>}
    {step === 3 && <RefereeStep application={application} refresh={() => client.invalidateQueries({ queryKey: ['application', slug] })} />}
    {step === 4 && <FormSection title="Review and consent" intro="Check your progress. A complete application becomes ready for review after all required letters arrive."><div className="review-list"><ReviewRow label="Personal and academic details" done={Boolean(profile.first_name && profile.last_name && profile.present_institution)} /><ReviewRow label="Research field selected" done={Boolean(primary)} /><ReviewRow label="CV uploaded" done={Boolean(doc(DocumentKind.cv))} /><ReviewRow label="Research statement uploaded" done={Boolean(doc(DocumentKind.researchStatement))} /><ReviewRow label={`${campaign.required_referees} referees added`} done={application.referees.length >= campaign.required_referees} /><ReviewRow label="All reference letters received" done={application.referees.filter((r) => r.status === RefereeRequestStatus.submitted).length >= campaign.required_referees} /></div><label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to the processing of my personal data for this recruitment campaign according to the privacy policy. <strong>Required</strong></span></label></FormSection>}
    <div className="form-actions"><button className="button ghost" disabled={step === 0} onClick={() => setStep((v) => v - 1)}>Back</button><button className="button secondary" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save'}</button>{step < steps.length - 1 && <button className="button primary" onClick={next}>Save and continue →</button>}</div>{save.error && <div className="notice error">{save.error.message}</div>}</div></section>
}

function FormSection({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) { return <div className="form-section"><div className="form-heading"><div className="eyebrow">Application form</div><h2>{title}</h2><p>{intro}</p></div>{children}</div> }
function Field({ label, value = '', onChange, required, disabled, type = 'text', placeholder }: { label: string; value?: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean; type?: string; placeholder?: string }) { return <label className="field">{label} {required && <span>*</span>}<input type={type} required={required} disabled={disabled} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label> }
function UploadCard({ title, existing, onFile }: { title: string; existing?: string; onFile: (f?: File) => void }) { return <label className={`upload-card ${existing ? 'uploaded' : ''}`}><span className="upload-icon">{existing ? '✓' : '↑'}</span><strong>{title}</strong><small>{existing || 'PDF, maximum 10 MB'}</small><input type="file" accept="application/pdf,.pdf" onChange={(e) => onFile(e.target.files?.[0])} /></label> }
function ReviewRow({ label, done }: { label: string; done: boolean }) { return <div className={done ? 'review-done' : ''}><span>{done ? '✓' : '○'}</span>{label}<small>{done ? 'Complete' : 'Required'}</small></div> }

function RefereeStep({ application, refresh }: { application: Application; refresh: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const mutation = useMutation({ mutationFn: () => api(`/applications/${application.id}/referees`, { method: 'POST', body: JSON.stringify(form) }), onSuccess: () => { setForm({ first_name: '', last_name: '', email: '', phone: '' }); refresh() } })
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate() }
  return <FormSection title="References" intro={`Invite ${application.campaign?.required_referees} referees. Letters remain confidential; you will see only their status.`}><div className="referee-list">{application.referees.map((ref, i) => <div className="referee-row" key={ref.id}><span className="avatar">{ref.first_name[0]}{ref.last_name[0]}</span><div><strong>{ref.first_name} {ref.last_name}</strong><small>{ref.email}</small></div><StatusPill status={ref.status} /><span className="ref-number">{i + 1}</span></div>)}</div>{application.referees.length < (application.campaign?.required_referees || 3) && <form className="add-referee" onSubmit={submit}><h3>Add referee {application.referees.length + 1}</h3><div className="form-grid two"><Field label="First name" required value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} /><Field label="Last name" required value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} /><Field label="Email" required type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /><Field label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></div><button className="button secondary" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Add and send invitation'}</button>{mutation.error && <div className="notice error">{mutation.error.message}</div>}</form>}</FormSection>
}
