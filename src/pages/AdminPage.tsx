import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { User } from '../types'
import './AdminPage.css'

type AdminCampaign = {
  id: number
  title: string
  active: boolean
  owner: Pick<User, 'id' | 'email' | 'first_name' | 'last_name'>
}

const displayName = (user: Pick<User, 'email' | 'first_name' | 'last_name'>) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email

export function AdminPage() {
  const client = useQueryClient()
  const users = useQuery<User[]>({ queryKey: ['admin-users'], queryFn: () => api('/admin/users') })
  const campaigns = useQuery<AdminCampaign[]>({ queryKey: ['admin-campaigns'], queryFn: () => api('/admin/campaigns') })
  const [person, setPerson] = useState({ email: '', first_name: '', last_name: '' })
  const createPerson = useMutation({
    mutationFn: () => api<User>('/admin/users', { method: 'POST', body: JSON.stringify(person) }),
    onSuccess: () => { setPerson({ email: '', first_name: '', last_name: '' }); client.invalidateQueries({ queryKey: ['admin-users'] }) },
  })
  const updateRoles = async (user: User, changes: Partial<Pick<User, 'is_system_admin' | 'organizer_approved'>>) => {
    await api(`/admin/users/${user.id}/roles`, { method: 'PUT', body: JSON.stringify({ is_system_admin: user.is_system_admin, organizer_approved: user.organizer_approved, ...changes }) })
    await client.invalidateQueries({ queryKey: ['admin-users'] })
  }
  const updateOwner = async (campaignId: number, userId: number) => {
    await api(`/admin/campaigns/${campaignId}/owner`, { method: 'PUT', body: JSON.stringify({ user_id: userId }) })
    await Promise.all([client.invalidateQueries({ queryKey: ['admin-campaigns'] }), client.invalidateQueries({ queryKey: ['admin-users'] }), client.invalidateQueries({ queryKey: ['campaigns'] })])
  }
  const submit = (event: FormEvent) => { event.preventDefault(); createPerson.mutate() }
  return <section className="container page admin-page"><div className="page-heading"><div><div className="eyebrow">Portal administration</div><h1>People and roles</h1><p>Grant portal-wide privileges and choose the accountable owner of each recruitment campaign.</p></div></div><section className="panel admin-section"><div className="admin-section-heading"><div><h2>People</h2><p className="muted">Applicants, referees, and evaluators receive contextual access automatically. Only administrative roles are granted here.</p></div></div><form className="admin-person-form" onSubmit={submit}><input required type="email" aria-label="Email" placeholder="person@institution.org" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /><input aria-label="First name" placeholder="First name" value={person.first_name} onChange={(event) => setPerson({ ...person, first_name: event.target.value })} /><input aria-label="Last name" placeholder="Last name" value={person.last_name} onChange={(event) => setPerson({ ...person, last_name: event.target.value })} /><button className="button secondary" disabled={createPerson.isPending}>{createPerson.isPending ? 'Adding…' : 'Add person'}</button></form>{createPerson.error && <div className="notice error">{createPerson.error.message}</div>}<div className="role-table"><div className="role-row role-header"><span>Person</span><span>Organizer</span><span>Portal admin</span></div>{users.data?.map((user) => <div className="role-row" key={user.id}><span><strong>{displayName(user)}</strong><small>{user.email}</small></span><label><input type="checkbox" checked={user.organizer_approved} disabled={user.is_system_admin} onChange={(event) => updateRoles(user, { organizer_approved: event.target.checked })} /> Organizer</label><label><input type="checkbox" checked={user.is_system_admin} onChange={(event) => updateRoles(user, { is_system_admin: event.target.checked })} /> Portal admin</label></div>)}</div></section><section className="panel admin-section"><div className="admin-section-heading"><div><h2>Campaign owners</h2><p className="muted">An owner has full management responsibility for one campaign. Assigning ownership also grants organizer access.</p></div></div><div className="owner-list">{campaigns.data?.map((campaign) => <div className="owner-row" key={campaign.id}><div><strong>{campaign.title}</strong><small>{campaign.active ? 'Active campaign' : 'Inactive campaign'}</small></div><label>Owner<select value={campaign.owner.id} onChange={(event) => updateOwner(campaign.id, Number(event.target.value))}>{users.data?.map((user) => <option key={user.id} value={user.id}>{displayName(user)} — {user.email}</option>)}</select></label></div>)}</div></section></section>
}
