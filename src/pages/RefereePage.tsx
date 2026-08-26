import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api, API_URL } from '../api'
import { EmptyState, StatusPill } from '../components/Layout'
import './RefereePage.css'

type Request = { id: number; campaign: string; applicant: string; status: string; submitted_at: string | null; letter_deadline: string; document: { id: number; original_name: string; size: number; created_at: string } | null }
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
export function RefereePage() {
  const { requestId } = useParams()
  const client = useQueryClient()
  const query = useQuery<Request[]>({ queryKey: ['referee-requests'], queryFn: () => api('/referee/requests') })
  const upload = async (id: number, file?: File) => { if (!file) return; const form = new FormData(); form.append('file', file); await api(`/referee/requests/${id}/letter`, { method: 'POST', body: form }); await client.invalidateQueries({ queryKey: ['referee-requests'] }) }
  const requests = requestId ? query.data?.filter((item) => item.id === Number(requestId)) : query.data
  return <section className="container page narrow"><div className="page-heading"><div><div className="eyebrow">Confidential references</div><h1>{requestId ? 'Reference letter request' : 'Reference letter requests'}</h1></div>{requestId && <Link className="button ghost" to="/referee">View all requests</Link>}</div>{requests?.length ? requests.map((item) => <article className="panel reference-task" key={item.id}><div className="task-title"><div><small>Letter in support of</small><h2>{item.applicant}</h2><p>{item.campaign}</p></div><StatusPill status={item.status} /></div><div className="deadline-note inline"><small>Submit by</small><strong>{new Date(item.letter_deadline).toLocaleString()}</strong></div><p className="privacy-note">Your letter is confidential. The applicant can see that it was received but cannot view its contents.</p>{item.document && <div className="uploaded-reference"><span aria-hidden="true">✓</span><div><small>Uploaded reference letter</small><a href={`${API_URL}/api/v1/referee/requests/${item.id}/letter`} target="_blank" rel="noreferrer">{item.document.original_name}</a><small>{fileSize(item.document.size)} · uploaded {new Date(item.document.created_at).toLocaleString()}</small></div></div>}<label className={`button ${item.document ? 'secondary' : 'primary'} file-button`}>{item.document ? 'Replace letter' : 'Upload reference letter'}<input type="file" accept="application/pdf,.pdf" onChange={(e) => upload(item.id, e.target.files?.[0])} /></label></article>) : !query.isLoading && <EmptyState title={requestId ? 'Reference request not found' : 'No reference requests'}>{requestId ? 'This request does not belong to your verified email address, or it is no longer available.' : 'Requests sent to your verified email will appear here.'}</EmptyState>}</section>
}
