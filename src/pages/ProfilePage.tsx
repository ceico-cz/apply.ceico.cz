import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { User } from '../types'
import './ProfilePage.css'

export function ProfilePage({ user }: { user: User }) {
  const client = useQueryClient()
  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const mutation = useMutation({
    mutationFn: () => api<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    }),
    onSuccess: (updated) => client.setQueryData(['me'], updated),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }
  return <section className="container narrow page profile-page"><div className="page-heading"><div><div className="eyebrow">Account</div><h1>My profile</h1><p>Update the name shown to campaign colleagues.</p></div></div><section className="panel profile-card"><p className="profile-email">Signed in as <strong>{user.email}</strong></p><form onSubmit={submit}><div className="form-grid two"><label className="field">First name<input required maxLength={120} value={firstName} onChange={(event) => { setFirstName(event.target.value); mutation.reset() }} /></label><label className="field">Last name<input required maxLength={120} value={lastName} onChange={(event) => { setLastName(event.target.value); mutation.reset() }} /></label></div>{mutation.error && <div className="notice error">{mutation.error.message}</div>}{mutation.isSuccess && <div className="notice success">Profile saved.</div>}<div className="profile-actions"><button className="button primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save profile'}</button></div></form></section></section>
}
