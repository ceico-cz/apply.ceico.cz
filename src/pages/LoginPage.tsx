import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, API_URL } from '../api'
import type { User } from '../types'
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

export function AuthConsumePage({ user }: { user?: User | null }) {
  const [params] = useSearchParams()
  const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get('token')
  const token = fragmentToken || params.get('token') || ''
  const form = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)
  const link = useQuery<{ email: string }>({
    queryKey: ['magic-link', token],
    queryFn: () => api(`/auth/link-info?token=${encodeURIComponent(token)}`),
    enabled: Boolean(token),
    retry: false,
  })
  const switchingIdentity = Boolean(user && link.data && user.email.toLowerCase() !== link.data.email.toLowerCase())

  useEffect(() => {
    if (link.data && !switchingIdentity && !submitted.current) {
      submitted.current = true
      form.current?.submit()
    }
  }, [link.data, switchingIdentity])

  const confirmationForm = <form ref={form} method="post" action={`${API_URL}/api/v1/auth/consume`}><input type="hidden" name="token" value={token} />{switchingIdentity && <button className="button primary full" type="submit">Continue as {link.data?.email}</button>}</form>
  if (!token || link.error) return <section className="auth-page"><div className="auth-card identity-card"><div className="eyebrow">Secure access</div><h1>Sign-in link unavailable</h1><div className="notice error"><strong>This link is invalid or expired.</strong><p>Request a new sign-in link to continue.</p></div><Link className="button primary full" to="/login">Return to sign in</Link></div></section>
  if (switchingIdentity) return <section className="auth-page"><div className="auth-card identity-card"><div className="eyebrow">Identity confirmation</div><h1>Switch signed-in identity?</h1><p>You are currently signed in as:</p><p className="identity-summary"><strong>{user?.email}</strong></p><p>This link belongs to <strong>{link.data?.email}</strong>. Continuing will replace the identity used by this browser.</p><div className="identity-actions">{confirmationForm}<Link className="button secondary full" to="/dashboard">Keep current identity</Link></div></div></section>
  return <section className="auth-page"><div className="auth-card identity-card"><div className="eyebrow">Secure access</div><h1>Completing sign-in…</h1><p>Verifying your single-use link and opening the requested page.</p>{confirmationForm}</div></section>
}
