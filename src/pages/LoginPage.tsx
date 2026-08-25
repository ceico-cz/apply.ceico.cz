import { FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'

export function LoginPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ message: string; development_url?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true)
    try { setResult(await api('/auth/request', { method: 'POST', body: JSON.stringify({ email, next_path: params.get('next') || '/dashboard' }) })) } finally { setBusy(false) }
  }
  return <section className="auth-page"><div className="auth-card"><div className="brand-mark large">C</div><div className="eyebrow">Secure access</div><h1>Sign in without a password</h1><p>Enter your email and we’ll send a single-use sign-in link.</p>{result ? <div className="notice success"><strong>Check your inbox</strong><p>{result.message}</p>{result.development_url && <a href={result.development_url}>Development sign-in link →</a>}</div> : <form onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@institution.edu" /></label><button className="button primary full" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button></form>}<small>Links expire after 20 minutes and can be used only once.</small></div></section>
}
