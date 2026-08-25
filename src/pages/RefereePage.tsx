import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { EmptyState, StatusPill } from '../components/Layout'

type Request = { id: number; campaign: string; applicant: string; status: string; submitted_at: string | null; letter_deadline: string }
export function RefereePage() {
  const client = useQueryClient()
  const query = useQuery<Request[]>({ queryKey: ['referee-requests'], queryFn: () => api('/referee/requests') })
  const upload = async (id: number, file?: File) => { if (!file) return; const form = new FormData(); form.append('file', file); await api(`/referee/requests/${id}/letter`, { method: 'POST', body: form }); client.invalidateQueries({ queryKey: ['referee-requests'] }) }
  return <section className="container page narrow"><div className="page-heading"><div><div className="eyebrow">Confidential references</div><h1>Reference letter requests</h1></div></div>{query.data?.length ? query.data.map((item) => <article className="panel reference-task" key={item.id}><div className="task-title"><div><small>Letter in support of</small><h2>{item.applicant}</h2><p>{item.campaign}</p></div><StatusPill status={item.status} /></div><div className="deadline-note inline"><small>Submit by</small><strong>{new Date(item.letter_deadline).toLocaleString()}</strong></div><p className="privacy-note">Your letter is confidential. The applicant can see that it was received but cannot view its contents.</p><label className="button primary file-button">{item.status === 'submitted' ? 'Replace letter' : 'Upload reference letter'}<input type="file" accept="application/pdf,.pdf" onChange={(e) => upload(item.id, e.target.files?.[0])} /></label></article>) : !query.isLoading && <EmptyState title="No reference requests">Requests sent to your verified email will appear here.</EmptyState>}</section>
}

