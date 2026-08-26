import { FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, API_URL } from '../api'
import './LoginPage.css'

export function LoginPage() {
  const [params] = useSearchParams()
  const providers = useQuery<{ pocket_id: { enabled: boolean; name: string } }>({ queryKey: ['auth-providers'], queryFn: () => api('/auth/providers') })
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ message: string; development_url?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true)
    try { setResult(await api('/auth/request', { method: 'POST', body: JSON.stringify({ email, next_path: params.get('next') || '/dashboard' }) })) } finally { setBusy(false) }
  }
  const nextPath = params.get('next') || '/dashboard'
  const pocketIdUrl = `${API_URL}/api/v1/auth/oidc/start?next_path=${encodeURIComponent(nextPath)}`
  return <section className="auth-page"><div className="auth-card"><img className="auth-logo" src="/brand/ceico-logo-color.svg" alt="CEICO" /><div className="eyebrow">Secure access</div><h1>Sign in</h1>{providers.data?.pocket_id.enabled && <><p>Use your Phoebe identity for immediate access.</p><a className="button pocket-id-button full" href={pocketIdUrl}><span className="pocket-id-mark" aria-hidden="true">P</span>Continue with Phoebe ID</a><div className="auth-divider"><span>or sign in without a password</span></div></>}<p>Enter your email and we’ll send a single-use sign-in link.</p>{result ? <div className="notice success"><strong>Check your inbox</strong><p>{result.message}</p>{result.development_url && <a href={result.development_url}>Development sign-in link →</a>}</div> : <form onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@institution.edu" /></label><button className="button primary full" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button></form>}<small>Email links expire after 20 minutes and can be used only once.</small></div></section>
}
